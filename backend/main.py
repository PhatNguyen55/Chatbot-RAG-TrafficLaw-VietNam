from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.life_cycles import startup_event, shutdown_event
from app.api.v1.api import api_router

# Khởi tạo ứng dụng FastAPI
app = FastAPI (
    title=settings.PROJECT_NAME,
    on_startup=[startup_event],
    on_shutdown=[shutdown_event]
)

origins = [
    "http://localhost",
    "http://localhost:5173", # Địa chỉ của Vite dev server
    # Thêm địa chỉ của frontend khi deploy thật vào đây
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Cho phép gửi cookie
    allow_methods=["*"],    # Cho phép tất cả các method (GET, POST, ...)
    allow_headers=["*"],    # Cho phép tất cả các header
)

app.include_router(api_router, prefix=settings.API_V1_STR)
# Tạo một API route đơn giản để kiểm tra
@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}   