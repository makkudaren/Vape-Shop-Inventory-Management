from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import os
from pydantic import BaseModel, EmailStr

from backend.database import get_db
from backend.models import User
from backend.utils.security import get_password_hash, verify_password, create_access_token
from backend.utils.email import send_verification_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
TOKEN_BLOCKLIST = set()

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: str
    admin_passcode: str | None = None

class VerifySchema(BaseModel):
    email: EmailStr
    code: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(data: RegisterSchema, db: Session = Depends(get_db)):
    # 1. Validate fields
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    
    # 2. Check Role & Passcode [cite: 246, 247]
    if data.role == "admin":
        if data.admin_passcode != os.getenv("ADMIN_PASSCODE"):
            raise HTTPException(status_code=403, detail="Invalid admin passcode.")
    else:
        data.role = "staff"

    # 3. Check existing user
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # 4. Create User & Code [cite: 249]
    verification_code = str(random.randint(100000, 999999))
    hashed_pwd = get_password_hash(data.password)
    
    new_user = User(
        name=data.name, email=data.email, hashed_password=hashed_pwd, role=data.role,
        verification_code=verification_code,
        code_expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(new_user)
    db.commit()

    # 5. Send Email
    await send_verification_email(data.email, data.name, verification_code)
    return {"message": "Registration successful. Please check your email for the verification code."}

@router.post("/verify")
def verify_account(data: VerifySchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        return {"message": "Account already verified."}
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    if datetime.utcnow() > user.code_expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired.")

    user.is_verified = True
    user.verification_code = None # clear code
    db.commit()
    return {"message": "Account successfully verified. You can now log in."}

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid login credentials.") # [cite: 253]
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified. Please verify your email.")

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480)))
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "name": user.name}

@router.post("/logout")
def logout(request: Request):
    """Receives the active token from the user and kills it."""
    # We grab the token directly from the request headers to avoid circular dependencies
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        TOKEN_BLOCKLIST.add(token)
    return {"message": "Successfully logged out"}