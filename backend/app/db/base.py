# Import Base từ base_class
from app.db.base_class import Base

# Import TẤT CẢ các model của bạn vào đây
# Dòng import này sẽ làm cho các model tự đăng ký với Base.metadata
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage