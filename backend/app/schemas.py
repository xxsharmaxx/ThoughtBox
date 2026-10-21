"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


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


class ThoughtResponse(BaseModel):
    """Schema for returning a thought to the client."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    category: str
    likes: int
    created_at: datetime


class ThoughtAdminResponse(BaseModel):
    """Schema for returning a thought to moderators (includes moderation fields)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    category: str
    likes: int
    reports: int
    is_approved: bool
    is_hidden: bool
    created_at: datetime


# --- Report schemas ---

class ReportCreate(BaseModel):
    """Schema for reporting a thought."""
    reason: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional reason for reporting",
    )


class ReportResponse(BaseModel):
    """Schema for returning a report to moderators."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    thought_id: int
    reason: Optional[str]
    created_at: datetime


# --- General schemas ---

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    database: str
