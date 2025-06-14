from app.services.rag_service import rag_service

async def startup_event():
    """
    Hàm được gọi khi ứng dụng FastAPI khởi động.
    """
    print("--- FastAPI App is starting up ---")
    print("--- Loading RAG Service... ---")
    # Ra lệnh cho RAG service tải các model và index
    rag_service.load()

async def shutdown_event():
    """
    Hàm được gọi khi ứng dụng FastAPI tắt.
    """
    print("--- FastAPI App is shutting down ---")
    # Có thể thêm logic dọn dẹp tài nguyên ở đây nếu cần (ví dụ: giải phóng GPU)