# app/api/v1/endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
# --- SỬA IMPORT ---
from app.schemas import token as schemas_token, user as schemas_user
from app.crud import crud_user
# --- KẾT THÚC SỬA IMPORT ---
from app.api import deps
from app.core.security import create_access_token, verify_password

router = APIRouter()

@router.post("/login", response_model=schemas_token.Token) # Dùng schemas_token
async def login(db: AsyncSession = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = await crud_user.get_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/signup", response_model=schemas_user.User) # Dùng schemas_user
async def signup(user_in: schemas_user.UserCreate, db: AsyncSession = Depends(deps.get_db)):
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud_user.create(db, obj_in=user_in)
    return user