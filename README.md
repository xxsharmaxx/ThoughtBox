# 💭 ThoughtBox — Anonymous Campus Thoughts Platform

> A production-ready, containerized web platform for students and faculty to anonymously share thoughts, suggestions, appreciation, and feedback.
> Built as an MCA mini-project demonstrating **Full-Stack Development**, **Docker & Containerization**, **DevOps & CI/CD Pipelines**, and **Relational Database Management**.

---

## 📋 Table of Contents

1. [Project Overview & What We Do](#-project-overview--what-we-do)
2. [End-to-End System Workflow](#-end-to-end-system-workflow)
3. [Tools & Technologies Used (Detailed Breakdown)](#-tools--technologies-used-detailed-breakdown)
4. [Architecture Diagram](#-architecture-diagram)
5. [Docker Concepts Used (Deep Dive for Viva)](#-docker-concepts-used-deep-dive-for-viva)
6. [DevOps Concepts Used (Deep Dive for Viva)](#-devops-concepts-used-deep-dive-for-viva)
7. [CI/CD Pipelines (GitHub Actions & Jenkins)](#-cicd-pipelines-github-actions--jenkins)
8. [Quick Start & Running the Project](#-quick-start--running-the-project)
9. [API Reference](#-api-reference)
10. [Database Schema & Persistence](#-database-schema--persistence)
11. [Master Viva Questions & Answers (Cheat Sheet)](#-master-viva-questions--answers-cheat-sheet)

---

## 🎯 Project Overview & What We Do

### 1. The Core Problem
On college campuses, students often hesitate to share candid feedback, creative suggestions, or genuine appreciation due to social anxiety, peer pressure, or fear of academic retribution. Traditional feedback boxes are slow, unmoderated, and lack peer engagement.

### 2. Our Solution: ThoughtBox
ThoughtBox provides a secure, anonymous, real-time campus forum where:
- **Students & Teachers post thoughts anonymously**: No login, no names, no student IDs, and no raw IP logging.
- **Categorization**: Thoughts are categorized under *Academics, Suggestions, Appreciation, Campus Life,* or *Other*.
- **Community Interaction**: Users can like thoughts (with client-side duplicate prevention) and view real-time vote tallies.
- **Content Moderation & Safety**: Users can flag/report inappropriate content.
- **Protected Moderator Panel**: Campus moderators log in via a secure secret key to review reported posts, approve/hide thoughts, or delete offensive submissions.

---

## 🔄 End-to-End System Workflow

```
[Student / User Browser]
       │
       │ 1. HTTP Request (e.g. GET /api/thoughts or POST /api/thoughts)
       ▼
[Nginx Web Server] (Port 3000 -> Container Port 80)
       │ - Serves optimized static React/TypeScript assets
       │ - Handles SPA fallback routing (try_files)
       ▼
[FastAPI Backend] (Port 8000 -> Container Port 8000)
       │ - CORS Middleware validates origin
       │ - SlowAPI Rate Limiter checks IP frequency (anti-spam)
       │ - Pydantic validates payload schemas
       │ - Dependency Injection yields SQLAlchemy DB session
       ▼
[PostgreSQL Database] (Port 5432)
       │ - Stores relational records (thoughts, reports)
       │ - Data persisted permanently in Docker named volume 'pgdata'
       ▼
[FastAPI serializes response] ──► [React renders UI state]
```

---

## 🛠 Tools & Technologies Used (Detailed Breakdown)

| Component | Tool / Technology | Version | Purpose in this Project |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | 19.x | Declarative, component-based user interface. |
| **Frontend Language** | **TypeScript** | 5.x | Compile-time type safety, interface definitions, bug reduction. |
| **Frontend Build Tool** | **Vite** | 8.x | Ultra-fast native ES Module dev server and production bundler. |
| **Frontend Styling** | **Vanilla CSS** | CSS3 | Responsive design, CSS variables, dark/light styling, glassmorphism. |
| **Web Server** | **Nginx** | Alpine | Production web server serving static bundle and handling client-side SPA routing. |
| **Backend Framework** | **FastAPI** | 0.115+ | High-performance asynchronous REST API framework in Python. |
| **Backend Language** | **Python** | 3.11 | Modern Python runtime with native typing and async support. |
| **ASGI Server** | **Uvicorn** | 0.34+ | Lightning-fast ASGI web server running FastAPI. |
| **ORM** | **SQLAlchemy** | 2.0+ | Object Relational Mapper for database interaction via Python objects. |
| **Data Validation** | **Pydantic** | 2.10+ | Request and response schema validation and serialization. |
| **Rate Limiter** | **SlowAPI** | 0.1.9+ | In-memory IP rate limiting to prevent spam and DoS attacks. |
| **Database** | **PostgreSQL** | 16-alpine | Production-grade relational database for ACID-compliant storage. |
| **Unit Testing** | **Pytest** | 8.3+ | Automated backend testing using in-memory SQLite for test isolation. |
| **Container Engine** | **Docker** | 29.x | OS-level virtualization to containerize services. |
| **Orchestration** | **Docker Compose** | v2 / v5 | Multi-container configuration, networking, volumes, health checks. |
| **CI Automation** | **GitHub Actions** | v4/v5 | Cloud CI pipeline triggering on every Git push and pull request. |
| **DevOps Pipeline** | **Jenkins** | Declarative | Alternative enterprise CI/CD pipeline definition (`Jenkinsfile`). |
| **Version Control** | **Git & GitHub** | - | Distributed source code tracking and pull-request collaboration. |

---

## 🏗 Architecture Diagram

```
                             Docker Bridge Network: 'thoughtbox-net'
                      ┌─────────────────────────────────────────────────────────┐
                      │                                                         │
[Host: Port 3000] ───►│ [frontend:80]                                           │
                      │  - Nginx (Alpine)                                       │
                      │  - Static React SPA files                               │
                      │                                                         │
[Host: Port 8000] ───►│ [backend:8000]                                          │
                      │  - FastAPI / Python 3.11                                │
                      │  - Uvicorn server                                       │
                      │  - SlowAPI Rate Limiting                                │
                      │  - Depends on DB (healthy)                              │
                      │          │                                              │
                      │          │ Internal DNS: db:5432                        │
                      │          ▼                                              │
[Host: Port 5432] ───►│ [db:5432]                                               │
                      │  - PostgreSQL 16 Alpine                                 │
                      │  - Mounts Volume: pgdata ──► /var/lib/postgresql/data   │
                      │  - Health Check: pg_isready                             │
                      │                                                         │
                      └─────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker Concepts Used (Deep Dive for Viva)

### 1. Containers vs. Virtual Machines
* **Virtual Machines (VMs)**: Include a full Guest OS on top of a hypervisor. Heavyweight (gigabytes), slow startup (minutes).
* **Docker Containers**: Share the host Linux kernel and isolate processes using Linux kernel **namespaces** (PID, NET, MNT, IPC, UTS) and **cgroups** (CPU, RAM limits). Lightweight (megabytes), sub-second startup.

### 2. Multi-Stage Docker Builds (Used in `frontend/Dockerfile`)
* **Problem**: Building React requires Node.js, `npm`, devDependencies, and build tools (~1 GB image). However, running a React app in production only needs plain HTML/CSS/JS files!
* **Solution**: Multi-stage build:
  ```dockerfile
  # Stage 1: Build the assets using Node
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # Stage 2: Serve using lightweight Nginx
  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```
* **Viva Benefit**: Decreases image size from **~1.2 GB to ~25 MB**, eliminates Node runtime vulnerabilities in production, and speeds up deployment.

### 3. Docker Layer Caching Optimization
* Docker caches each instruction line. If files haven't changed, Docker reuses the cached layer.
* In both `backend/Dockerfile` and `frontend/Dockerfile`, we deliberately copy dependency files first:
  ```dockerfile
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  ```
* If you edit backend Python code, Docker does **not** re-install Python dependencies; it starts from line 10, completing the build in seconds.

### 4. Docker Compose Orchestration (`compose.yaml`)
Instead of typing separate `docker run` commands with dozens of arguments, Docker Compose coordinates:
* **Service definitions**: `db`, `backend`, `frontend`.
* **Port mappings**: `3000:80`, `8000:8000`, `5432:5432`.
* **Restart policies**: `restart: unless-stopped`.
* **Volume management**: Persistent storage binding.

### 5. Docker Networking & Service Discovery
* Docker Compose creates an automatic isolated bridge network.
* Services find each other by **service name** via Docker's embedded DNS server.
* The backend connects to PostgreSQL using `db:5432`, **not** an IP address or `localhost`.

### 6. Container Health Checks & Startup Dependencies
* **Race Condition Problem**: If the backend starts before PostgreSQL is ready to accept connections, the backend crashes.
* **Our Solution**:
  1. PostgreSQL health check:
     ```yaml
     healthcheck:
       test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-thoughtbox}"]
       interval: 5s
       retries: 5
     ```
  2. Backend dependency condition:
     ```yaml
     depends_on:
       db:
         condition: service_healthy
     ```
  3. Backend health check:
     ```yaml
     healthcheck:
       test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
     ```

### 7. Docker Volumes (Data Persistence)
* Containers have ephemeral filesystems; deleting a container deletes its files.
* We define a **named volume** (`pgdata`):
  ```yaml
  volumes:
    - pgdata:/var/lib/postgresql/data
  ```
* Even if you destroy the `db` container (`docker compose down`), your thoughts and database records remain intact on the host storage. Only `docker compose down -v` removes the volume.

### 8. Context Optimization via `.dockerignore`
* Prevents transmitting heavy, temporary, or sensitive folders into the Docker daemon context:
  * Backend ignores: `.venv`, `__pycache__`, `.pytest_cache`, `.env`
  * Frontend ignores: `node_modules`, `dist`, `.git`

---

## ⚙️ DevOps Concepts Used (Deep Dive for Viva)

### 1. Continuous Integration (CI)
* Developers frequently commit code to a shared repository.
* On every commit or pull request, an automated CI runner triggers builds and unit tests to catch defects immediately ("fail early").

### 2. Shift-Left Testing
* Testing is moved to the earliest stage of the development lifecycle.
* Before any container is packaged or deployed, automated tests execute:
  * Backend API tests check HTTP status codes, validation errors, and rate limits.
  * In-memory SQLite (`sqlite://`) is used during testing so tests run instantly without needing an external database.

### 3. Infrastructure as Code (IaC) & Configuration as Code
* Environments are declared in version-controlled configuration files (`compose.yaml`, `Dockerfile`, `nginx.conf`, `Jenkinsfile`) rather than configured manually on servers.
* Guarantees repeatability, audibility, and zero human configuration drift.

### 4. Environment Parity (Eliminating "It works on my machine")
* Eliminates differences between Windows/Mac developer laptops, CI test runners, and production servers by containerizing all dependencies.

### 5. Secrets Management & The 12-Factor App
* Following the **12-Factor App methodology (Config in environment)**:
  * Passwords (`POSTGRES_PASSWORD`) and moderator keys (`MODERATOR_SECRET`) are never hardcoded in source code.
  * Injected via environment variables and `.env` files.
  * `.env` is listed in `.gitignore` to prevent sensitive credentials from leaking to GitHub.

### 6. Reverse Proxy & SPA Client-Side Routing
* Nginx acts as a high-performance web server.
* The `nginx.conf` includes:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```
* This ensures single-page application (SPA) routes do not return 404 Not Found when directly refreshed in the browser.

### 7. Observability & Self-Healing
* Health check endpoints (`/api/health`) query both the web service and the database connection:
  ```json
  {"status": "ok", "database": "connected"}
  ```
* Orchestrators like Docker or Kubernetes use this endpoint to automatically restart unresponsive containers.

---

## 🔄 CI/CD Pipelines (GitHub Actions & Jenkins)

### 1. GitHub Actions Pipeline (`.github/workflows/ci.yml`)

Runs on every `push` and `pull_request` to `main`:

```
Git Push to GitHub
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[Job 1: Backend Tests]           [Job 2: Frontend Build]
 - Ubuntu Runner                  - Ubuntu Runner
 - Set up Python 3.11             - Set up Node.js 20
 - Install requirements.txt       - npm ci (clean install)
 - Run pytest against SQLite      - npm run build (Vite compilation)
       │                                 │
       └────────────────┬────────────────┘
                        ▼
             CI Status: PASSED / FAILED
```

### 2. Jenkins Pipeline (`Jenkinsfile`)

Declarative 4-stage pipeline for automated builds:
1. **Stage 1: Checkout** — Clones latest commit from Git repository.
2. **Stage 2: Backend Tests** — Installs dependencies and runs `pytest tests/ -v`.
3. **Stage 3: Frontend Build** — Runs `npm ci` and compiles TypeScript bundle.
4. **Stage 4: Docker Build** — Executes `docker compose build` to verify container artifacts build cleanly.
5. **Post actions** — Emits pipeline success or failure notifications.

---

## 🚀 Quick Start & Running the Project

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* [Git](https://git-scm.com/) installed.

### 1. One-Command Start (Recommended)
From the project root:
```powershell
docker compose up -d --build
```

### 2. Accessing the Services
| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:3000](http://localhost:3000) | ThoughtBox interactive React UI |
| **Backend API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI |
| **Backend Health Check** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Returns DB & API health |
| **PostgreSQL Database** | `localhost:5432` | User: `thoughtbox`, DB: `thoughtbox` |

### 3. Essential Docker Management Commands
```powershell
# Check status of running containers
docker compose ps

# View real-time logs from all services
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend

# Stop all services (preserves database data)
docker compose down

# Stop and wipe database data (clean reset)
docker compose down -v
```

---

## 📡 API Reference

All API routes are prefixed with `/api`.

| Method | Endpoint | Description | Protected? |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service and DB healthcheck | No |
| `GET` | `/api/thoughts` | List approved thoughts (optional `?category=`) | No |
| `POST` | `/api/thoughts` | Create a new thought (Rate-limited: 5/min) | No |
| `POST` | `/api/thoughts/{id}/like` | Increment like count (Rate-limited: 30/min) | No |
| `POST` | `/api/thoughts/{id}/report` | Report a thought (Rate-limited: 10/min) | No |
| `POST` | `/api/moderator/login` | Validate moderator key | Header `X-Moderator-Secret` |
| `GET` | `/api/moderator/thoughts` | List all thoughts including flagged | Header `X-Moderator-Secret` |
| `PATCH` | `/api/moderator/thoughts/{id}` | Toggle thought visibility (`is_approved`) | Header `X-Moderator-Secret` |
| `DELETE` | `/api/moderator/thoughts/{id}` | Permanently delete a thought | Header `X-Moderator-Secret` |

---

## 🗄 Database Schema & Persistence

### 1. `thoughts` Table
- `id` (Integer, Primary Key)
- `content` (String 1–500 chars, Not Null)
- `category` (Enum: `academics`, `suggestions`, `appreciation`, `campus_life`, `other`)
- `likes_count` (Integer, Default 0)
- `is_approved` (Boolean, Default True)
- `is_reported` (Boolean, Default False)
- `created_at` (Timestamp with timezone)

### 2. `reports` Table
- `id` (Integer, Primary Key)
- `thought_id` (Foreign Key -> `thoughts.id`, On Delete Cascade)
- `reason` (String 0–200 chars, Optional)
- `created_at` (Timestamp with timezone)

---

## 🎓 Master Viva Questions & Answers (Cheat Sheet)

### Category A: Architecture & Project Fundamentals

**Q1: What is ThoughtBox and what problem does it solve?**
> **A:** ThoughtBox is an anonymous campus thoughts and feedback platform. It allows students and faculty to share suggestions, academic feedback, and appreciation without fear of judgment. It includes automated abuse reporting and a protected moderation dashboard.

**Q2: What is the 3-tier architecture used in this project?**
> **A:**
> 1. **Presentation Tier:** React 19 SPA served via Nginx on port 3000.
> 2. **Application Tier:** FastAPI backend on port 8000 handling business logic, validation, and rate limiting.
> 3. **Data Tier:** PostgreSQL 16 database storing thoughts and reports with named volume persistence.

---

### Category B: Docker & Containerization

**Q3: What is the fundamental difference between Docker and a Virtual Machine?**
> **A:** A VM virtualizes the entire hardware stack and runs a full guest operating system using a Hypervisor. Docker virtualizes the operating system kernel using Linux **namespaces** (for isolation) and **cgroups** (for resource limitation). Containers are much faster, lighter, and share the host kernel.

**Q4: Explain what a Multi-Stage Docker build is and where you used it.**
> **A:** In `frontend/Dockerfile`, we used two stages:
> 1. `FROM node:20-alpine AS build`: Installs devDependencies and compiles TypeScript into static HTML/JS/CSS assets.
> 2. `FROM nginx:alpine`: Copies only the compiled `/dist` directory from the build stage into an Alpine Nginx image.
> This drops the final image size from ~1.2 GB to ~25 MB and removes the Node runtime from production, drastically reducing the security attack surface.

**Q5: Why do we copy `requirements.txt` or `package.json` before copying the rest of the application code?**
> **A:** To maximize Docker **layer caching**. Installing dependencies takes time. Since dependencies change far less frequently than application code, copying dependency manifests first ensures Docker can reuse the cached layer for dependencies whenever you modify code.

**Q6: What is the purpose of Docker Compose?**
> **A:** Docker Compose is a tool for defining and running multi-container Docker applications. Through `compose.yaml`, we define services, networks, volumes, port bindings, environment variables, and startup sequences in a single declarative file.

**Q7: How do containers communicate with each other?**
> **A:** Docker Compose automatically creates an isolated internal bridge network. Each service is assigned a DNS entry matching its service name. For example, the backend connects to the database using hostname `db:5432`, resolved internally by Docker's DNS.

**Q8: Why doesn't the React frontend call `http://backend:8000`?**
> **A:** The React application runs inside the **user's web browser**, not inside the Docker container! The browser runs on the host machine and does not belong to Docker's internal bridge network. Therefore, the browser must reach the backend through the published host port (`http://localhost:8000`).

**Q9: What is the difference between `docker compose down` and `docker compose down -v`?**
> **A:** `docker compose down` stops and removes the containers and networks, but **preserves** named volumes (`pgdata`), ensuring data survives. Adding the `-v` flag deletes all attached volumes, resetting the database to zero.

**Q10: Why are Docker Healthchecks critical in multi-container setups?**
> **A:** Traditional `depends_on` only checks if the container process has spawned, not if the application is ready to accept traffic. PostgreSQL takes a few seconds to initialize. By defining `pg_isready` in PostgreSQL's health check and setting `condition: service_healthy` on the backend, we prevent backend connection crashes.

---

### Category C: DevOps, CI/CD & Testing

**Q11: What is Continuous Integration (CI)?**
> **A:** CI is a software engineering practice where code changes are regularly integrated into a central repository, followed by automated builds and test executions to detect regressions immediately.

**Q12: Describe your GitHub Actions workflow.**
> **A:** The workflow `.github/workflows/ci.yml` triggers on pushes and PRs to `main`. It executes two parallel jobs:
> 1. **Backend Tests:** Spawns an Ubuntu runner, installs Python 3.11, and runs `pytest` against an in-memory SQLite database.
> 2. **Frontend Build:** Spawns an Ubuntu runner, installs Node 20, and runs `npm run build` to verify type checking and bundling.

**Q13: Why did you use SQLite for CI tests instead of PostgreSQL?**
> **A:** SQLite runs in-memory (`sqlite://`). It requires zero network setup, no container spin-up overhead, and completes tests in milliseconds while testing identical SQLAlchemy ORM models.

**Q14: What is the purpose of the `Jenkinsfile`?**
> **A:** It provides a Declarative Pipeline for enterprise CI systems using Jenkins. It defines stages for Checkout, Backend Tests, Frontend Build, and Docker Build, followed by post-execution status reporting.

**Q15: What is Infrastructure as Code (IaC)?**
> **A:** IaC is managing and provisioning computing infrastructure through machine-readable definition files rather than physical hardware configuration or interactive configuration tools. Our `compose.yaml` and `Dockerfile` are examples of IaC.

---

### Category D: Backend, Database & Security

**Q16: Why choose FastAPI over Django or Flask?**
> **A:**
> - **FastAPI:** High performance (Starlette/Uvicorn), automatic OpenAPI/Swagger documentation, native asynchronous support (`async`/`await`), and strict schema validation with Pydantic.
> - **Flask:** Synchronous by default, requires manual setup for validation and API documentation.
> - **Django:** Monolithic and heavy for building lightweight microservices.

**Q17: What is an ORM and why use SQLAlchemy?**
> **A:** An Object Relational Mapper maps database tables to Python classes. It enables querying and manipulating data using object-oriented code, prevents SQL injection attacks through parameterized queries, and provides database independence.

**Q18: How is rate limiting implemented and why is it needed?**
> **A:** We use `slowapi` to enforce limits (e.g., maximum 5 thought submissions per minute per IP). This prevents spam, automated bot floods, and Denial of Service (DoS) attacks while keeping client IPs in memory rather than permanently saving them.

**Q19: How is the Moderator Panel secured?**
> **A:** Requests to moderator endpoints require a custom HTTP header `X-Moderator-Secret`. The backend compares this value against the `MODERATOR_SECRET` environment variable using constant-time comparison to prevent timing attacks.
**Q20: What is the difference between social anonymity and technical anonymity?**
> **A:** ThoughtBox provides **social anonymity** (users, peers, and teachers cannot see who created a post). It does not claim absolute technical anonymity because low-level infrastructure (network routers, firewalls, ISPs) inherently logs packet metadata and IP addresses.

---

## 👥 Contributors & Academic Context

* **Project:** ThoughtBox (Anonymous Campus Thoughts Platform)
* **Course:** Master of Computer Applications (MCA) / B.Tech Computer Science
* **Domain:** Cloud Computing, Containerization, DevOps & Web Technologies