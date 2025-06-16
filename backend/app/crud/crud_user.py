# app/crud/crud_user.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate

async def get_by_email(db: AsyncSession, *, email: str) -> User | None:
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, *, obj_in: UserCreate) -> User:
    hashed_password = get_password_hash(obj_in.password)
    db_obj = User(email=obj_in.email, hashed_password=hashed_password)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj