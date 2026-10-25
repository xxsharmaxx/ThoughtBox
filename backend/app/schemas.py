"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any


# --- User & Auth Schemas ---

class UserRegister(BaseModel):
    """Schema for user account registration."""
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$", description="Alphanumeric username")
    email: str = Field(..., min_length=5, max_length=100, description="Email address")
    password: str = Field(..., min_length=6, max_length=100, description="Account password")
    full_name: Optional[str] = Field(None, max_length=100)
    roll_number: Optional[str] = Field(None, max_length=50, description="Student Roll Number or Campus ID")
    avatar: Optional[str] = Field("avatar-scholar", max_length=50)
    role: Optional[str] = Field("user", description="Account role: user or admin")


class UserLogin(BaseModel):
    """Schema for user login."""
    username_or_email: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Password")


class UserResponse(BaseModel):
    """Public user profile response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    roll_number: Optional[str] = None
    role: str
    avatar: str
    is_active: bool
    created_at: datetime


class AuthTokenResponse(BaseModel):
    """Response containing auth token and user profile."""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class UserProfileUpdate(BaseModel):
    """Schema for updating current user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    avatar: Optional[str] = Field(None, max_length=50)
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=6, max_length=100)


class UserRoleUpdate(BaseModel):
    """Schema for admin updating a user's role."""
    role: str = Field(..., pattern=r"^(user|admin)$")


class UserStatusUpdate(BaseModel):
    """Schema for admin updating a user's active status."""
    is_active: bool


# --- Thought schemas ---

class ThoughtCreate(BaseModel):
    """Schema for creating a new thought."""
    content: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="The thought content (3–1000 characters)",
    )
    category: str = Field(
        ...,
        description="Category of the thought",
    )
    is_anonymous: bool = Field(True, description="Whether to hide author username")


class ThoughtUpdate(BaseModel):
    """Schema for editing an existing thought (admin or author)."""
    content: Optional[str] = Field(None, min_length=3, max_length=1000)
    category: Optional[str] = None
    is_hidden: Optional[bool] = None
    is_approved: Optional[bool] = None


class ThoughtResponse(BaseModel):
    """Schema for returning a thought to the public client."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    category: str
    likes: int
    created_at: datetime
    author_name: Optional[str] = "Anonymous"
    is_anonymous: bool = True
    comments_count: int = 0


class ThoughtAdminResponse(BaseModel):
    """Schema for returning a thought to moderators/admins."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    category: str
    likes: int
    reports: int
    is_approved: bool
    is_hidden: bool
    created_at: datetime
    author_name: Optional[str] = "Anonymous"
    is_anonymous: bool = True
    user_id: Optional[int] = None
    comments_count: int = 0


# --- Report schemas ---

class ReportCreate(BaseModel):
    """Schema for reporting a thought."""
    reason: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional reason for reporting",
    )


class ReportResponse(BaseModel):
    """Schema for returning a report to moderators/admins."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    thought_id: int
    reason: Optional[str]
    created_at: datetime
    thought_content: Optional[str] = None
    thought_category: Optional[str] = None


# --- Poll schemas ---

class PollOptionCreate(BaseModel):
    """Schema for creating a single poll option."""
    text: str = Field(..., min_length=1, max_length=200)


class PollOptionResponse(BaseModel):
    """Schema for returning a poll option."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    votes_count: int
    percentage: float = 0.0


class PollCreate(BaseModel):
    """Schema for creating a new community poll."""
    question: str = Field(..., min_length=5, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(..., description="Category for the poll")
    options: List[str] = Field(..., min_length=2, max_length=6, description="List of 2 to 6 option choices")
    is_anonymous: bool = Field(False, description="Whether to show creator name or anonymous")


class PollUpdate(BaseModel):
    """Schema for updating a poll."""
    question: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class PollVoteRequest(BaseModel):
    """Schema for submitting a vote."""
    option_id: int
    voter_token: str = Field(..., min_length=4, max_length=64, description="Unique client voter token")


class PollResponse(BaseModel):
    """Schema for returning a complete poll with options and user vote state."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    description: Optional[str] = None
    category: str
    author_name: Optional[str] = "Campus Community"
    is_active: bool
    total_votes: int
    created_at: datetime
    options: List[PollOptionResponse]
    user_voted_option_id: Optional[int] = None


# --- Comment schemas ---

class CommentCreate(BaseModel):
    """Schema for commenting on a thought."""
    content: str = Field(..., min_length=1, max_length=500)
    author_name: Optional[str] = Field(None, max_length=50)


class CommentResponse(BaseModel):
    """Schema for returning a comment."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    thought_id: int
    author_name: str
    content: str
    created_at: datetime


# --- Admin Stats schemas ---

class AdminStatsResponse(BaseModel):
    """Overview statistics for the admin dashboard."""
    total_thoughts: int
    active_thoughts: int
    hidden_thoughts: int
    reported_thoughts: int
    total_reports: int
    total_polls: int
    active_polls: int
    total_votes: int
    total_users: int
    admin_users: int
    total_comments: int
    category_breakdown: Dict[str, int]


# --- General schemas ---

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    database: str
