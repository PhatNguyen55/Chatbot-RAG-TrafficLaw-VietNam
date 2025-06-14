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
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_google_genai import ChatGoogleGenerativeAI

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
from transformers import AutoTokenizer, AutoModel

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
    top_n_vector: int = 10
    top_n_keyword: int = 10
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
RAG_PROMPT_TEMPLATE = """
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
        self.qa_chain = None
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

            # 2. Tải models AI - THEO CÁCH MỚI
            embedding_model_name = 'bkai-foundation-models/vietnamese-bi-encoder'
            print(f"Loading new embedding model: {embedding_model_name}")
            print("   - Loading with SentenceTransformer directly...")
            embedding_model = SentenceTransformer(embedding_model_name, device=device)

            # # 2a. Tải Tokenizer "chậm" một cách tường minh
            # print("   - Loading tokenizer with use_fast=False...")
            # tokenizer = AutoTokenizer.from_pretrained(
            #     embedding_model_name, 
            #     use_fast=False  # <<< ĐÂY LÀ CHÌA KHÓA GIẢI QUYẾT VẤN ĐỀ
            # )

            # # 2b. Tải Model thuần (AutoModel)
            # print("   - Loading model weights...")
            # model = AutoModel.from_pretrained(
            #     embedding_model_name,
            #     trust_remote_code=True # Cần thiết cho các model BGE
            # )

            # # 2c. Kết hợp chúng lại thành một đối tượng SentenceTransformer
            # print("   - Creating SentenceTransformer object...")
            # embedding_model = SentenceTransformer(
            #     modules=[
            #         model,
            #         # Có thể thêm các lớp pooling ở đây nếu cần, nhưng thường thì model đã có sẵn
            #     ],
            #     device=device
            # )
            # # Gán tokenizer đã tải vào model
            # embedding_model.tokenizer = tokenizer
            
            self.reranker = CrossEncoder('AITeamVN/Vietnamese_Reranker', device=device, max_length=512)
            
            # 3. Khởi tạo LLM
            self.llm = ChatGoogleGenerativeAI(
                model="models/gemini-1.5-flash-latest",
                temperature=0.1,
                convert_system_message_to_human=True,
                google_api_key=settings.GOOGLE_API_KEY
            )

            
            # 4. Tải dữ liệu đã xử lý
            with open(settings.ALL_CHUNKS_PATH, "rb") as f:
                all_chunks = pickle.load(f)

            # 5. Xây dựng các index
            # ChromaDB (Vector Index)
            # Chúng ta sẽ tạo mới ChromaDB trong bộ nhớ mỗi khi server khởi động
            # Điều này nhanh hơn là load từ đĩa và đảm bảo dữ liệu luôn mới nhất
            langchain_embedding = SentenceTransformerEmbeddings(embedding_model)
            self.vector_store = Chroma.from_documents(
                documents=all_chunks,
                embedding=langchain_embedding
            )
            
            # BM25 (Keyword Index)
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
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=hybrid_retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": RAG_PROMPT}
            )
            
            self.is_ready = True
            print("✅ RAG Service is fully loaded and ready.")
        except Exception as e:
            print(f"❌ Failed to load RAG Service: {e}")
            self.is_ready = False

    def ask(self, question: str) -> Dict[str, Any]:
        """
        Hàm để xử lý một câu hỏi từ người dùng.
        """
        if not self.is_ready or not self.qa_chain:
            return {
                "answer": "Xin lỗi, hệ thống đang gặp sự cố và chưa sẵn sàng. Vui lòng thử lại sau.",
                "sources": []
            }
        
        try:
            result = self.qa_chain.invoke({"query": question})
            sources = [doc.metadata for doc in result.get("source_documents", [])]
            
            return {
                "answer": result["result"],
                "sources": sources
            }
        except Exception as e:
            print(f"Error during QA chain invocation: {e}")
            return {
                "answer": "Đã có lỗi xảy ra trong quá trình xử lý câu hỏi của bạn.",
                "sources": []
            }

# Tạo một instance duy nhất (singleton) để import và sử dụng trong toàn bộ ứng dụng
rag_service = RAGService()