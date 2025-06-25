import os
import re
import shutil
from app.services.rag_service import SentenceTransformerEmbeddings
import fitz  # PyMuPDF
import pickle
import json
from pathlib import Path
from typing import List, Dict, Any

from langchain.schema import Document
from sentence_transformers import SentenceTransformer
from langchain_chroma import Chroma

# --- CÁC HÀM TIỆN ÍCH CHO VIỆC XỬ LÝ VĂN BẢN ---

def join_broken_lines(text: str) -> str:
    """Nối các dòng bị ngắt giữa chừng."""
    lines = text.split('\n')
    result_lines = []
    i = 0
    while i < len(lines):
        current_line = lines[i].strip()
        if i + 1 < len(lines):
            next_line = lines[i+1].strip()
            if current_line and next_line and not current_line.endswith(('.', ':', ';', ')')) and next_line[0].islower():
                result_lines.append(current_line + " " + next_line)
                i += 2
                continue
        result_lines.append(current_line)
        i += 1
    return "\n".join(result_lines)

def extract_and_clean_text(pdf_path: str) -> str:
    """Trích xuất và làm sạch văn bản từ một file PDF."""
    full_text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                page_text = page.get_text("text")
                page_text = re.sub(r"^\s*\d+\s*$", "", page_text, flags=re.MULTILINE)
                page_text = re.sub(r"^(CÔNG BÁO|DỰ THẢO|Luật số).*?\n", "", page_text, flags=re.IGNORECASE | re.MULTILINE)
                page_text = re.sub(r"Ký bởi:.*?\+07:00", "", page_text, flags=re.DOTALL | re.IGNORECASE)
                page_text = re.sub(r'Nơi nhận:.*?$(.*?\n)*?(TM\. CHÍNH PHỦ|KT\. THỦ TƯỚNG).*?$', '', page_text, flags=re.DOTALL | re.MULTILINE)
                page_text = re.sub(r'Người ký:.*?(\n|$)', '', page_text, flags=re.DOTALL)
                full_text += page_text + "\n"
    except Exception as e:
        print(f"❌ Lỗi khi xử lý PDF '{os.path.basename(pdf_path)}': {e}")
        return ""

    full_text = join_broken_lines(full_text)
    full_text = re.sub(r'[ \t]{2,}', ' ', full_text)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text).strip()
    return full_text

def extract_document_details(filename: str) -> Dict[str, Any]:
    """Trích xuất loại văn bản, số hiệu và ngày ban hành từ tên file để làm metadata."""
    details = {"document_type": "Văn bản khác", "document_number": "Không xác định", "document_date": "Không xác định"}
    filename_lower = filename.lower()
    
    luat_match = re.search(r'luat-(\d+)-(\d{4})-qh\d+', filename_lower)
    if luat_match:
        details["document_type"] = "Luật"
        details["document_number"] = f"{luat_match.group(1)}/{luat_match.group(2)}/QH15"
        details["document_date"] = f"{luat_match.group(2)}"
        return details
    
    nghi_dinh_match = re.search(r'nghi-dinh-(\d+)_(\d{4})_nd-cp', filename_lower)
    if nghi_dinh_match:
        details["document_type"] = "Nghị định"
        details["document_number"] = f"{nghi_dinh_match.group(1)}/{nghi_dinh_match.group(2)}/NĐ-CP"
        details["document_date"] = f"{nghi_dinh_match.group(2)}"
        return details
    
    thong_tu_match = re.search(r'thong-tu-(\d+)-(\d{4})-tt-bca', filename_lower)
    if thong_tu_match:
        details["document_type"] = "Thông tư"
        details["document_number"] = f"{thong_tu_match.group(1)}/{thong_tu_match.group(2)}/TT-BCA"
        details["document_date"] = f"{thong_tu_match.group(2)}"
        return details
    
    return details

def split_law_document_semantically(cleaned_full_text: str, source_filename: str) -> List[Document]:
    """Chia văn bản pháp quy theo cấu trúc ngữ nghĩa (Chương -> Mục -> Điều) và gán metadata chi tiết."""
    if not cleaned_full_text:
        return []

    doc_details = extract_document_details(source_filename)
    
    documents = []
    current_chuong = "Không xác định"
    current_muc = None

    articles = re.split(r'(?=\nChương\s+[IVXLCDM\d]+\.?[ \t]*\n|\nMục\s+\d+\.?[ \t]*\n|\nĐiều\s+\d+\.?:?[ \t]*)', cleaned_full_text)
    articles = [article.strip() for article in articles if article.strip()]

    for article_text in articles:
        chuong_match = re.match(r'Chương\s+([IVXLCDM\d]+)\.?\s*(.*?)\n', article_text, re.IGNORECASE)
        muc_match = re.match(r'Mục\s+(\d+)\.?\s*(.*?)\n', article_text, re.IGNORECASE)
        dieu_match = re.match(r'Điều\s+(\d+)\.?:?\s*(.*)', article_text, re.IGNORECASE)

        if chuong_match:
            chuong_so = chuong_match.group(1)
            chuong_ten = chuong_match.group(2).strip()
            current_chuong = f"Chương {chuong_so} - {chuong_ten}"
            current_muc = None
            continue
        
        if muc_match:
            muc_so = muc_match.group(1)
            muc_ten = muc_match.group(2).strip()
            current_muc = f"Mục {muc_so} - {muc_ten}"
            continue
            
        if dieu_match:
            dieu_so = dieu_match.group(1)
            dieu_ten = dieu_match.group(2).strip().split('\n')[0]
            dieu_title = f"Điều {dieu_so}. {dieu_ten}"

            metadata = {
                "source_file": source_filename,
                "document_type": doc_details["document_type"],
                "document_number": doc_details["document_number"],
                "document_date": doc_details["document_date"],
                "chuong": current_chuong,
                "dieu": dieu_title,
            }
            if current_muc:
                metadata["muc"] = current_muc
            
            documents.append(Document(page_content=article_text.strip(), metadata=metadata))
    
    return documents

# --- HÀM ĐIỀU PHỐI CHÍNH ---

def process_and_save_data(pdf_dir: str, all_chunks_path: str, json_all_chunks_path: str, vector_store_path: str):
    """Xử lý tất cả PDF, lưu danh sách các chunks ra file pickle và JSON."""
    print("🚀 Bắt đầu quá trình xử lý dữ liệu...")
    
    Path(all_chunks_path).parent.mkdir(parents=True, exist_ok=True)
    Path(json_all_chunks_path).parent.mkdir(parents=True, exist_ok=True)
    
    pdf_files = sorted(list(Path(pdf_dir).glob("*.pdf")))
    if not pdf_files:
        print(f"⚠️ Không tìm thấy file PDF nào trong thư mục '{pdf_dir}'")
        return

    all_chunks = []
    for pdf_path in pdf_files:
        print(f"⚙️ Đang xử lý file: {pdf_path.name}")
        cleaned_text = extract_and_clean_text(str(pdf_path))
        if cleaned_text:
            chunks = split_law_document_semantically(cleaned_text, pdf_path.name)
            all_chunks.extend(chunks)
            print(f"✅ Đã chia thành công {len(chunks)} chunks từ file {pdf_path.name}.")

     # --- BƯỚC LỌC CHUNKS RÁC ---
    print(f"\nLọc {len(all_chunks)} chunks thô...")
    final_chunks = [
        chunk for chunk in all_chunks 
        if len(chunk.page_content.split()) > 15 # Chỉ giữ chunk có hơn 15 từ
    ]
    print(f"✅ Đã lọc, còn lại {len(final_chunks)} chunks chất lượng.")

    # --- LƯU CÁC CHUNKS ĐÃ LỌC ---
    with open(all_chunks_path, "wb") as f:
        pickle.dump(final_chunks, f)
    
    json_data = [{"page_content": chunk.page_content, "metadata": chunk.metadata} for chunk in final_chunks]
    with open(json_all_chunks_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=4)
        
    print(f"\nĐã lưu {len(final_chunks)} chunks vào '{all_chunks_path}' và '{json_all_chunks_path}'.")

    # ====================================================================
    # <<< LOGIC TẠO VÀ LƯU TRỮ CHROMA DB VĨNH VIỄN >>>
    # ====================================================================
    print("\n⚙️ Bắt đầu tạo Vector Store (ChromaDB)...")

    # 1. Xóa thư mục vector store cũ để đảm bảo tạo mới hoàn toàn
    if os.path.exists(vector_store_path):
        print(f"   - Tìm thấy thư mục Vector Store cũ. Đang xóa: {vector_store_path}")
        shutil.rmtree(vector_store_path)
    
    # 2. Tải model embedding (chỉ cần cho bước này)
    # Tải model embedding từ local
    embedding_model_path = "models/bkai-foundation-models_vietnamese-bi-encoder"
    print(f"   - Tải embedding model từ: {embedding_model_path}")
    embedding_model = SentenceTransformer(embedding_model_path)
    langchain_embedding = SentenceTransformerEmbeddings(embedding_model)

    # 3. Tạo ChromaDB từ các chunks và lưu nó vào đĩa
    print(f"   - Đang embedding và tạo database tại: {vector_store_path}")
    vector_store = Chroma.from_documents(
        documents=final_chunks,
        embedding=langchain_embedding,
        persist_directory=vector_store_path # <-- Chỉ định thư mục lưu trữ
    )
    
    # Dòng này không cần thiết với phiên bản Chroma mới, from_documents đã tự lưu
    # vector_store.persist() 

    print("✅ Đã tạo và lưu trữ thành công Vector Store trên đĩa!")
    print("\n🎉 HOÀN TẤT TOÀN BỘ QUÁ TRÌNH XỬ LÝ DỮ LIỆU!")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    from app.core.config import settings

    print("Chạy data_loader như một script độc lập...")
    process_and_save_data(
        pdf_dir=settings.PDF_DIRECTORY,
        all_chunks_path=settings.ALL_CHUNKS_PATH,
        json_all_chunks_path=settings.ALL_CHUNKS_JSON_PATH,
        vector_store_path=settings.VECTOR_STORE_DIRECTORY
    )