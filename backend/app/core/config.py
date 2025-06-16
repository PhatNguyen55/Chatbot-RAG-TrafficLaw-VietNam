# app/core/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Đọc file .env một cách tường minh
load_dotenv()

class Settings(BaseSettings):
    # Khai báo TẤT CẢ các biến trực tiếp ở đây
    # Pydantic sẽ đọc chúng từ môi trường (đã được load_dotenv nạp vào)
    
     # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    
    # App
    PROJECT_NAME: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ALGORITHM: str
    
    # RAG
    GOOGLE_API_KEY: str
    
    # Các biến không đọc từ .env
    API_V1_STR: str = "/api/v1"
    PDF_DIRECTORY: str = "data/pdfs"
    VECTOR_STORE_DIRECTORY: str = "data/vector_store"
    ALL_CHUNKS_PATH: str = "data/vector_store/all_chunks.pkl"

    # Không cần class Config ở đây nữa vì chúng ta đã load thủ công
    # class Config:
    #     env_file = ".env"

    # Tạo các URL ở đây để dễ sử dụng
    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()