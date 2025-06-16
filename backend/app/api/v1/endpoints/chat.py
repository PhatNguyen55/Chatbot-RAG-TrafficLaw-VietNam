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