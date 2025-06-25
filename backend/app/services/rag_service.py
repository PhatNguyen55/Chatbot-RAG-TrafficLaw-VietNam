import os
import pickle
import re
import numpy as np
import torch
# import sentencepiece
# import google.generativeai as genai
from typing import List, Dict, Any

from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
# from transformers import AutoTokenizer, AutoModel

from app.core.config import settings

# --- CÁC CLASS VÀ BIẾN TOÀN CỤC (đã được kiểm chứng từ Colab) ---

class SentenceTransformerEmbeddings(Embeddings):
    """Wrapper cho SentenceTransformer để tương thích với LangChain."""
    def __init__(self, model):
        super().__init__()
        self.model = model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Không hiển thị progress bar khi chạy trên server
        return self.model.encode(texts, convert_to_tensor=False, show_progress_bar=False).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self.model.encode([text], convert_to_tensor=False)[0].tolist()
    

class HybridRerankingRetriever(BaseRetriever):
    """Retriever lai ghép, kết hợp vector và keyword, sau đó re-rank."""
    vector_store: Chroma
    bm25_searcher: BM25Okapi
    all_docs: List[Document]
    reranker: CrossEncoder
    top_n_vector: int = 7
    top_n_keyword: int = 7
    top_k_final: int = 5

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun, where_filter: Dict[str, Any] = None
    ) -> List[Document]:
        
        # 1. Vector Search với bộ lọc metadata (nếu có)
        print(f"DEBUG: Performing vector search with filter: {where_filter}")
        if where_filter:
            vector_docs = self.vector_store.similarity_search(query, k=self.top_n_vector, filter=where_filter)
        else:
            vector_docs = self.vector_store.similarity_search(query, k=self.top_n_vector)
        
        # 2. Keyword Search (BM25)
        tokenized_query = query.split(" ")
        bm25_scores = self.bm25_searcher.get_scores(tokenized_query)
        # Lấy các index có score > 0 để tránh kết quả không liên quan
        top_n_indices = np.argsort(bm25_scores)[::-1][:self.top_n_keyword]
        bm25_docs = [self.all_docs[i] for i in top_n_indices if bm25_scores[i] > 0]
        
        # 3. Kết hợp và loại bỏ trùng lặp
        combined_docs_dict = {doc.page_content: doc for doc in vector_docs}
        for doc in bm25_docs:
            if doc.page_content not in combined_docs_dict:
                combined_docs_dict[doc.page_content] = doc
        
        combined_docs = list(combined_docs_dict.values())

        if not combined_docs:
            return []
        
        # 4. Re-ranking
        sentence_pairs = [[query, doc.page_content] for doc in combined_docs]
        scores = self.reranker.predict(sentence_pairs, show_progress_bar=False)
        
        scored_docs = sorted(zip(scores, combined_docs), key=lambda x: x[0], reverse=True)
        
        reranked_docs = [doc for score, doc in scored_docs][:self.top_k_final]
        
        return reranked_docs

QUERY_EXPANSION_MAP = {
    "vượt đèn đỏ": "không chấp hành hiệu lệnh của đèn tín hiệu giao thông",
    "vượt đèn vàng": "không chấp hành hiệu lệnh đèn tín hiệu",
    "không đội mũ bảo hiểm": "không đội mũ bảo hiểm hoặc đội mũ không cài quai đúng quy cách",
    "say xỉn": "có nồng độ cồn trong máu hoặc hơi thở",
    "uống rượu bia lái xe": "điều khiển phương tiện có nồng độ cồn",
    "đi sai làn": "đi không đúng làn đường hoặc phần đường quy định",
    "lái xe quá tốc độ": "điều khiển xe chạy quá tốc độ cho phép",
    "bị phạt nguội": "xử phạt qua hệ thống giám sát tự động",
    "không bằng lái": "không có giấy phép lái xe",
    "không có bằng lái": "không có giấy phép lái xe",
}

def expand_query(query: str) -> str:
    """Mở rộng câu hỏi bằng cách thay thế thuật ngữ phổ thông bằng thuật ngữ pháp lý."""
    # Dùng lower() để bắt được nhiều trường hợp hơn
    lower_query = query.lower()
    for key, legal_term in QUERY_EXPANSION_MAP.items():
        if key in lower_query:
            # Trả về cả hai để tăng khả năng tìm kiếm
            return f"{query} ({legal_term})" 
    return query
    
def extract_query_details(query: str) -> dict:
        """Dùng regex để tìm kiếm số hiệu văn bản và số điều trong câu hỏi."""
        details = {}
        # Ví dụ: "nghị định 100", "luật 35/2024", "thông tư 79"
        doc_match = re.search(r'(luật|nghị định|thông tư)\s*(\d+/?\d*)', query, re.IGNORECASE)
        if doc_match:
            doc_type = doc_match.group(1).lower()
            doc_num = doc_match.group(2)
            if "luật" in doc_type:
                details['document_type'] = "Luật"
            elif "nghị định" in doc_type:
                details['document_type'] = "Nghị định"
            elif "thông tư" in doc_type:
                details['document_type'] = "Thông tư"
            # Tìm kiếm một phần của document_number
            details['document_number_partial'] = doc_num

        # Ví dụ: "điều 9", "theo điều 15"
        article_match = re.search(r'điều\s+(\d+)', query, re.IGNORECASE)
        if article_match:
            details['article_number'] = article_match.group(1)
            
        return details
    
# Prompt Template được thiết kế kỹ lưỡng
CONDENSE_QUESTION_PROMPT_TEMPLATE = """Dựa vào đoạn hội thoại dưới đây và một câu hỏi tiếp theo, hãy diễn giải câu hỏi tiếp theo thành một câu hỏi độc lập, đầy đủ bằng tiếng Việt.

Lịch sử trò chuyện:
{chat_history}

Câu hỏi tiếp theo: {question}
Câu hỏi độc lập:"""

CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(CONDENSE_QUESTION_PROMPT_TEMPLATE)

RAG_PROMPT_TEMPLATE = """Bạn là LawBot, một chuyên gia AI về Luật Giao thông Đường bộ Việt Nam. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng một cách chính xác, có căn cứ pháp lý rõ ràng, chỉ dựa vào NGỮ CẢNH được cung cấp.

---
🎯 **MỤC TIÊU CÂU TRẢ LỜI:**
- Trình bày rõ ràng, đúng luật, có cấu trúc.
- Ngắn gọn, dễ hiểu, phù hợp với người dân phổ thông.
- Có trích dẫn điều luật cụ thể từ metadata có trong NGỮ CẢNH.

---
🧠 **QUY TRÌNH SUY LUẬN:**
1.  **Phân tích câu hỏi**: Hiểu đúng yêu cầu của người dùng.
2.  **Tìm kiếm trong NGỮ CẢNH**: Tìm tất cả thông tin liên quan đến hành vi vi phạm, mức phạt, các tình huống khác nhau (ví dụ: cho ô tô, cho xe máy, gây tai nạn).
3.  **Cấu trúc hóa câu trả lời**: Nếu tìm được đủ thông tin, trình bày theo cấu trúc sau:
    - Bắt đầu bằng một câu tóm tắt chung.
    - Dùng gạch đầu dòng hoặc tiêu đề cho từng loại phương tiện (`#### 🚗 Với xe ô tô:`).
    - Với mỗi phương tiện, ghi rõ: Mức phạt, hình phạt bổ sung.
    - **BẮT BUỘC** trích dẫn nguồn cho mỗi thông tin bằng cách sử dụng thông tin có sẵn trong NGỮ CẢNH. Ví dụ: `(theo Điều 7 của Nghị định 168/2024/NĐ-CP)`.
4.  **Nếu không đủ thông tin**: Trả lời lịch sự: "Dựa trên các tài liệu được cung cấp, tôi không tìm thấy thông tin cụ thể về [chủ đề]."
5.  **Tuyệt đối KHÔNG bịa đặt**.

---
**NGỮ CẢNH:**
{context}
---
**CÂU HỎI:** {question}
---
**CÂU TRẢ LỜI (tuân thủ toàn bộ hướng dẫn trên):**
"""
RAG_PROMPT = PromptTemplate(template=RAG_PROMPT_TEMPLATE, input_variables=["context", "question"])


# --- CLASS RAG SERVICE CHÍNH ---

class RAGService:
    def __init__(self):
        # self.qa_chain = None
        self.conversation_chain = None
        self.is_ready = False
        print("Initializing RAG Service...")

    def load(self):
        """
        Hàm cốt lõi: Tải tất cả model, index và xây dựng QA chain.
        Hàm này được gọi một lần khi server khởi động.
        """
        try:
            # 1. Kiểm tra xem dữ liệu đã được xử lý chưa
            if not os.path.exists(settings.ALL_CHUNKS_PATH):
                raise FileNotFoundError(f"File dữ liệu '{settings.ALL_CHUNKS_PATH}' không tồn tại. "
                                        "Vui lòng chạy 'python -m app.services.data_loader' trước.")

            print("Loading RAG components...")
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"Sử dụng thiết bị: {device}")

             # 2. Tải model EMBEDDING từ thư mục local
            embedding_model_folder = "bkai-foundation-models_vietnamese-bi-encoder"
            embedding_model_path = os.path.join(settings.MODELS_DIRECTORY, embedding_model_folder)
            
            if not os.path.exists(embedding_model_path):
                raise FileNotFoundError(f"Thư mục model embedding không tồn tại: {embedding_model_path}")
            
            print(f"Loading embedding model from: {embedding_model_path}")
            embedding_model = SentenceTransformer(embedding_model_path, device=device)

            # 3. Tải model RERANKER từ thư mục local
            reranker_model_folder = "AITeamVN_Vietnamese_Reranker"
            reranker_model_path = os.path.join(settings.MODELS_DIRECTORY, reranker_model_folder)

            if not os.path.exists(reranker_model_path):
                raise FileNotFoundError(f"Thư mục model reranker không tồn tại: {reranker_model_path}")

            print(f"Loading reranker model from: {reranker_model_path}")
            self.reranker = CrossEncoder(reranker_model_path, device=device, max_length=512)
            
            # 3. Khởi tạo LLM
            self.llm = ChatGoogleGenerativeAI(
                model="models/gemini-1.5-flash-latest",
                temperature=0.1,
                convert_system_message_to_human=True,
                google_api_key=settings.GOOGLE_API_KEY
            )

            
             # 4. Tải dữ liệu chunks (chỉ cần cho BM25)
            with open(settings.ALL_CHUNKS_PATH, "rb") as f:
                all_chunks = pickle.load(f)

            # 5. Xây dựng các index
            
            # 5a. Tải ChromaDB từ đĩa
            print(f"Loading Vector Store from disk: {settings.VECTOR_STORE_DIRECTORY}")
            langchain_embedding = SentenceTransformerEmbeddings(embedding_model) # Vẫn cần hàm embedding để load
            
            # Thay vì Chroma.from_documents, chúng ta khởi tạo Chroma và trỏ đến thư mục đã lưu
            self.vector_store = Chroma(
                persist_directory=settings.VECTOR_STORE_DIRECTORY,
                embedding_function=langchain_embedding
            )
            print(f"✅ Vector Store loaded successfully with {self.vector_store._collection.count()} documents.")

            # 5b. Tạo BM25 Index (vẫn tạo trong RAM khi khởi động)
            print("Creating BM25 Index in memory...")
            corpus = [chunk.page_content for chunk in all_chunks]
            tokenized_corpus = [doc.split(" ") for doc in corpus]
            bm25_index = BM25Okapi(tokenized_corpus)
            
            # 6. Tạo retriever lai ghép
            hybrid_retriever = HybridRerankingRetriever(
                vector_store=self.vector_store,
                bm25_searcher=bm25_index,
                all_docs=all_chunks,
                reranker=self.reranker
            )

             # Chain này sẽ là "bộ não" chính, nhưng chúng ta sẽ không dùng nó trực tiếp
            # mà sẽ dùng các thành phần của nó.
            memory = ConversationBufferMemory(
                memory_key='chat_history', return_messages=True, output_key='answer'
            )
            self.conversation_chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=hybrid_retriever,
                memory=memory,
                return_source_documents=True,
                condense_question_prompt=CONDENSE_QUESTION_PROMPT,
                combine_docs_chain_kwargs={"prompt": RAG_PROMPT}
            )
            
            self.is_ready = True
            print("✅ RAG Service is fully loaded and ready.")
        except Exception as e:
            print(f"❌ Failed to load RAG Service: {e}")
            self.is_ready = False

    def ask(self, question: str, chat_history: list = []) -> Dict[str, Any]:
        """
        Hàm xử lý câu hỏi, sử dụng trực tiếp ConversationalRetrievalChain.
        """
        if not self.is_ready or not self.conversation_chain:
            return {"answer": "Hệ thống chưa sẵn sàng...", "sources": []}
        
        try:
            # Logic xử lý meta-question vẫn hữu ích
            meta_questions = ["bạn là ai", "bạn tên gì"]
            if any(q in question.lower() for q in meta_questions):
                return {"answer": "Tôi là LawBot, một trợ lý AI chuyên về Luật Giao thông...", "sources": []}

            # --- BƯỚC 2: Mở rộng câu hỏi của người dùng ---
            expanded_question = expand_query(question)
            print(f"INFO: Expanded Query: '{expanded_question}'")
            
            # --- BƯỚC 3: Tái cấu trúc câu hỏi dựa trên lịch sử ---
            # Chúng ta sẽ gọi riêng phần "tạo câu hỏi" của chain
            _inputs = {"question": expanded_question, "chat_history": chat_history}
            result_from_generator = self.conversation_chain.question_generator.invoke(_inputs)
            # Lấy giá trị từ key 'text' thay vì gán cả dictionary
            standalone_question = result_from_generator.get('text', expanded_question) 
            
            print(f"INFO: Standalone question: '{standalone_question}'")
            # --- BƯỚC 4: Trích xuất metadata và Lọc ---
            query_details = extract_query_details(standalone_question)
            where_filter = {}
            if query_details.get('document_number_partial'):
                where_filter['document_number'] = {"$contains": query_details['document_number_partial']}
            if query_details.get('article_number'):
                where_filter['article_number'] = query_details['article_number']
            
            final_filter = where_filter if where_filter else None
            
            # Gọi retriever với câu hỏi độc lập và bộ lọc
            retriever = self.conversation_chain.retriever
            docs = retriever.invoke(standalone_question, config={"configurable": {"where_filter": final_filter}})

            # --- BƯỚC 5: Gọi chain sinh câu trả lời ---
            # Chúng ta gọi riêng phần "kết hợp tài liệu" của chain
            new_inputs = {"question": standalone_question, "input_documents": docs}
            answer = self.conversation_chain.combine_docs_chain.invoke(new_inputs)
            
            sources = [doc.metadata for doc in answer.get("input_documents", [])]

            return {"answer": answer.get("output_text"), "sources": sources}

        except Exception as e:
            print(f"ERROR in ask function: {e}")
            import traceback
            traceback.print_exc()
            return {"answer": "Đã có lỗi nghiêm trọng xảy ra...", "sources": []}

# Tạo một instance duy nhất (singleton) để import và sử dụng trong toàn bộ ứng dụng
rag_service = RAGService()