"""Authentication and authorization utilities for ThoughtBox."""

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import User

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    ).hex()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against stored salt and PBKDF2 hash."""
    try:
        if not hashed_password or "$" not in hashed_password:
            return False
        salt, pwd_hash = hashed_password.split("$", 1)
        check_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000,
        ).hex()
        return hmac.compare_digest(pwd_hash, check_hash)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta_seconds: int = 86400 * 7) -> str:
    """Create a signed HMAC-SHA256 access token with expiration."""
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_delta_seconds
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    signature = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{b64_payload}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify an access token."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        expected_sig = hmac.new(
            settings.jwt_secret.encode("utf-8"),
            b64_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        padded = b64_payload + "=" * (-len(b64_payload) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Extract current user if valid bearer token is provided, else return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    return user


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that requires an authenticated active user."""
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def verify_admin(
    authorization: Optional[str] = Header(None),
    x_moderator_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> bool:
    """
    Verify administrative access either through:
    1. A valid X-Moderator-Secret header (backward compatibility), OR
    2. A Bearer token of an active user with role == 'admin'.
    """
    # Check moderator secret header
    if x_moderator_secret and x_moderator_secret == settings.moderator_secret:
        return True

    # Check Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
                if user and user.role == "admin":
                    return True

    raise HTTPException(status_code=403, detail="Administrator credentials required")


def seed_default_admin(db: Session):
    """Seed initial administrator account if no admin exists."""
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if not admin_exists:
        # Check if username or email is already taken
        existing_user = db.query(User).filter(
            (User.username == settings.admin_default_username) |
            (User.email == settings.admin_default_email)
        ).first()
        if existing_user:
            existing_user.role = "admin"
            db.commit()
        else:
            default_admin = User(
                username=settings.admin_default_username,
                email=settings.admin_default_email,
                hashed_password=hash_password(settings.admin_default_password),
                full_name="System Administrator",
                role="admin",
                avatar="avatar-admin",
                is_active=True,
            )
            db.add(default_admin)
            db.commit()
