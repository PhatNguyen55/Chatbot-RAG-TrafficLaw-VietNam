from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Default Project Name"
    API_V1_STR: str = "/api/v1"
    
    # Đường dẫn đến thư mục chứa các file luật PDF
    PDF_DIRECTORY: str = "data/pdfs"
    # Đường dẫn đến nơi lưu trữ các index đã xử lý
    VECTOR_STORE_DIRECTORY: str = "data/vector_store"
    # Tên file cụ thể để lưu tất cả các chunks đã được xử lý
    ALL_CHUNKS_PATH: str = "data/vector_store/all_chunks.pkl"
    GOOGLE_API_KEY: str

    class Config:
        case_sensitive = True
        # Dòng này cho phép Pydantic đọc biến từ file .env
        env_file = ".env"

# Tạo một instance duy nhất để import vào các file khác
settings = Settings()