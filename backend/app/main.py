"""ThoughtBox — FastAPI Backend Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List

from .database import engine, get_db, Base
from .models import Thought, Report
from .schemas import (
    ThoughtCreate,
    ThoughtResponse,
    ThoughtAdminResponse,
    ReportCreate,
    ReportResponse,
    MessageResponse,
    HealthResponse,
)
from .config import get_settings

settings = get_settings()

VALID_CATEGORIES = ["Academics", "Suggestions", "Appreciation", "Campus Life", "Other"]

# --- Rate Limiter ---
# Uses a simple in-memory store; does not persist raw IPs to disk/database
limiter = Limiter(key_func=get_remote_address)


# --- Lifespan: create tables on startup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# --- App factory ---
app = FastAPI(
    title="ThoughtBox API",
    description="Anonymous campus thoughts platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please wait a moment before trying again.",
    )


# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper: verify moderator secret ---
def verify_moderator(x_moderator_secret: str = Header(...)):
    if x_moderator_secret != settings.moderator_secret:
        raise HTTPException(status_code=403, detail="Invalid moderator credentials")
    return True


# ============================================================
# PUBLIC ENDPOINTS
# ============================================================


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Check API and database health."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return HealthResponse(status="ok", database=db_status)


@app.get("/api/thoughts", response_model=List[ThoughtResponse], tags=["Thoughts"])
def get_thoughts(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Get all approved, visible thoughts (newest first). Optionally filter by category."""
    query = db.query(Thought).filter(
        Thought.is_approved == True,
        Thought.is_hidden == False,
    )
    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}",
            )
        query = query.filter(Thought.category == category)
    thoughts = query.order_by(Thought.created_at.desc()).all()
    return thoughts


@app.post(
    "/api/thoughts",
    response_model=ThoughtResponse,
    status_code=201,
    tags=["Thoughts"],
)
@limiter.limit("10/minute")
def create_thought(
    request: Request,
    thought: ThoughtCreate,
    db: Session = Depends(get_db),
):
    """Submit a new anonymous thought."""
    if thought.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}",
        )
    content = thought.content.strip()
    if len(content) < settings.min_thought_length:
        raise HTTPException(status_code=400, detail="Thought is too short.")
    if len(content) > settings.max_thought_length:
        raise HTTPException(status_code=400, detail="Thought is too long (max 1000 characters).")

    db_thought = Thought(content=content, category=thought.category)
    db.add(db_thought)
    db.commit()
    db.refresh(db_thought)
    return db_thought


@app.post(
    "/api/thoughts/{thought_id}/like",
    response_model=MessageResponse,
    tags=["Thoughts"],
)
@limiter.limit("30/minute")
def like_thought(
    request: Request,
    thought_id: int,
    db: Session = Depends(get_db),
):
    """Like a thought. Simple increment — lightweight duplicate prevention via rate limiting."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    if thought.is_hidden:
        raise HTTPException(status_code=404, detail="Thought not found")
    thought.likes += 1
    db.commit()
    return MessageResponse(message=f"Liked! Total likes: {thought.likes}")


@app.post(
    "/api/thoughts/{thought_id}/report",
    response_model=MessageResponse,
    status_code=201,
    tags=["Thoughts"],
)
@limiter.limit("5/minute")
def report_thought(
    request: Request,
    thought_id: int,
    report: ReportCreate,
    db: Session = Depends(get_db),
):
    """Report a thought for inappropriate content."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    db_report = Report(thought_id=thought_id, reason=report.reason)
    db.add(db_report)
    thought.reports += 1
    db.commit()
    return MessageResponse(message="Report submitted. Thank you for keeping the community safe.")


# ============================================================
# MODERATOR ENDPOINTS (protected by X-Moderator-Secret header)
# ============================================================


@app.get(
    "/api/mod/thoughts",
    response_model=List[ThoughtAdminResponse],
    tags=["Moderation"],
)
def mod_get_all_thoughts(
    _: bool = Depends(verify_moderator),
    db: Session = Depends(get_db),
):
    """List all thoughts including hidden ones (moderator only)."""
    return db.query(Thought).order_by(Thought.created_at.desc()).all()


@app.get(
    "/api/mod/reports",
    response_model=List[ReportResponse],
    tags=["Moderation"],
)
def mod_get_reports(
    _: bool = Depends(verify_moderator),
    db: Session = Depends(get_db),
):
    """List all reports (moderator only)."""
    return db.query(Report).order_by(Report.created_at.desc()).all()


@app.post(
    "/api/mod/thoughts/{thought_id}/hide",
    response_model=MessageResponse,
    tags=["Moderation"],
)
def mod_hide_thought(
    thought_id: int,
    _: bool = Depends(verify_moderator),
    db: Session = Depends(get_db),
):
    """Hide a thought from the public feed (moderator only)."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    thought.is_hidden = True
    db.commit()
    return MessageResponse(message=f"Thought {thought_id} has been hidden.")


@app.post(
    "/api/mod/thoughts/{thought_id}/unhide",
    response_model=MessageResponse,
    tags=["Moderation"],
)
def mod_unhide_thought(
    thought_id: int,
    _: bool = Depends(verify_moderator),
    db: Session = Depends(get_db),
):
    """Restore a hidden thought to the public feed (moderator only)."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    thought.is_hidden = False
    db.commit()
    return MessageResponse(message=f"Thought {thought_id} has been restored.")
