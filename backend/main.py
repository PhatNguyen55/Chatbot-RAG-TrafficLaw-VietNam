from fastapi import FastAPI
from app.core.config import settings
from app.core.life_cycles import startup_event, shutdown_event

# Khởi tạo ứng dụng FastAPI
app = FastAPI (
    title=settings.PROJECT_NAME,
    on_startup=[startup_event],
    on_shutdown=[shutdown_event]
)

# Tạo một API route đơn giản để kiểm tra
@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}   