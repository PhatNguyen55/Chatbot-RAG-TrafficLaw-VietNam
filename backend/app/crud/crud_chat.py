from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatMessageCreate

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