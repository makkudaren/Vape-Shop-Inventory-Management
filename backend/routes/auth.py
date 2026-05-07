from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from database import get_db
from email_service import send_verification_email
import models, schemas, auth as auth_utils
import random
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE", "123ADMIN")


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


# ─── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=schemas.MessageResponse, status_code=201)
async def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):

    # Check email uniqueness
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Validate admin passcode
    if data.role == models.UserRole.admin:
        if not data.admin_passcode or data.admin_passcode != ADMIN_PASSCODE:
            raise HTTPException(status_code=403, detail="Invalid admin passcode.")

    # Create user
    user = models.User(
        name     = data.name,
        email    = data.email,
        password = auth_utils.hash_password(data.password),
        role     = data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate and store verification code (10 min expiry)
    code = _generate_code()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    verification = models.VerificationCode(
        user_id    = user.id,
        code       = code,
        expires_at = expiry,
    )
    db.add(verification)
    db.commit()

    # Send email
    try:
        await send_verification_email(user.email, user.name, code)
    except Exception as e:
        # Don't block registration if email fails — log it
        print(f"[EMAIL ERROR] {e}")

    return {"message": f"Registration successful. A verification code has been sent to {data.email}."}


# ─── Verify Email ─────────────────────────────────────────────────────────────

@router.post("/verify", response_model=schemas.MessageResponse)
def verify_email(data: schemas.VerifyRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified.")

    # Find a valid, unused code
    now = datetime.now(timezone.utc)
    verification = (
        db.query(models.VerificationCode)
        .filter(
            models.VerificationCode.user_id == user.id,
            models.VerificationCode.code == data.code,
            models.VerificationCode.used == False,
            models.VerificationCode.expires_at > now,
        )
        .first()
    )

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Mark code as used and activate user
    verification.used  = True
    user.is_verified   = True
    db.commit()

    return {"message": "Email verified successfully. You can now log in."}


# ─── Resend Code ──────────────────────────────────────────────────────────────

@router.post("/resend-code", response_model=schemas.MessageResponse)
async def resend_code(data: schemas.VerifyRequest, db: Session = Depends(get_db)):
    # We only need the email here
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified.")

    # Invalidate old codes
    db.query(models.VerificationCode).filter(
        models.VerificationCode.user_id == user.id,
        models.VerificationCode.used == False,
    ).update({"used": True})

    # Create new code
    code = _generate_code()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    verification = models.VerificationCode(
        user_id    = user.id,
        code       = code,
        expires_at = expiry,
    )
    db.add(verification)
    db.commit()

    try:
        await send_verification_email(user.email, user.name, code)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    return {"message": "A new verification code has been sent."}


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user or not auth_utils.verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated.")

    token = auth_utils.create_access_token({"sub": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user_id":      user.id,
        "name":         user.name,
        "role":         user.role,
    }


# ─── Me (current user info) ───────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user