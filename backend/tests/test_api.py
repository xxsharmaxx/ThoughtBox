"""Tests for ThoughtBox API using an in-memory SQLite database."""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Override settings BEFORE importing the app
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["MODERATOR_SECRET"] = "test-secret"

from app.database import Base, get_db
from app.main import app, limiter

# --- Disable rate limiting in tests ---
limiter.enabled = False

# --- Test DB setup ---
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test and drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)

MOD_HEADER = {"X-Moderator-Secret": "test-secret"}


# ============================================================
# Health
# ============================================================

class TestHealth:
    def test_health_endpoint(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


# ============================================================
# Thoughts CRUD
# ============================================================

class TestThoughts:
    def _create_thought(self, content="Test thought", category="Academics"):
        return client.post(
            "/api/thoughts",
            json={"content": content, "category": category},
        )

    def test_create_thought(self):
        resp = self._create_thought()
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Test thought"
        assert data["category"] == "Academics"
        assert data["likes"] == 0
        assert "id" in data

    def test_create_thought_invalid_category(self):
        resp = self._create_thought(category="InvalidCategory")
        assert resp.status_code == 400

    def test_create_thought_too_short(self):
        resp = self._create_thought(content="ab")
        assert resp.status_code == 422  # Pydantic validation

    def test_get_thoughts_empty(self):
        resp = client.get("/api/thoughts")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_thoughts(self):
        self._create_thought("First thought")
        self._create_thought("Second thought")
        resp = client.get("/api/thoughts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        # Both thoughts should be present (order may vary with SQLite)
        contents = {t["content"] for t in data}
        assert "First thought" in contents
        assert "Second thought" in contents

    def test_filter_by_category(self):
        self._create_thought("Academic thought", "Academics")
        self._create_thought("Campus thought", "Campus Life")
        resp = client.get("/api/thoughts?category=Academics")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["category"] == "Academics"

    def test_filter_invalid_category(self):
        resp = client.get("/api/thoughts?category=Nonexistent")
        assert resp.status_code == 400


# ============================================================
# Likes
# ============================================================

class TestLikes:
    def test_like_thought(self):
        create_resp = client.post(
            "/api/thoughts",
            json={"content": "Likeable thought", "category": "Appreciation"},
        )
        thought_id = create_resp.json()["id"]
        resp = client.post(f"/api/thoughts/{thought_id}/like")
        assert resp.status_code == 200
        assert "Liked" in resp.json()["message"]

    def test_like_nonexistent(self):
        resp = client.post("/api/thoughts/9999/like")
        assert resp.status_code == 404


# ============================================================
# Reports
# ============================================================

class TestReports:
    def test_report_thought(self):
        create_resp = client.post(
            "/api/thoughts",
            json={"content": "Reportable thought", "category": "Other"},
        )
        thought_id = create_resp.json()["id"]
        resp = client.post(
            f"/api/thoughts/{thought_id}/report",
            json={"reason": "Inappropriate content"},
        )
        assert resp.status_code == 201

    def test_report_nonexistent(self):
        resp = client.post(
            "/api/thoughts/9999/report",
            json={"reason": "Test"},
        )
        assert resp.status_code == 404


# ============================================================
# Moderation
# ============================================================

class TestModeration:
    def test_mod_requires_secret(self):
        resp = client.get("/api/mod/thoughts")
        assert resp.status_code == 422  # Missing header

    def test_mod_wrong_secret(self):
        resp = client.get(
            "/api/mod/thoughts",
            headers={"X-Moderator-Secret": "wrong"},
        )
        assert resp.status_code == 403

    def test_mod_get_thoughts(self):
        client.post(
            "/api/thoughts",
            json={"content": "Visible thought", "category": "Academics"},
        )
        resp = client.get("/api/mod/thoughts", headers=MOD_HEADER)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        # Admin response includes moderation fields
        assert "is_hidden" in data[0]
        assert "reports" in data[0]

    def test_mod_hide_and_unhide(self):
        create_resp = client.post(
            "/api/thoughts",
            json={"content": "To be hidden", "category": "Other"},
        )
        thought_id = create_resp.json()["id"]

        # Hide
        resp = client.post(f"/api/mod/thoughts/{thought_id}/hide", headers=MOD_HEADER)
        assert resp.status_code == 200

        # Should not appear in public feed
        feed = client.get("/api/thoughts")
        assert len(feed.json()) == 0

        # Unhide
        resp = client.post(f"/api/mod/thoughts/{thought_id}/unhide", headers=MOD_HEADER)
        assert resp.status_code == 200

        # Should reappear
        feed = client.get("/api/thoughts")
        assert len(feed.json()) == 1

    def test_mod_get_reports(self):
        # Create a thought
        create_resp = client.post(
            "/api/thoughts",
            json={"content": "Report me", "category": "Other"},
        )
        assert create_resp.status_code == 201
        thought_id = create_resp.json()["id"]

        # Report it
        client.post(
            f"/api/thoughts/{thought_id}/report",
            json={"reason": "Bad content"},
        )

        # Get reports
        resp = client.get("/api/mod/reports", headers=MOD_HEADER)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["reason"] == "Bad content"


# ============================================================
# User Authentication & Profiles
# ============================================================

class TestAuth:
    def test_register_and_login(self):
        # Register
        reg_resp = client.post(
            "/api/auth/register",
            json={
                "username": "student_sam",
                "email": "sam@campus.edu",
                "password": "password123",
                "full_name": "Sam Student",
            },
        )
        assert reg_resp.status_code == 201
        data = reg_resp.json()
        assert data["user"]["username"] == "student_sam"
        assert "access_token" in data
        token = data["access_token"]

        # Profile /me
        me_resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == "student_sam"

        # Login
        login_resp = client.post(
            "/api/auth/login",
            json={"username_or_email": "sam@campus.edu", "password": "password123"},
        )
        assert login_resp.status_code == 200
        assert "access_token" in login_resp.json()

    def test_register_duplicate(self):
        client.post(
            "/api/auth/register",
            json={"username": "alice", "email": "alice@test.com", "password": "secretpass"},
        )
        resp = client.post(
            "/api/auth/register",
            json={"username": "alice", "email": "alice2@test.com", "password": "secretpass"},
        )
        assert resp.status_code == 400

    def test_login_wrong_password(self):
        client.post(
            "/api/auth/register",
            json={"username": "bob", "email": "bob@test.com", "password": "secretpass"},
        )
        resp = client.post(
            "/api/auth/login",
            json={"username_or_email": "bob", "password": "wrongpassword"},
        )
        assert resp.status_code == 401


# ============================================================
# Admin Dashboard & Management
# ============================================================

class TestAdminManagement:
    def _create_admin_token(self):
        reg = client.post(
            "/api/auth/register",
            json={"username": "site_admin", "email": "admin@campus.edu", "password": "adminpassword"},
        )
        token = reg.json()["access_token"]
        # Promote to admin via moderator secret
        user_id = reg.json()["user"]["id"]
        client.patch(
            f"/api/admin/users/{user_id}/role",
            headers=MOD_HEADER,
            json={"role": "admin"},
        )
        return token

    def test_admin_stats(self):
        client.post("/api/thoughts", json={"content": "Stats thought", "category": "Campus Life"})
        resp = client.get("/api/admin/stats", headers=MOD_HEADER)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_thoughts"] >= 1
        assert "category_breakdown" in data

    def test_admin_edit_and_delete_thought(self):
        # Create thought
        create = client.post("/api/thoughts", json={"content": "Old Content", "category": "Other"})
        t_id = create.json()["id"]

        # Edit thought
        edit_resp = client.put(
            f"/api/admin/thoughts/{t_id}",
            headers=MOD_HEADER,
            json={"content": "Updated Content by Admin", "category": "Academics"},
        )
        assert edit_resp.status_code == 200
        assert edit_resp.json()["content"] == "Updated Content by Admin"
        assert edit_resp.json()["category"] == "Academics"

        # Delete thought
        del_resp = client.delete(f"/api/admin/thoughts/{t_id}", headers=MOD_HEADER)
        assert del_resp.status_code == 200

        # Verify gone
        feed = client.get("/api/thoughts")
        assert not any(t["id"] == t_id for t in feed.json())


# ============================================================
# Polls & Voting
# ============================================================

class TestPolls:
    def test_create_and_vote_poll(self):
        # Create poll
        create_resp = client.post(
            "/api/polls",
            json={
                "question": "Should library hours be extended 24/7?",
                "category": "Campus Life",
                "options": ["Yes, definitely", "No, unnecessary", "Only during exams"],
            },
        )
        assert create_resp.status_code == 201
        poll = create_resp.json()
        assert poll["question"] == "Should library hours be extended 24/7?"
        assert len(poll["options"]) == 3
        poll_id = poll["id"]
        opt_id = poll["options"][0]["id"]

        # Vote
        vote_resp = client.post(
            f"/api/polls/{poll_id}/vote",
            json={"option_id": opt_id, "voter_token": "client-uuid-1234"},
        )
        assert vote_resp.status_code == 200
        updated = vote_resp.json()
        assert updated["total_votes"] == 1
        assert updated["user_voted_option_id"] == opt_id
        assert updated["options"][0]["votes_count"] == 1

        # Prevent duplicate vote
        dup_resp = client.post(
            f"/api/polls/{poll_id}/vote",
            json={"option_id": opt_id, "voter_token": "client-uuid-1234"},
        )
        assert dup_resp.status_code == 400

    def test_admin_delete_poll(self):
        create_resp = client.post(
            "/api/polls",
            json={
                "question": "Poll to be deleted?",
                "category": "Suggestions",
                "options": ["Option A", "Option B"],
            },
        )
        poll_id = create_resp.json()["id"]
        del_resp = client.delete(f"/api/admin/polls/{poll_id}", headers=MOD_HEADER)
        assert del_resp.status_code == 200


# ============================================================
# Comments
# ============================================================

class TestComments:
    def test_thought_comments(self):
        create_t = client.post("/api/thoughts", json={"content": "Thought for discussion", "category": "Academics"})
        t_id = create_t.json()["id"]

        comment_resp = client.post(
            f"/api/thoughts/{t_id}/comments",
            json={"content": "Great thought! I totally agree.", "author_name": "Fellow Student"},
        )
        assert comment_resp.status_code == 201
        assert comment_resp.json()["content"] == "Great thought! I totally agree."

        # Fetch comments
        get_comments = client.get(f"/api/thoughts/{t_id}/comments")
        assert get_comments.status_code == 200
        assert len(get_comments.json()) == 1
