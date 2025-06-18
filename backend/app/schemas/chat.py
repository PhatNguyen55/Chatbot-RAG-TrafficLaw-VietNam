from pydantic import BaseModel
from typing import List, Dict, Any
import datetime

class Source(BaseModel):
    source_file: str
    # Thêm các trường metadata khác nếu bạn muốn trả về cho frontend
    dieu: str
    
class ChatRequest(BaseModel):
    question: str
    session_id: int | None = None # Frontend có thể gửi session_id cũ

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