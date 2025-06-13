from fastapi import FastAPI
from app.core.config import settings

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME
)

# Tạo một API route đơn giản để kiểm tra
@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}   