"""SQLAlchemy models for ThoughtBox."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, func
from .database import Base


class Thought(Base):
    """A thought posted anonymously by a campus community member."""

    __tablename__ = "thoughts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    likes = Column(Integer, default=0, nullable=False)
    reports = Column(Integer, default=0, nullable=False)
    is_approved = Column(Boolean, default=True, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Report(Base):
    """A report filed against a thought."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    thought_id = Column(Integer, nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
