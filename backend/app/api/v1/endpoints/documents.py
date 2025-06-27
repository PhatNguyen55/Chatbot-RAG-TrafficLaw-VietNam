# app/api/v1/endpoints/documents.py
from fastapi import APIRouter, HTTPException, Path as FastApiPath
from fastapi.responses import FileResponse
from app.core.config import settings
import os

router = APIRouter()

@router.get("/view/{filename}")
async def view_document(
    filename: str = FastApiPath(..., description="Tên file PDF cần xem")
):
    print("\n--- DEBUGGING /documents/view ---")
    print(f"1. Received filename from URL: '{filename}'")
    
    # Lấy đường dẫn thư mục PDF từ settings (đã là tuyệt đối)
    pdf_dir = settings.PDF_DIRECTORY
    print(f"2. PDF directory from settings: '{pdf_dir}'")

    # Xây dựng đường dẫn đầy đủ đến file
    file_path = os.path.join(pdf_dir, filename)
    print(f"3. Constructed full file path: '{file_path}'")

    # Kiểm tra xem file có tồn tại vật lý hay không
    file_exists = os.path.isfile(file_path)
    print(f"4. Does file exist at path? -> {file_exists}")

    if not file_exists:
        # Nếu không tồn tại, hãy liệt kê tất cả các file có trong thư mục để so sánh
        try:
            available_files = os.listdir(pdf_dir)
            print(f"5. ERROR: File not found. Available files in directory '{pdf_dir}':")
            for f in available_files:
                print(f"   - {f}")
        except Exception as list_err:
            print(f"   - Could not list files in directory: {list_err}")
        
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found on server.")
    
    # (Phần kiểm tra path traversal giữ nguyên)

    print("6. File found. Returning FileResponse...")
    return FileResponse(path=file_path, media_type='application/pdf')