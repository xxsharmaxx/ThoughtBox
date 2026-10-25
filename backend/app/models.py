"""SQLAlchemy models for ThoughtBox."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """Registered campus community member."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    roll_number = Column(String(50), nullable=True, index=True)
    role = Column(String(20), default="user", nullable=False)  # "user" | "admin"
    avatar = Column(String(50), default="avatar-1", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    thoughts = relationship("Thought", back_populates="author")
    polls = relationship("Poll", back_populates="author")


class Thought(Base):
    """A thought posted by a campus community member."""

    __tablename__ = "thoughts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    likes = Column(Integer, default=0, nullable=False)
    reports = Column(Integer, default=0, nullable=False)
    is_approved = Column(Boolean, default=True, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    is_anonymous = Column(Boolean, default=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    author_name = Column(String(50), nullable=True, default="Anonymous")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    author = relationship("User", back_populates="thoughts")
    reports_rel = relationship("Report", back_populates="thought", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="thought", cascade="all, delete-orphan")


class Report(Base):
    """A report filed against a thought."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    thought_id = Column(Integer, ForeignKey("thoughts.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    thought = relationship("Thought", back_populates="reports_rel")


class Poll(Base):
    """A community or campus poll."""

    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    author_name = Column(String(50), nullable=True, default="Anonymous")
    is_active = Column(Boolean, default=True, nullable=False)
    total_votes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    author = relationship("User", back_populates="polls")
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan", order_by="PollOption.id")
    votes = relationship("PollVote", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    """An option belonging to a poll."""

    __tablename__ = "poll_options"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(200), nullable=False)
    votes_count = Column(Integer, default=0, nullable=False)

    poll = relationship("Poll", back_populates="options")
    votes = relationship("PollVote", back_populates="option", cascade="all, delete-orphan")


class PollVote(Base):
    """A recorded vote in a poll for duplicate prevention."""

    __tablename__ = "poll_votes"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id", ondelete="CASCADE"), nullable=False, index=True)
    option_id = Column(Integer, ForeignKey("poll_options.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    voter_token = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    poll = relationship("Poll", back_populates="votes")
    option = relationship("PollOption", back_populates="votes")


class Comment(Base):
    """A community comment or discussion under a thought."""

    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    thought_id = Column(Integer, ForeignKey("thoughts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    author_name = Column(String(50), default="Anonymous", nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    thought = relationship("Thought", back_populates="comments")
