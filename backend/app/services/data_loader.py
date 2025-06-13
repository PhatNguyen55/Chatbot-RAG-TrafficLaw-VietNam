import os
import re
import fitz  # PyMuPDF
import pickle
from pathlib import Path
from typing import List, Dict, Any

from langchain.schema import Document

# --- CÁC HÀM TIỆN ÍCH CHO VIỆC XỬ LÝ VĂN BẢN ---
# Đây là các hàm đã được kiểm chứng từ Colab

def join_broken_lines(text: str) -> str:
    """Nối các dòng bị ngắt giữa chừng."""
    lines = text.split('\n')
    result_lines = []
    i = 0
    while i < len(lines):
        current_line = lines[i].strip()
        if i + 1 < len(lines):
            next_line = lines[i+1].strip()
            # Điều kiện nối dòng: dòng hiện tại không kết thúc bằng dấu câu và dòng tiếp theo bắt đầu bằng chữ thường.
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
                # Loại bỏ header/footer cơ bản (số trang đứng một mình)
                page_text = re.sub(r"^\s*\d+\s*$", "", page_text, flags=re.MULTILINE)
                # Loại bỏ các dòng tiêu đề không cần thiết
                page_text = re.sub(r"^(CÔNG BÁO|DỰ THẢO|Luật số).*?\n", "", page_text, flags=re.IGNORECASE | re.MULTILINE)
                # Loại bỏ thông tin chữ ký số
                page_text = re.sub(r"Ký bởi:.*?\+07:00", "", page_text, flags=re.DOTALL | re.IGNORECASE)
                full_text += page_text + "\n"
    except Exception as e:
        print(f"❌ Lỗi khi xử lý PDF '{os.path.basename(pdf_path)}': {e}")
        return ""

    full_text = join_broken_lines(full_text)
    full_text = re.sub(r'[ \t]{2,}', ' ', full_text)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text).strip()
    return full_text


def extract_document_details(filename: str) -> Dict[str, Any]:
    """Trích xuất loại văn bản và số hiệu từ tên file để làm metadata."""
    details = {"document_type": "Văn bản khác", "document_number": "Không xác định"}
    filename_lower = filename.lower()
    
    nghi_dinh_match = re.search(r'nghi-dinh-(\d+)-(\d{4})', filename_lower)
    if nghi_dinh_match:
        details["document_type"] = "Nghị định"
        details["document_number"] = f"{nghi_dinh_match.group(1)}/{nghi_dinh_match.group(2)}/NĐ-CP"
        return details

    luat_match = re.search(r'luat.*(\d{4})', filename_lower)
    if luat_match:
        details["document_type"] = "Luật"
        details["document_number"] = f"Luật năm {luat_match.group(1)}"
        return details
        
    return details


def split_law_document_semantically(cleaned_full_text: str, source_filename: str) -> List[Document]:
    """
    Hàm cốt lõi: Chia văn bản pháp quy theo cấu trúc ngữ nghĩa (Chương -> Điều) và gán metadata chi tiết.
    """
    if not cleaned_full_text:
        return []

    doc_details = extract_document_details(source_filename)
    
    documents = []
    current_chuong = "Không xác định"
    current_muc = None

    # Tách văn bản thành các khối lớn bắt đầu bằng "Chương", "Mục" hoặc "Điều"
    articles = re.split(r'(?=\nChương\s+[IVXLCDM\d]+|\nMục\s+\d+|\nĐiều\s+\d+)', cleaned_full_text)
    articles = [article.strip() for article in articles if article.strip()]

    for article_text in articles:
        # Cập nhật thông tin Chương, Mục hiện tại
        chuong_match = re.match(r'Chương\s+([IVXLCDM\d]+)\n(.*?)\n', article_text, re.IGNORECASE)
        muc_match = re.match(r'Mục\s+(\d+)\n(.*?)\n', article_text, re.IGNORECASE)
        dieu_match = re.match(r'Điều\s+(\d+)\.?\s*(.*)', article_text, re.IGNORECASE)

        if chuong_match:
            chuong_so = chuong_match.group(1)
            chuong_ten = chuong_match.group(2).strip()
            current_chuong = f"Chương {chuong_so} - {chuong_ten}"
            current_muc = None # Reset Mục khi gặp Chương mới
            continue 
        
        if muc_match:
            muc_so = muc_match.group(1)
            muc_ten = muc_match.group(2).strip()
            current_muc = f"Mục {muc_so} - {muc_ten}"
            continue
            
        if dieu_match:
            # Nếu là một Điều, trích xuất metadata và tạo Document
            dieu_so = dieu_match.group(1)
            dieu_ten = dieu_match.group(2).strip().split('\n')[0]
            dieu_title = f"Điều {dieu_so}. {dieu_ten}"

            # Mỗi Điều là một Document. Chúng ta không chia nhỏ hơn ở bước này.
            # Việc chia nhỏ hơn sẽ do các lớp splitter của LangChain xử lý sau nếu cần.
            # Ở đây, mỗi Điều là một chunk.
            
            metadata = {
                "source_file": source_filename,
                "document_type": doc_details["document_type"],
                "document_number": doc_details["document_number"],
                "chuong": current_chuong,
                "dieu": dieu_title,
            }
            if current_muc:
                metadata["muc"] = current_muc
            
            documents.append(Document(page_content=article_text.strip(), metadata=metadata))
    
    return documents


# --- HÀM ĐIỀU PHỐI CHÍNH ---

def process_and_save_data(pdf_dir: str, save_path: str):
    """
    Hàm chính để xử lý tất cả PDF và lưu danh sách các chunks (Documents) ra file pickle.
    """
    print("🚀 Bắt đầu quá trình xử lý dữ liệu...")
    
    # Tạo thư mục cha của save_path nếu chưa có
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    
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

    # Lưu lại toàn bộ chunks đã xử lý vào một file duy nhất
    with open(save_path, "wb") as f:
        pickle.dump(all_chunks, f)
        
    print(f"\n🎉 HOÀN TẤT! Đã lưu tổng cộng {len(all_chunks)} chunks vào '{save_path}'")


# --- KHỐI ĐỂ CHẠY TRỰC TIẾP SCRIPT NÀY ---

if __name__ == "__main__":
    # Import settings để lấy đường dẫn đã cấu hình
    # Cần một chút thay đổi để script có thể chạy độc lập
    import sys
    sys.path.append(os.getcwd())
    from app.core.config import settings

    print("Chạy data_loader như một script độc lập...")
    
    # Chạy hàm xử lý chính
    process_and_save_data(
        pdf_dir=settings.PDF_DIRECTORY,
        save_path=settings.ALL_CHUNKS_PATH
    )