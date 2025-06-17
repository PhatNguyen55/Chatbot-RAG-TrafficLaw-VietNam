# app/api/v1/endpoints/chat.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
# --- SỬA CÁC DÒNG IMPORT ---
from app.models import user as models_user # Đổi tên để tránh xung đột
from app.schemas import chat as schemas_chat # Import trực tiếp file chat.py
from app.crud import crud_chat, crud_user # Import các module crud cần thiết
# --- KẾT THÚC SỬA IMPORT ---
from app.api import deps
from app.services.rag_service import rag_service

from fastapi import HTTPException
from typing import List
import datetime
from app.crud import crud_chat 

router = APIRouter()

# --- SỬA CÁCH SỬ DỤNG ---
@router.post("/message", response_model=schemas_chat.ChatResponse)
async def handle_chat_message(
    request: schemas_chat.ChatRequest, # Dùng schemas_chat
    db: AsyncSession = Depends(deps.get_db),
    current_user: models_user.User = Depends(deps.get_current_user), # Dùng models_user
):
    if not request.session_id:
        chat_session = await crud_chat.create_session(db=db, user_id=current_user.id)
        session_id = chat_session.id
    else:
        # (Thêm logic kiểm tra session_id ở đây)
        session_id = request.session_id

    result = rag_service.ask(request.question)
    
    message_to_db = schemas_chat.ChatMessageCreate( # Dùng schemas_chat
        question=request.question,
        answer=result["answer"],
        sources=result["sources"]
    )
    await crud_chat.create_message(db=db, obj_in=message_to_db, session_id=session_id)
    
    return schemas_chat.ChatResponse( # Dùng schemas_chat
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id
    )
    
@router.get("/sessions", response_model=List[schemas_chat.ChatSession])
async def get_user_sessions(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models_user.User = Depends(deps.get_current_user),
):
    """Lấy danh sách các cuộc trò chuyện của người dùng hiện tại."""
    return await crud_chat.get_sessions_by_user(db=db, user_id=current_user.id)


@router.get("/sessions/{session_id}", response_model=schemas_chat.ChatSessionDetail)
async def get_session_details(
    session_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models_user.User = Depends(deps.get_current_user),
):
    """Lấy chi tiết và lịch sử tin nhắn của một cuộc trò chuyện."""
    session = await crud_chat.get_messages_by_session(db=db, session_id=session_id, user_id=current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or you don't have access")
    # Tái cấu trúc lại dữ liệu để khớp với response_model
    # Đây là một ví dụ, bạn có thể cần lấy thông tin session riêng
    first_message = session[0] if session else None
    return {
        "id": session_id,
        "title": first_message.session.title if first_message else "Cuộc trò chuyện",
        "created_at": first_message.session.created_at if first_message else datetime.datetime.now(),
        "messages": session
    }


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models_user.User = Depends(deps.get_current_user),
):
    """Xóa một cuộc trò chuyện."""
    deleted_session = await crud_chat.remove_session(db=db, session_id=session_id, user_id=current_user.id)
    if not deleted_session:
        raise HTTPException(status_code=404, detail="Session not found or you don't have access")
    return {"ok": True} 