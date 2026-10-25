"""ThoughtBox — FastAPI Backend Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, List, Dict

from .database import engine, get_db, Base, SessionLocal
from .models import User, Thought, Report, Poll, PollOption, PollVote, Comment
from .schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    AuthTokenResponse,
    UserProfileUpdate,
    UserRoleUpdate,
    UserStatusUpdate,
    ThoughtCreate,
    ThoughtUpdate,
    ThoughtResponse,
    ThoughtAdminResponse,
    ReportCreate,
    ReportResponse,
    PollCreate,
    PollUpdate,
    PollVoteRequest,
    PollResponse,
    PollOptionResponse,
    CommentCreate,
    CommentResponse,
    AdminStatsResponse,
    MessageResponse,
    HealthResponse,
)
from .config import get_settings
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    verify_admin,
    seed_default_admin,
)

settings = get_settings()

VALID_CATEGORIES = ["Academics", "Suggestions", "Appreciation", "Campus Life", "Other"]

# --- Rate Limiter ---
limiter = Limiter(key_func=get_remote_address)


# --- Lifespan: DB migration and seed on startup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Seamless schema migration for existing databases
    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
            conn.execute(text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS author_name VARCHAR(50) DEFAULT 'Anonymous';"))
            conn.execute(text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);"))
            conn.commit()
        elif dialect == "sqlite":
            cursor = conn.execute(text("PRAGMA table_info(thoughts);"))
            columns = [row[1] for row in cursor.fetchall()]
            if "user_id" not in columns:
                conn.execute(text("ALTER TABLE thoughts ADD COLUMN user_id INTEGER;"))
            if "author_name" not in columns:
                conn.execute(text("ALTER TABLE thoughts ADD COLUMN author_name VARCHAR(50) DEFAULT 'Anonymous';"))
            if "is_anonymous" not in columns:
                conn.execute(text("ALTER TABLE thoughts ADD COLUMN is_anonymous BOOLEAN DEFAULT 1;"))
            user_cursor = conn.execute(text("PRAGMA table_info(users);"))
            user_columns = [row[1] for row in user_cursor.fetchall()]
            if "roll_number" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN roll_number VARCHAR(50);"))
            conn.commit()

    # Seed initial administrator account
    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()

    yield


# --- App factory ---
app = FastAPI(
    title="ThoughtBox API",
    description="Anonymous campus thoughts & community engagement platform",
    version="2.0.0",
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


# ============================================================
# HEALTH CHECK
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


# ============================================================
# AUTHENTICATION & USER MANAGEMENT
# ============================================================

@app.post("/api/auth/register", response_model=AuthTokenResponse, status_code=201, tags=["Auth"])
@limiter.limit("10/minute")
def register(request: Request, user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    username = user_in.username.strip()
    email = user_in.email.strip().lower()

    if db.query(User).filter(User.username.ilike(username)).first():
        raise HTTPException(status_code=400, detail="Username is already taken")
    if db.query(User).filter(User.email.ilike(email)).first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    new_user = User(
        username=username,
        email=email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip() if user_in.full_name else None,
        roll_number=user_in.roll_number.strip() if user_in.roll_number else None,
        role=user_in.role if user_in.role in ["user", "admin"] else "user",
        avatar=user_in.avatar or "avatar-scholar",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "username": new_user.username, "role": new_user.role})
    return AuthTokenResponse(user=UserResponse.model_validate(new_user), access_token=token)


@app.post("/api/auth/login", response_model=AuthTokenResponse, tags=["Auth"])
@limiter.limit("20/minute")
def login(request: Request, creds: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with username or email and password."""
    ident = creds.username_or_email.strip()
    user = db.query(User).filter(
        (User.username.ilike(ident)) | (User.email.ilike(ident))
    ).first()

    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is suspended. Please contact administrator.")

    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})
    return AuthTokenResponse(user=UserResponse.model_validate(user), access_token=token)


@app.get("/api/auth/me", response_model=UserResponse, tags=["Auth"])
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(user)


@app.put("/api/auth/profile", response_model=UserResponse, tags=["Auth"])
def update_profile(
    profile_in: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile information."""
    if profile_in.full_name is not None:
        user.full_name = profile_in.full_name.strip()
    if profile_in.avatar is not None:
        user.avatar = profile_in.avatar

    if profile_in.new_password:
        if not profile_in.current_password or not verify_password(profile_in.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password incorrect")
        user.hashed_password = hash_password(profile_in.new_password)

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ============================================================
# PUBLIC THOUGHTS ENDPOINTS
# ============================================================

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

    # Build response with comments count
    results = []
    for t in thoughts:
        results.append(
            ThoughtResponse(
                id=t.id,
                content=t.content,
                category=t.category,
                likes=t.likes,
                created_at=t.created_at,
                author_name=t.author_name if not t.is_anonymous else "Anonymous",
                is_anonymous=t.is_anonymous,
                comments_count=len(t.comments) if hasattr(t, "comments") else 0,
            )
        )
    return results


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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Submit a new thought (anonymous or signed with user account)."""
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

    is_anon = thought.is_anonymous
    author_name = "Anonymous"
    user_id = None

    if current_user:
        user_id = current_user.id
        if not is_anon:
            author_name = current_user.username

    db_thought = Thought(
        content=content,
        category=thought.category,
        is_anonymous=is_anon,
        author_name=author_name,
        user_id=user_id,
    )
    db.add(db_thought)
    db.commit()
    db.refresh(db_thought)

    return ThoughtResponse(
        id=db_thought.id,
        content=db_thought.content,
        category=db_thought.category,
        likes=db_thought.likes,
        created_at=db_thought.created_at,
        author_name=db_thought.author_name if not db_thought.is_anonymous else "Anonymous",
        is_anonymous=db_thought.is_anonymous,
        comments_count=0,
    )


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
    """Like a thought."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought or thought.is_hidden:
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
# COMMENTS ENDPOINTS
# ============================================================

@app.get("/api/thoughts/{thought_id}/comments", response_model=List[CommentResponse], tags=["Comments"])
def get_thought_comments(thought_id: int, db: Session = Depends(get_db)):
    """List comments on a thought."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought or thought.is_hidden:
        raise HTTPException(status_code=404, detail="Thought not found")
    comments = db.query(Comment).filter(Comment.thought_id == thought_id).order_by(Comment.created_at.asc()).all()
    return comments


@app.post("/api/thoughts/{thought_id}/comments", response_model=CommentResponse, status_code=201, tags=["Comments"])
@limiter.limit("15/minute")
def add_thought_comment(
    request: Request,
    thought_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Post a comment under a thought."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought or thought.is_hidden:
        raise HTTPException(status_code=404, detail="Thought not found")

    content = comment_in.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    author_name = "Anonymous"
    user_id = None
    if current_user:
        user_id = current_user.id
        author_name = current_user.username
    elif comment_in.author_name and comment_in.author_name.strip():
        author_name = comment_in.author_name.strip()

    comment = Comment(
        thought_id=thought_id,
        user_id=user_id,
        author_name=author_name,
        content=content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ============================================================
# POLLS ENDPOINTS
# ============================================================

@app.get("/api/polls", response_model=List[PollResponse], tags=["Polls"])
def get_polls(
    category: Optional[str] = Query(None),
    voter_token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List campus community polls with vote percentages and user voted status."""
    query = db.query(Poll)
    if category and category != "All":
        query = query.filter(Poll.category == category)
    polls = query.order_by(Poll.created_at.desc()).all()

    effective_token = voter_token or (f"user-{current_user.id}" if current_user else None)

    results = []
    for p in polls:
        total = p.total_votes
        user_vote = None
        if effective_token:
            vote_rec = db.query(PollVote).filter(
                PollVote.poll_id == p.id,
                PollVote.voter_token == effective_token,
            ).first()
            if vote_rec:
                user_vote = vote_rec.option_id

        opts = []
        for o in p.options:
            pct = round((o.votes_count / total * 100), 1) if total > 0 else 0.0
            opts.append(PollOptionResponse(
                id=o.id,
                text=o.text,
                votes_count=o.votes_count,
                percentage=pct,
            ))

        results.append(PollResponse(
            id=p.id,
            question=p.question,
            description=p.description,
            category=p.category,
            author_name=p.author_name,
            is_active=p.is_active,
            total_votes=p.total_votes,
            created_at=p.created_at,
            options=opts,
            user_voted_option_id=user_vote,
        ))
    return results


@app.post("/api/polls", response_model=PollResponse, status_code=201, tags=["Polls"])
@limiter.limit("10/minute")
def create_poll(
    request: Request,
    poll_in: PollCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a new campus poll with 2 to 6 options."""
    question = poll_in.question.strip()
    if len(question) < 5:
        raise HTTPException(status_code=400, detail="Poll question is too short")

    clean_options = [opt.strip() for opt in poll_in.options if opt.strip()]
    if len(clean_options) < 2 or len(clean_options) > 6:
        raise HTTPException(status_code=400, detail="Poll must contain between 2 and 6 distinct options")

    author_name = "Campus Community"
    user_id = None
    if current_user:
        user_id = current_user.id
        if not poll_in.is_anonymous:
            author_name = current_user.username
        else:
            author_name = "Anonymous Student"

    new_poll = Poll(
        question=question,
        description=poll_in.description.strip() if poll_in.description else None,
        category=poll_in.category if poll_in.category in VALID_CATEGORIES else "Campus Life",
        user_id=user_id,
        author_name=author_name,
        is_active=True,
        total_votes=0,
    )
    db.add(new_poll)
    db.commit()
    db.refresh(new_poll)

    for opt_text in clean_options:
        opt = PollOption(poll_id=new_poll.id, text=opt_text, votes_count=0)
        db.add(opt)
    db.commit()
    db.refresh(new_poll)

    opts = [
        PollOptionResponse(id=o.id, text=o.text, votes_count=0, percentage=0.0)
        for o in new_poll.options
    ]
    return PollResponse(
        id=new_poll.id,
        question=new_poll.question,
        description=new_poll.description,
        category=new_poll.category,
        author_name=new_poll.author_name,
        is_active=new_poll.is_active,
        total_votes=0,
        created_at=new_poll.created_at,
        options=opts,
        user_voted_option_id=None,
    )


@app.post("/api/polls/{poll_id}/vote", response_model=PollResponse, tags=["Polls"])
@limiter.limit("20/minute")
def vote_poll(
    request: Request,
    poll_id: int,
    vote_in: PollVoteRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Vote on a poll option with duplicate prevention."""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if not poll.is_active:
        raise HTTPException(status_code=400, detail="This poll has ended and is closed for voting")

    # Match option
    option = db.query(PollOption).filter(PollOption.id == vote_in.option_id, PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found in this poll")

    effective_token = vote_in.voter_token.strip()
    if current_user:
        effective_token = f"user-{current_user.id}"

    # Check existing vote
    existing_vote = db.query(PollVote).filter(
        PollVote.poll_id == poll_id,
        PollVote.voter_token == effective_token,
    ).first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted in this poll")

    # Record vote
    new_vote = PollVote(
        poll_id=poll_id,
        option_id=option.id,
        user_id=current_user.id if current_user else None,
        voter_token=effective_token,
    )
    db.add(new_vote)
    option.votes_count += 1
    poll.total_votes += 1
    db.commit()
    db.refresh(poll)

    opts = []
    for o in poll.options:
        pct = round((o.votes_count / poll.total_votes * 100), 1) if poll.total_votes > 0 else 0.0
        opts.append(PollOptionResponse(
            id=o.id,
            text=o.text,
            votes_count=o.votes_count,
            percentage=pct,
        ))

    return PollResponse(
        id=poll.id,
        question=poll.question,
        description=poll.description,
        category=poll.category,
        author_name=poll.author_name,
        is_active=poll.is_active,
        total_votes=poll.total_votes,
        created_at=poll.created_at,
        options=opts,
        user_voted_option_id=option.id,
    )


# ============================================================
# ADMIN DASHBOARD & MANAGEMENT (Protected by Admin Token or Secret)
# ============================================================

@app.get("/api/admin/stats", response_model=AdminStatsResponse, tags=["Admin"])
def admin_get_stats(
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Retrieve full platform statistics for the Admin Dashboard."""
    total_thoughts = db.query(Thought).count()
    active_thoughts = db.query(Thought).filter(Thought.is_hidden == False).count()
    hidden_thoughts = db.query(Thought).filter(Thought.is_hidden == True).count()
    reported_thoughts = db.query(Thought).filter(Thought.reports > 0).count()
    total_reports = db.query(Report).count()

    total_polls = db.query(Poll).count()
    active_polls = db.query(Poll).filter(Poll.is_active == True).count()
    total_votes = db.query(func.coalesce(func.sum(Poll.total_votes), 0)).scalar()

    total_users = db.query(User).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    total_comments = db.query(Comment).count()

    # Category breakdown
    cat_rows = db.query(Thought.category, func.count(Thought.id)).group_by(Thought.category).all()
    category_breakdown = {cat: 0 for cat in VALID_CATEGORIES}
    for cat, count in cat_rows:
        category_breakdown[cat] = count

    return AdminStatsResponse(
        total_thoughts=total_thoughts,
        active_thoughts=active_thoughts,
        hidden_thoughts=hidden_thoughts,
        reported_thoughts=reported_thoughts,
        total_reports=total_reports,
        total_polls=total_polls,
        active_polls=active_polls,
        total_votes=int(total_votes),
        total_users=total_users,
        admin_users=admin_users,
        total_comments=total_comments,
        category_breakdown=category_breakdown,
    )


@app.get("/api/admin/thoughts", response_model=List[ThoughtAdminResponse], tags=["Admin"])
def admin_get_thoughts(
    status: Optional[str] = Query(None, description="all | flagged | hidden | active"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """List and filter thoughts with full administrative details."""
    query = db.query(Thought)
    if status == "flagged":
        query = query.filter(Thought.reports > 0)
    elif status == "hidden":
        query = query.filter(Thought.is_hidden == True)
    elif status == "active":
        query = query.filter(Thought.is_hidden == False)

    if category and category in VALID_CATEGORIES:
        query = query.filter(Thought.category == category)

    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter((Thought.content.ilike(q)) | (Thought.author_name.ilike(q)))

    thoughts = query.order_by(Thought.created_at.desc()).all()
    results = []
    for t in thoughts:
        results.append(
            ThoughtAdminResponse(
                id=t.id,
                content=t.content,
                category=t.category,
                likes=t.likes,
                reports=t.reports,
                is_approved=t.is_approved,
                is_hidden=t.is_hidden,
                created_at=t.created_at,
                author_name=t.author_name,
                is_anonymous=t.is_anonymous,
                user_id=t.user_id,
                comments_count=len(t.comments) if hasattr(t, "comments") else 0,
            )
        )
    return results


@app.put("/api/admin/thoughts/{thought_id}", response_model=ThoughtAdminResponse, tags=["Admin"])
def admin_edit_thought(
    thought_id: int,
    thought_in: ThoughtUpdate,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Edit thought content, category, or status."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    if thought_in.content is not None:
        content = thought_in.content.strip()
        if len(content) < settings.min_thought_length or len(content) > settings.max_thought_length:
            raise HTTPException(status_code=400, detail="Invalid thought content length")
        thought.content = content

    if thought_in.category is not None:
        if thought_in.category not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        thought.category = thought_in.category

    if thought_in.is_hidden is not None:
        thought.is_hidden = thought_in.is_hidden

    if thought_in.is_approved is not None:
        thought.is_approved = thought_in.is_approved

    db.commit()
    db.refresh(thought)
    return ThoughtAdminResponse(
        id=thought.id,
        content=thought.content,
        category=thought.category,
        likes=thought.likes,
        reports=thought.reports,
        is_approved=thought.is_approved,
        is_hidden=thought.is_hidden,
        created_at=thought.created_at,
        author_name=thought.author_name,
        is_anonymous=thought.is_anonymous,
        user_id=thought.user_id,
        comments_count=len(thought.comments) if hasattr(thought, "comments") else 0,
    )


@app.delete("/api/admin/thoughts/{thought_id}", response_model=MessageResponse, tags=["Admin"])
def admin_delete_thought(
    thought_id: int,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a thought, its reports, and comments."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    db.delete(thought)
    db.commit()
    return MessageResponse(message=f"Thought #{thought_id} deleted permanently.")


@app.delete("/api/admin/thoughts/{thought_id}/reports", response_model=MessageResponse, tags=["Admin"])
def admin_clear_thought_reports(
    thought_id: int,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Clear reports counter and delete report records for a thought."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    db.query(Report).filter(Report.thought_id == thought_id).delete()
    thought.reports = 0
    db.commit()
    return MessageResponse(message=f"Reports cleared for thought #{thought_id}.")


@app.get("/api/admin/reports", response_model=List[ReportResponse], tags=["Admin"])
def admin_get_reports(
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """List all reports with attached thought context."""
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    results = []
    for r in reports:
        thought = db.query(Thought).filter(Thought.id == r.thought_id).first()
        results.append(
            ReportResponse(
                id=r.id,
                thought_id=r.thought_id,
                reason=r.reason,
                created_at=r.created_at,
                thought_content=thought.content if thought else "[Deleted]",
                thought_category=thought.category if thought else "Unknown",
            )
        )
    return results


@app.delete("/api/admin/reports/{report_id}", response_model=MessageResponse, tags=["Admin"])
def admin_dismiss_report(
    report_id: int,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Dismiss a single report."""
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    thought = db.query(Thought).filter(Thought.id == rep.thought_id).first()
    if thought and thought.reports > 0:
        thought.reports -= 1
    db.delete(rep)
    db.commit()
    return MessageResponse(message=f"Report #{report_id} dismissed.")


@app.get("/api/admin/polls", response_model=List[PollResponse], tags=["Admin"])
def admin_get_polls(
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """List all polls with administrative breakdown."""
    polls = db.query(Poll).order_by(Poll.created_at.desc()).all()
    results = []
    for p in polls:
        total = p.total_votes
        opts = [
            PollOptionResponse(
                id=o.id,
                text=o.text,
                votes_count=o.votes_count,
                percentage=round((o.votes_count / total * 100), 1) if total > 0 else 0.0,
            )
            for o in p.options
        ]
        results.append(
            PollResponse(
                id=p.id,
                question=p.question,
                description=p.description,
                category=p.category,
                author_name=p.author_name,
                is_active=p.is_active,
                total_votes=p.total_votes,
                created_at=p.created_at,
                options=opts,
                user_voted_option_id=None,
            )
        )
    return results


@app.put("/api/admin/polls/{poll_id}", response_model=PollResponse, tags=["Admin"])
def admin_update_poll(
    poll_id: int,
    poll_in: PollUpdate,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Edit or toggle poll active status."""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    if poll_in.question is not None:
        poll.question = poll_in.question.strip()
    if poll_in.description is not None:
        poll.description = poll_in.description.strip()
    if poll_in.category is not None:
        poll.category = poll_in.category
    if poll_in.is_active is not None:
        poll.is_active = poll_in.is_active

    db.commit()
    db.refresh(poll)

    total = poll.total_votes
    opts = [
        PollOptionResponse(
            id=o.id,
            text=o.text,
            votes_count=o.votes_count,
            percentage=round((o.votes_count / total * 100), 1) if total > 0 else 0.0,
        )
        for o in poll.options
    ]
    return PollResponse(
        id=poll.id,
        question=poll.question,
        description=poll.description,
        category=poll.category,
        author_name=poll.author_name,
        is_active=poll.is_active,
        total_votes=poll.total_votes,
        created_at=poll.created_at,
        options=opts,
        user_voted_option_id=None,
    )


@app.delete("/api/admin/polls/{poll_id}", response_model=MessageResponse, tags=["Admin"])
def admin_delete_poll(
    poll_id: int,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a poll, options, and recorded votes."""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    db.delete(poll)
    db.commit()
    return MessageResponse(message=f"Poll #{poll_id} deleted permanently.")


@app.get("/api/admin/users", response_model=List[UserResponse], tags=["Admin"])
def admin_get_users(
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """List all registered users."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@app.patch("/api/admin/users/{user_id}/role", response_model=UserResponse, tags=["Admin"])
def admin_change_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Promote or demote user role (user | admin)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role_in.role
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@app.patch("/api/admin/users/{user_id}/status", response_model=UserResponse, tags=["Admin"])
def admin_change_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Suspend or activate user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@app.delete("/api/admin/users/{user_id}", response_model=MessageResponse, tags=["Admin"])
def admin_delete_user(
    user_id: int,
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Delete a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return MessageResponse(message=f"User #{user_id} deleted successfully.")


# ============================================================
# BACKWARD-COMPATIBLE MODERATION ENDPOINTS
# ============================================================

def verify_moderator_legacy(x_moderator_secret: str = Header(...)):
    if x_moderator_secret != settings.moderator_secret:
        raise HTTPException(status_code=403, detail="Invalid moderator credentials")
    return True


@app.get(
    "/api/mod/thoughts",
    response_model=List[ThoughtAdminResponse],
    tags=["Moderation"],
)
def mod_get_all_thoughts(
    _: bool = Depends(verify_moderator_legacy),
    db: Session = Depends(get_db),
):
    """List all thoughts including hidden ones (moderator legacy)."""
    thoughts = db.query(Thought).order_by(Thought.created_at.desc()).all()
    results = []
    for t in thoughts:
        results.append(
            ThoughtAdminResponse(
                id=t.id,
                content=t.content,
                category=t.category,
                likes=t.likes,
                reports=t.reports,
                is_approved=t.is_approved,
                is_hidden=t.is_hidden,
                created_at=t.created_at,
                author_name=t.author_name,
                is_anonymous=t.is_anonymous,
                user_id=t.user_id,
                comments_count=len(t.comments) if hasattr(t, "comments") else 0,
            )
        )
    return results


@app.get(
    "/api/mod/reports",
    response_model=List[ReportResponse],
    tags=["Moderation"],
)
def mod_get_reports(
    _: bool = Depends(verify_moderator_legacy),
    db: Session = Depends(get_db),
):
    """List all reports (moderator legacy)."""
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    results = []
    for r in reports:
        thought = db.query(Thought).filter(Thought.id == r.thought_id).first()
        results.append(
            ReportResponse(
                id=r.id,
                thought_id=r.thought_id,
                reason=r.reason,
                created_at=r.created_at,
                thought_content=thought.content if thought else "[Deleted]",
                thought_category=thought.category if thought else "Unknown",
            )
        )
    return results


@app.post(
    "/api/mod/thoughts/{thought_id}/hide",
    response_model=MessageResponse,
    tags=["Moderation"],
)
def mod_hide_thought(
    thought_id: int,
    _: bool = Depends(verify_moderator_legacy),
    db: Session = Depends(get_db),
):
    """Hide a thought from public feed (moderator legacy)."""
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
    _: bool = Depends(verify_moderator_legacy),
    db: Session = Depends(get_db),
):
    """Restore a hidden thought (moderator legacy)."""
    thought = db.query(Thought).filter(Thought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    thought.is_hidden = False
    db.commit()
    return MessageResponse(message=f"Thought {thought_id} has been restored.")
