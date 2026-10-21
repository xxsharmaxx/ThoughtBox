# 💭 ThoughtBox — Anonymous Campus Thoughts Platform

> A platform where students and teachers can anonymously share thoughts, suggestions, appreciation, and campus feedback.

Built as an MCA mini-project demonstrating **Frontend & Backend Development**, **Docker & Containerization**, and **DevOps & CI/CD**.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start (Windows PowerShell)](#-quick-start-windows-powershell)
- [Environment Configuration](#-environment-configuration)
- [Build & Run with Docker Compose](#-build--run-with-docker-compose)
- [Using the Application](#-using-the-application)
- [API Reference](#-api-reference)
- [Testing the API](#-testing-the-api)
- [Important Docker Commands](#-important-docker-commands)
- [Verify PostgreSQL Persistence](#-verify-postgresql-persistence)
- [GitHub Actions CI/CD](#-github-actions-cicd)
- [Anonymity & Safety](#-anonymity--safety)
- [Limitations & Future Enhancements](#-limitations--future-enhancements)
- [Screenshots](#-screenshots)
- [Viva Questions & Answers](#-viva-questions--answers)

---

## 🎯 Project Overview

**ThoughtBox** is an anonymous campus community platform that allows students and faculty to:

- Share thoughts, suggestions, and appreciation anonymously
- Browse and filter community thoughts by category
- Like thoughts to show support
- Report inappropriate content
- Moderate posts through a protected admin interface

The project covers three core areas:
1. **Full-Stack Development** — React (TypeScript) frontend + FastAPI (Python) backend + PostgreSQL
2. **Containerization** — Docker and Docker Compose for local deployment
3. **DevOps & CI/CD** — GitHub Actions for automated testing, optional Jenkinsfile

---

## 🛠 Technology Stack

| Layer        | Technology                    |
|--------------|-------------------------------|
| Frontend     | React 19, Vite, TypeScript    |
| Styling      | Vanilla CSS (responsive)      |
| Backend      | Python 3.11, FastAPI          |
| Database     | PostgreSQL 16                 |
| Containers   | Docker, Docker Compose        |
| CI/CD        | GitHub Actions                |
| Web Server   | Nginx (production frontend)   |
| Version Control | Git, GitHub               |

---

## 🏗 Architecture

```
┌─────────────────┐     HTTP     ┌─────────────────┐     SQL     ┌──────────────┐
│                 │   (port 80)  │                 │  (port 5432) │              │
│   Frontend      │◄────────────►│   Backend       │◄────────────►│  PostgreSQL  │
│   (React/Nginx) │              │   (FastAPI)     │              │              │
│   Port 3000     │              │   Port 8000     │              │   Port 5432  │
│                 │              │                 │              │              │
└─────────────────┘              └─────────────────┘              └──────────────┘
     Container                        Container                      Container
                                                                   + Named Volume
```

- **Frontend container**: Nginx serves the production React build and proxies nothing — the browser calls the backend directly.
- **Backend container**: FastAPI handles REST API requests. Waits for PostgreSQL health check before starting.
- **Database container**: PostgreSQL with a named volume (`pgdata`) for data persistence across container restarts.

---

## ✨ Features

| Feature                | Description                                              |
|------------------------|----------------------------------------------------------|
| 📝 Thought Feed        | View approved thoughts, newest first                     |
| ➕ Create Thought       | Submit a thought with category selection                 |
| 🏷️ Categories          | Academics, Suggestions, Appreciation, Campus Life, Other |
| 🔒 Anonymous Posting   | No names, emails, or IDs collected or displayed          |
| ❤️ Likes               | Like thoughts with duplicate prevention per session      |
| 🚩 Report              | Report inappropriate content with optional reason        |
| 🛡️ Moderation Panel   | Protected interface to review reports and hide posts     |
| 🔍 Category Filtering  | Filter feed by category                                  |
| 📱 Responsive Design   | Works on desktop and mobile                              |
| ⏳ Loading States       | Spinners, empty states, error messages                   |
| 🔐 Rate Limiting       | In-memory rate limiting to prevent abuse                 |
| 🐳 Full Docker Setup   | One-command deployment with Docker Compose               |
| ✅ CI/CD Pipeline       | Automated tests on push/PR via GitHub Actions            |

---

## 📁 Project Structure

```
ThoughtBox/
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── ThoughtFeed.tsx
│   │   │   ├── ThoughtCard.tsx
│   │   │   ├── CreateThoughtModal.tsx
│   │   │   └── ModPanel.tsx
│   │   ├── api.ts              # API client layer
│   │   ├── App.tsx             # Root component
│   │   ├── main.tsx            # React entry point
│   │   ├── index.css           # Global styles
│   │   └── vite-env.d.ts       # Vite type declarations
│   ├── Dockerfile              # Multi-stage: Node build → Nginx serve
│   ├── nginx.conf              # SPA routing configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # API endpoints
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── database.py         # Database connection
│   │   └── config.py           # Environment settings
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py         # API tests
│   ├── Dockerfile
│   └── requirements.txt
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions workflow
│
├── docs/
│   └── screenshots/
│       └── README.md           # Screenshot capture guide
│
├── compose.yaml                # Docker Compose configuration
├── .env.example                # Environment template
├── .gitignore
├── Jenkinsfile                 # Optional Jenkins pipeline
└── README.md                   # This file
```

---

## ⚙️ Prerequisites

Ensure these are installed on your Windows machine:

- **Docker Desktop** (v4.0+) — [Download](https://www.docker.com/products/docker-desktop/)
- **Git** — [Download](https://git-scm.com/downloads)
- **Node.js** (v18+, only for local development) — [Download](https://nodejs.org/)
- **Python** (v3.10+, only for local development) — [Download](https://python.org/)

---

## 🚀 Quick Start (Windows PowerShell)

Open PowerShell and run these commands:

```powershell
# 1. Navigate to the project
cd "C:\Users\DHEERA SHARMA\Desktop\Build-Box"

# 2. Create .env from the example template
Copy-Item .env.example .env

# 3. (Optional) Edit .env to set a custom moderator secret
# notepad .env

# 4. Build and start all services
docker compose up -d --build

# 5. Wait for services to be healthy (about 30-60 seconds)
docker compose ps

# 6. Open in browser
Start-Process "http://localhost:3000"

# 7. View the API docs
Start-Process "http://localhost:8000/docs"
```

---

## 🔧 Environment Configuration

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` to customize:

```env
# PostgreSQL credentials
POSTGRES_USER=thoughtbox
POSTGRES_PASSWORD=thoughtbox        # Change in production!
POSTGRES_DB=thoughtbox

# Moderator secret — used to access the moderation panel
MODERATOR_SECRET=change-me-in-production    # CHANGE THIS!

# Frontend API URL — how the browser reaches the backend
VITE_API_URL=http://localhost:8000
```

> ⚠️ **Never commit `.env` to GitHub.** The `.gitignore` already excludes it.

---

## 🐳 Build & Run with Docker Compose

```powershell
# Build and start all containers
docker compose up -d --build

# Check status (wait until all show "healthy" or "running")
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Stop all services
docker compose down

# Stop and remove volumes (deletes all data!)
docker compose down -v
```

### Service URLs

| Service  | URL                           |
|----------|-------------------------------|
| Frontend | http://localhost:3000          |
| Backend  | http://localhost:8000          |
| API Docs | http://localhost:8000/docs     |
| Database | localhost:5432 (internal)      |

---

## 🖥 Using the Application

### Posting a Thought
1. Open http://localhost:3000
2. Click the **"Share a Thought"** button (bottom-right)
3. Write your thought (3–1000 characters)
4. Select a category
5. Click **"Post Anonymously"**

### Browsing & Filtering
- Use the **category chips** at the top to filter by category
- Click **"All"** to see all thoughts

### Liking & Reporting
- Click the **❤️ heart** button to like a thought
- Click the **🚩 flag** button to report inappropriate content

### Moderation
1. Click **"Moderate"** in the header
2. Enter the moderator secret (from your `.env` file)
3. View all thoughts and reports
4. **Hide/Unhide** posts as needed

---

## 📡 API Reference

### Public Endpoints

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/health`                    | Health check                   |
| GET    | `/api/thoughts`                  | List approved thoughts         |
| GET    | `/api/thoughts?category=X`       | Filter by category             |
| POST   | `/api/thoughts`                  | Create a new thought           |
| POST   | `/api/thoughts/{id}/like`        | Like a thought                 |
| POST   | `/api/thoughts/{id}/report`      | Report a thought               |

### Moderator Endpoints (require `X-Moderator-Secret` header)

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/mod/thoughts`               | List all thoughts (incl. hidden) |
| GET    | `/api/mod/reports`                | List all reports               |
| POST   | `/api/mod/thoughts/{id}/hide`     | Hide a thought                 |
| POST   | `/api/mod/thoughts/{id}/unhide`   | Unhide a thought               |

---

## 🧪 Testing the API

### Using PowerShell (Invoke-RestMethod)

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:8000/api/health"

# Create a thought
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts" -Method POST `
  -ContentType "application/json" `
  -Body '{"content":"This campus library is amazing!","category":"Appreciation"}'

# Get all thoughts
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts"

# Filter by category
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts?category=Appreciation"

# Like a thought (replace 1 with actual ID)
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts/1/like" -Method POST

# Report a thought
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts/1/report" -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"Inappropriate content"}'

# Moderator: get all thoughts (replace secret)
Invoke-RestMethod -Uri "http://localhost:8000/api/mod/thoughts" `
  -Headers @{"X-Moderator-Secret"="change-me-in-production"}

# Moderator: hide a post
Invoke-RestMethod -Uri "http://localhost:8000/api/mod/thoughts/1/hide" -Method POST `
  -Headers @{"X-Moderator-Secret"="change-me-in-production"}
```

### Using curl (Git Bash or WSL)

```bash
# Health check
curl http://localhost:8000/api/health

# Create a thought
curl -X POST http://localhost:8000/api/thoughts \
  -H "Content-Type: application/json" \
  -d '{"content":"Great campus event today!","category":"Campus Life"}'

# Get all thoughts
curl http://localhost:8000/api/thoughts

# Like thought ID 1
curl -X POST http://localhost:8000/api/thoughts/1/like

# Moderator: list reports
curl http://localhost:8000/api/mod/reports \
  -H "X-Moderator-Secret: change-me-in-production"
```

### Running Backend Unit Tests

```powershell
cd backend
pip install -r requirements.txt
$env:DATABASE_URL="sqlite://"
$env:MODERATOR_SECRET="test-secret"
python -m pytest tests/ -v
```

---

## 🐋 Important Docker Commands

```powershell
# Build and start
docker compose up -d --build

# Check container status
docker compose ps

# View logs (all services)
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Stop all containers
docker compose down

# Stop and remove everything including volumes
docker compose down -v

# Rebuild a single service
docker compose build backend
docker compose up -d backend

# Enter a running container
docker compose exec backend bash
docker compose exec db psql -U thoughtbox

# List images
docker images | findstr thoughtbox

# List volumes
docker volume ls | findstr pgdata
```

---

## 💾 Verify PostgreSQL Persistence

Prove that data survives container recreation:

```powershell
# 1. Create a thought
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts" -Method POST `
  -ContentType "application/json" `
  -Body '{"content":"This thought will survive restart!","category":"Other"}'

# 2. Verify it exists
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts"

# 3. Stop and recreate containers (NOT volumes)
docker compose down
docker compose up -d

# 4. Wait for health checks, then verify data is still there
Start-Sleep -Seconds 15
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts"
# ✅ The thought should still appear!

# 5. To verify destruction, use -v flag
docker compose down -v
docker compose up -d --build
Start-Sleep -Seconds 15
Invoke-RestMethod -Uri "http://localhost:8000/api/thoughts"
# ✅ Now the database is empty (volume was removed)
```

---

## 🔄 GitHub Actions CI/CD

The CI pipeline (`.github/workflows/ci.yml`) runs automatically on every push and pull request to `main`.

### What it does:

| Job             | Steps                                                |
|-----------------|------------------------------------------------------|
| Backend Tests   | Install Python → Install deps → Run pytest (SQLite)  |
| Frontend Build  | Install Node → npm ci → npm run build                |

### How it works:
1. Push code to GitHub
2. GitHub Actions automatically triggers the workflow
3. Backend tests run against an in-memory SQLite database
4. Frontend build is verified
5. If any step fails, the workflow fails and you get notified

### How to see it:
1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. View workflow runs and their status

### Optional Jenkins Pipeline:
A `Jenkinsfile` is included for educational purposes. It defines:
- Checkout → Backend Tests → Frontend Build → Docker Build
- Requires a configured Jenkins server to run

---

## 🔒 Anonymity & Safety

### What ThoughtBox does:
- ✅ Posts are displayed **without any author identity**
- ✅ No names, emails, or student IDs are collected for posting
- ✅ The moderator secret is **never exposed in frontend code**
- ✅ Rate limiting helps prevent spam abuse
- ✅ No raw IP addresses are stored in the database

### Important disclaimer:
> **Public anonymity does not guarantee absolute anonymity.** Hosting infrastructure, web servers, network devices, and cloud providers may process and log IP addresses, request metadata, and other technical information as part of normal operations. ThoughtBox provides **social anonymity** (other users cannot see who posted), not **technical anonymity** (immune to all forms of identification).

---

## 📈 Limitations & Future Enhancements

### Current Limitations
- No user authentication system
- In-memory rate limiting resets on server restart
- Like duplicate prevention is session-based (client-side), not IP-based
- No real-time updates (manual refresh needed)
- Moderation uses a shared secret, not individual admin accounts

### Potential Future Enhancements
- WebSocket-based real-time feed updates
- Optional anonymous user sessions for better duplicate prevention
- Full-text search across thoughts
- Sentiment analysis or word cloud visualization
- Multiple moderator accounts with audit logging
- Email notifications for reports
- Kubernetes deployment configuration
- Prometheus/Grafana monitoring

---

## 📸 Screenshots

See [`docs/screenshots/README.md`](docs/screenshots/README.md) for instructions on capturing screenshots of:

1. Thought Feed
2. Create Thought Modal
3. Category Filtering
4. Like & Report Actions
5. Moderator Login
6. Moderation Panel
7. Mobile Responsive View
8. Docker Desktop Containers
9. FastAPI Swagger Docs
10. Health Check Response

---

## 📝 Viva Questions & Answers

### Frontend

**Q: Why did you choose React with TypeScript?**
A: React provides a component-based architecture for building reusable UI elements. TypeScript adds type safety, catching errors at compile time and improving code maintainability. Together, they are industry-standard for modern web applications.

**Q: What is Vite and why use it over Create React App?**
A: Vite is a modern build tool that uses native ES modules for near-instant dev server startup and fast Hot Module Replacement (HMR). It's significantly faster than CRA's Webpack-based setup, especially for development.

**Q: How does the frontend communicate with the backend?**
A: The frontend uses the browser's `fetch` API to make HTTP requests to the FastAPI backend's REST endpoints. The API base URL is configured via the `VITE_API_URL` environment variable at build time.

### Backend

**Q: Why FastAPI over Flask or Django?**
A: FastAPI provides automatic request validation via Pydantic, auto-generated OpenAPI documentation (Swagger UI), native async support, and high performance. It's ideal for building REST APIs quickly with type safety.

**Q: How do you handle database connections?**
A: Using SQLAlchemy's session management with a dependency injection pattern. The `get_db` function yields a session per request and ensures it's closed after the request completes, preventing connection leaks.

**Q: How is the moderator authenticated?**
A: Moderator endpoints require an `X-Moderator-Secret` HTTP header that must match the `MODERATOR_SECRET` environment variable. This is a simple shared-secret approach suitable for a small-scale application.

**Q: What is rate limiting and how is it implemented?**
A: Rate limiting restricts how many requests a client can make in a time window. We use the `slowapi` library which tracks request counts in memory by client IP. This prevents spam without persisting IP addresses to the database.

### Database

**Q: Why PostgreSQL?**
A: PostgreSQL is a robust, production-grade relational database with excellent support for data integrity, concurrent access, and complex queries. It's the most popular open-source RDBMS for production applications.

**Q: How is data persisted across container restarts?**
A: Docker Compose defines a named volume (`pgdata`) that maps to PostgreSQL's data directory. Named volumes persist independently of container lifecycle — data survives `docker compose down` but is removed with `docker compose down -v`.

**Q: What is SQLAlchemy?**
A: SQLAlchemy is a Python ORM (Object Relational Mapper) that lets us define database tables as Python classes and interact with the database using Python objects instead of raw SQL, improving code readability and safety.

### Docker

**Q: What is Docker and why use it?**
A: Docker packages applications and their dependencies into lightweight containers that run consistently across any environment. It solves the "works on my machine" problem by ensuring identical behavior in development, testing, and production.

**Q: Explain your Docker Compose configuration.**
A: The `compose.yaml` defines three services: `db` (PostgreSQL with health check and named volume), `backend` (FastAPI, waits for DB health), and `frontend` (Nginx serving React build). Services communicate over Docker's internal network.

**Q: What is a multi-stage Docker build?**
A: The frontend Dockerfile uses two stages: a `build` stage (Node.js compiles the React app) and a `production` stage (Nginx serves the static files). This keeps the final image small by excluding Node.js and source code.

**Q: What are Docker volumes?**
A: Volumes provide persistent storage that exists outside the container's filesystem. Named volumes (like `pgdata`) survive container removal and recreation, making them essential for database persistence.

**Q: What is a Docker health check?**
A: A health check is a command Docker runs periodically to verify a container is working correctly. We use `pg_isready` for PostgreSQL and an HTTP request to `/api/health` for the backend. Other services use `depends_on: condition: service_healthy` to wait.

### DevOps & CI/CD

**Q: What is CI/CD?**
A: Continuous Integration (CI) automatically builds and tests code on every commit. Continuous Deployment (CD) automatically deploys passing builds. Our GitHub Actions workflow implements CI by running backend tests and frontend builds on every push.

**Q: What does the GitHub Actions workflow do?**
A: On every push/PR to `main`, it: (1) sets up Python and runs backend pytest against SQLite, and (2) sets up Node.js, installs dependencies, and verifies the frontend builds successfully. If either fails, the workflow fails.

**Q: What is a Jenkinsfile?**
A: A Jenkinsfile defines a CI/CD pipeline for Jenkins, an open-source automation server. It describes stages (checkout, test, build, deploy) in a declarative or scripted syntax. Jenkins reads and executes this file automatically.

**Q: How do environment variables protect secrets?**
A: Sensitive values (database passwords, moderator secrets) are stored in `.env` files or CI/CD secrets, never in source code. `.env` is excluded via `.gitignore`. In CI, secrets are injected as environment variables by the CI platform.

---

## 📄 License

This project was built as an academic mini-project for MCA coursework. Feel free to use it as a reference.
