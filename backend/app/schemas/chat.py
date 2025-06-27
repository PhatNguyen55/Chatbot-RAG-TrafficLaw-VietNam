from pydantic import BaseModel, Field
from typing import List, Dict, Any
import datetime

class Source(BaseModel):
    source_file: str
    document_type: str
    document_number: str
    chuong: str
    dieu: str
    muc: str | None = None
    article_number: str
    # Thêm các trường khác nếu có
    page_content: str # <-- Bắt buộc phải có
    

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
    session_id: int # Backend sẽ luôn trả về một session_id

class ChatMessageCreate(BaseModel):
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    
class ChatMessage(BaseModel):
    id: int
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChatSession(BaseModel):
    id: int
    title: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChatSessionDetail(ChatSession):
    messages: List[ChatMessage]
    
class ChatSessionUpdate(BaseModel):
    title: str
    
class HistoryItem(BaseModel):
    # Dùng tuple [str, str] để biểu diễn (câu hỏi của user, câu trả lời của AI)
    # Đây là định dạng mà ConversationBufferMemory mong đợi
    # Tuy nhiên, để linh hoạt, chúng ta có thể dùng một class riêng
    human: str
    ai: str

class ChatRequest(BaseModel):
    question: str
    session_id: int | None = None
    # Thêm trường chat_history, mặc định là mảng rỗng
    chat_history: List[HistoryItem] = Field(default_factory=list)