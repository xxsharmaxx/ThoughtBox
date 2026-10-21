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
