from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatMessageCreate
from sqlalchemy import select, delete # Thêm delete
from typing import List

async def create_session(db: AsyncSession, *, user_id: int) -> ChatSession:
    db_session = ChatSession(user_id=user_id)
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session

async def create_message(db: AsyncSession, *, obj_in: ChatMessageCreate, session_id: int) -> ChatMessage:
    db_obj = ChatMessage(
        question=obj_in.question,
        answer=obj_in.answer,
        sources=obj_in.sources,
        session_id=session_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_sessions_by_user(db: AsyncSession, *, user_id: int) -> List[ChatSession]:
    """Lấy tất cả các session của một user."""
    result = await db.execute(
        select(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc())
    )
    return result.scalars().all()

async def get_messages_by_session(db: AsyncSession, *, session_id: int, user_id: int) -> List[ChatMessage]:
    """Lấy tất cả message của một session, đảm bảo session đó thuộc về user."""
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .filter(ChatMessage.session_id == session_id, ChatSession.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()

async def remove_session(db: AsyncSession, *, session_id: int, user_id: int) -> ChatSession | None:
    """Xóa một session và các message liên quan (do cascade)."""
    result = await db.execute(
        select(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    session_to_delete = result.scalar_one_or_none()
    if session_to_delete:
        await db.delete(session_to_delete)
        await db.commit()
    return session_to_delete