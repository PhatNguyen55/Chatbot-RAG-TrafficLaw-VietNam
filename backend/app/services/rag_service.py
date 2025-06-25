import os
import pickle
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
    top_n_vector: int = 5
    top_n_keyword: int = 5
    top_k_final: int = 4

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        
        # 1. Vector Search
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

# Prompt Template được thiết kế kỹ lưỡng
CONDENSE_QUESTION_PROMPT_TEMPLATE = """Dựa vào đoạn hội thoại dưới đây và một câu hỏi tiếp theo, hãy diễn giải câu hỏi tiếp theo thành một câu hỏi độc lập, đầy đủ bằng tiếng Việt.

Lịch sử trò chuyện:
{chat_history}

Câu hỏi tiếp theo: {question}
Câu hỏi độc lập:"""

CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(CONDENSE_QUESTION_PROMPT_TEMPLATE)
                                                        
RAG_PROMPT_TEMPLATE = """
Bạn tên là LawBot
Bạn là một Trợ lý AI chuyên gia về Luật Giao thông Đường bộ Việt Nam.
Nhiệm vụ của bạn là cung cấp câu trả lời chính xác, rõ ràng và hữu ích cho người dùng dựa **DUY NHẤT** vào các trích đoạn văn bản luật trong phần "NGỮ CẢNH" dưới đây.

**QUY TẮC BẮT BUỘC:**
1.  **CHỈ DÙNG NGỮ CẢNH:** Câu trả lời phải hoàn toàn dựa trên thông tin có trong "NGỮ CẢNH". Không được suy diễn hay dùng kiến thức bên ngoài.
2.  **TRÍCH DẪN NGUỒN:** Sau mỗi luận điểm, hãy trích dẫn nguồn bằng cách sử dụng thông tin metadata của văn bản. Ví dụ: "(theo Điều X, Nghị định Y)".
3.  **KHÔNG CÓ THÔNG TIN:** Nếu "NGỮ CẢNH" không chứa thông tin để trả lời câu hỏi, hãy trả lời một cách lịch sự: "Tôi không tìm thấy thông tin cụ thể về vấn đề này trong các tài liệu được cung cấp. Bạn vui lòng làm rõ câu hỏi hoặc tham khảo các văn bản pháp lý chính thức."
4.  **VĂN PHONG:** Sử dụng tiếng Việt, văn phong chuyên nghiệp, trang trọng nhưng dễ hiểu.

---
**NGỮ CẢNH (Trích đoạn từ văn bản luật):**
{context}
---

**CÂU HỎI CỦA NGƯỜI DÙNG:**
{question}

**CÂU TRẢ LỜI CỦA BẠN (dựa vào NGỮ CẢNH, có trích dẫn nguồn):**
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

            # 7. Tạo QA chain cuối cùng
            # self.qa_chain = RetrievalQA.from_chain_type(
            #     llm=self.llm,
            #     chain_type="stuff",
            #     retriever=hybrid_retriever,
            #     return_source_documents=True,
            #     chain_type_kwargs={"prompt": RAG_PROMPT}
            # )
            
            # 7. Thiết lập Bộ nhớ (Memory)
            # ConversationBufferMemory sẽ lưu trữ lịch sử chat trong RAM.
            # return_messages=True để nó trả về dưới dạng list các đối tượng Message.
            print("   - Setting up conversation memory...")
            self.memory = ConversationBufferMemory(
                memory_key='chat_history',
                return_messages=True,
                output_key='answer' # Chỉ định key cho câu trả lời của AI
            )

            # 8. Tạo ConversationalRetrievalChain
            # Đây là chain có khả năng "nhớ"
            print("   - Creating ConversationalRetrievalChain...")
            self.conversation_chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=hybrid_retriever, # Dùng retriever lai ghép của chúng ta
                memory=self.memory,
                return_source_documents=True, # Vẫn trả về source
                # <<< CUNG CẤP PROMPT ĐỂ TẠO CÂU HỎI ĐỘC LẬP >>>
                condense_question_prompt=CONDENSE_QUESTION_PROMPT,
                
                # <<< CUNG CẤP PROMPT ĐỂ TẠO CÂU TRẢ LỜI CUỐI CÙNG >>>
                combine_docs_chain_kwargs={"prompt": RAG_PROMPT} 
            )
            
            self.is_ready = True
            print("✅ RAG Service is fully loaded and ready.")
        except Exception as e:
            print(f"❌ Failed to load RAG Service: {e}")
            self.is_ready = False

    # --- SỬA LẠI HOÀN TOÀN HÀM ASK ---
    def ask(self, question: str, chat_history: list = []) -> Dict[str, Any]:
        """
        Hàm xử lý một câu hỏi, có nhận vào lịch sử chat và xử lý các loại câu hỏi khác nhau.
        """
        if not self.is_ready:
            return {
                "answer": "Xin lỗi, hệ thống đang khởi động và chưa sẵn sàng. Vui lòng thử lại sau giây lát.",
                "sources": []
            }
        
        try:
            # --- BỘ LỌC CÂU HỎI META ---
            meta_questions = ["bạn là ai", "bạn tên gì", "tôi vừa hỏi gì", "câu trước tôi hỏi"]
            is_meta_question = any(q in question.lower() for q in meta_questions)
            
            if is_meta_question:
                print("INFO: Detected a meta-conversation question.")
                if not chat_history:
                    # Nếu chưa có lịch sử, trả lời câu hỏi giới thiệu
                    return {
                        "answer": "Tôi là LawBot, một trợ lý AI chuyên về Luật Giao thông đường bộ Việt Nam. Tôi có thể giúp gì cho bạn?", 
                        "sources": []
                    }
                
                # Nếu có lịch sử, đưa cả lịch sử và câu hỏi cho LLM để tóm tắt
                conversation_context = "\n".join([f"Người dùng: {h.content}" if hasattr(h, 'content') else f"AI: {h.content}" for h in chat_history])
                prompt = f"Dựa vào lịch sử hội thoại ngắn gọn sau, hãy trả lời câu hỏi của người dùng một cách tự nhiên. Lịch sử chỉ dùng để tham khảo ngữ cảnh, không cần nhắc lại nó. \n\nLịch sử:\n{conversation_context}\n\nCâu hỏi của người dùng: {question}\n\nCâu trả lời của bạn:"
                
                # Sử dụng llm trực tiếp thay vì conversation_chain
                if not self.llm:
                     return {"answer": "Lỗi: LLM chưa được khởi tạo.", "sources": []}
                
                response = self.llm.invoke(prompt)
                return {"answer": response.content, "sources": []}

            # --- NẾU KHÔNG PHẢI CÂU HỎI META, CHẠY RAG CHAIN ---
            print("INFO: Executing ConversationalRetrievalChain...")
            if not self.conversation_chain:
                return {"answer": "Lỗi: Conversation chain chưa được khởi tạo.", "sources": []}

            result = self.conversation_chain.invoke({
                "question": question,
                "chat_history": chat_history 
            })
            
            answer = result.get("answer", "Không tìm thấy câu trả lời trong tài liệu.")
            sources = [doc.metadata for doc in result.get("source_documents", [])]
            
            return { "answer": answer, "sources": sources }
        except Exception as e:
            print(f"Error during conversation chain invocation: {e}")
            return {
                "answer": "Đã có lỗi xảy ra trong quá trình xử lý câu hỏi của bạn.",
                "sources": []
            }

# Tạo một instance duy nhất (singleton) để import và sử dụng trong toàn bộ ứng dụng
rag_service = RAGService()