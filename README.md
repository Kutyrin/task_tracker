# Task Tracker

A full-stack issue and project management platform inspired by Jira and Kaiten. The project combines a NestJS REST API, a Next.js frontend, PostgreSQL persistence, role-based access control, real-time collaboration, Kanban workflows, notifications, file attachments, and calendar-based task tracking.

The application is designed as a complete full-stack system rather than a simple CRUD demo. It includes JWT authentication with access and refresh token rotation, project-level RBAC, transactional issue numbering, real-time synchronization through Socket.IO, automated unit and E2E testing, Docker-based local development, and a production CI/CD pipeline that builds Docker images, publishes them to GitHub Container Registry, and deploys them to a VPS.

## Demo

Production:

- Frontend: <https://app.mytasktrackeronline.ru>
- API: <https://api.mytasktrackeronline.ru>
- Health check: <https://api.mytasktrackeronline.ru/health>

## Current Features

### Backend

- **Authentication:** registration, login, current user, JWT access and refresh tokens, refresh-token rotation, logout, and bcrypt password hashing.
- **Projects:** CRUD, unique project keys, automatic owner membership, and member management by user ID or email.
- **Access control:** project membership checks and `OWNER`, `ADMIN`, and `MEMBER` roles.
- **Boards:** CRUD, default Backlog / To Do / In Progress / Done columns, column management, and reordering.
- **Issues:** CRUD, movement between columns, ordering, reporter, assignee, due date, and project-scoped issue keys such as `TASK-6`.
- **Issue types:** `TASK`, `BUG`, `STORY`, `EPIC`; priorities: `LOW`, `MEDIUM`, `HIGH`.
- **Issue queries:** search by key, title, or description; filters by column, type, priority, label names, and due-date range; pagination and sorting.
- **Comments:** creation, listing, editing own comments, and deletion by the author or a project owner/admin.
- **Labels:** project-scoped unique names, label management, and issue-label assignments.
- **Activity history:** task creation and movement, field changes, comments, label assignments, and project-level activity.
- **Attachments:** upload, list, download, and delete files attached to tasks. Uploads use the multipart field `file`, with a 5 MiB limit and JPEG, PNG, GIF, WebP, PDF, and plain-text MIME types. Attachment downloads are served through an authenticated API endpoint with project access checks.
- **Statistics:** dashboard totals across accessible projects and per-project statistics, including total and overdue tasks, with counts by priority, issue type, column, and assignee.
- **Real-time updates:** Socket.IO events for projects, members, boards, columns, tasks, comments, labels, attachments, activity, and notifications.
- **Calendar:** tasks with due dates in a requested date range across accessible projects.
- **Notifications:** persistent user notifications for assignments, comments, task deletion, and membership changes, with unread counts and read actions.
- **Health check:** `GET /health` verifies application and database availability.

### Frontend

- Registration, login, logout, protected routes, session restoration, and automatic token refresh.
- Project listing, creation, and deletion.
- Project pages with members, roles, boards, labels, and activity history.
- Kanban boards with task creation, filtering, drag-and-drop movement, ordering, and column management.
- Task detail pages with editing, deletion, assignee and due-date fields, comments, labels, attachments, and activity.
- Dashboard with project/task totals, overdue counts, and distributions by priority, issue type, and column.
- Monthly calendar with due-date task links and month navigation.
- Notification bell with unread count, related-item navigation, and individual/all-read actions.
- Socket.IO subscriptions update project, board, task, dashboard, calendar, and notification data through TanStack Query.

Routes:

```text
/
/register
/login
/dashboard
/projects
/projects/new
/projects/[id]
/boards/[id]
/tasks/[id]
/calendar
```

## Tech Stack

| Area                  | Current stack                                              |
| --------------------- | ---------------------------------------------------------- |
| Runtime               | Node.js 24, npm                                            |
| Backend               | NestJS 12, TypeScript, Prisma 6.19.3, PostgreSQL 17        |
| Authentication        | JWT, Passport, bcrypt                                      |
| Uploads and real-time | Multer, local filesystem, Socket.IO 4                      |
| Frontend              | Next.js 16.3.3, React 19.2.8, TypeScript, Tailwind CSS 4   |
| State and forms       | Redux Toolkit, TanStack Query, Axios, React Hook Form, Zod |
| Backend testing       | Jest 30, SWC, Nest testing utilities, Supertest            |
| Frontend testing      | Vitest 4, React Testing Library, jsdom, Playwright         |
| Drag and drop         | dnd-kit                                                    |
| Infrastructure        | Docker Compose, Dockerfiles, Nginx, GitHub Actions, GHCR   |

Recharts is installed, while current dashboard distributions are rendered with CSS bars.

## Repository Structure

```text
.

├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── deploy/
│   └── nginx/
│       └── task-tracker.conf.example
│
├── .env.production.example
├── docker-compose.yml
├── docker-compose.prod.yml
│
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── boards/
│   │   ├── tasks/
│   │   ├── comments/
│   │   ├── labels/
│   │   ├── activities/
│   │   ├── attachments/
│   │   ├── notifications/
│   │   ├── realtime/
│   │   ├── prisma/
│   │   ├── app.module.ts
│   │   ├── health.controller.ts
│   │   └── main.ts
│   └── test/
│       └── API E2E tests
│
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example
    ├── e2e/
    ├── playwright.config.ts
    ├── vitest.config.mts
    └── src/
        ├── app/
        ├── components/
        ├── hooks/
        ├── lib/
        ├── providers/
        ├── store/
        └── tests/
```

The backend uses feature modules, controllers for HTTP routes, services for business rules and access checks, DTOs for validation, and Prisma for persistence.

## Domain Model

- `User` joins a `Project` through `ProjectMember`.
- A project has boards, tasks, labels, activities, and notifications.
- A board contains ordered `BoardColumn` records.
- `Task` is the persistence model for an issue, with a reporter and optional assignee.
- Tasks have comments, activity records, attachments, and labels.
- `TaskLabel` connects tasks and labels.
- `Notification` belongs to a user and can reference a task or project.

Issue numbers are generated per project by atomically incrementing `Project.issueSequence` inside a Prisma transaction. The project key and number form the display key, for example `TASK-6`.

## Roles

- `OWNER`: project settings, members, board structure, labels, issues, and project deletion.
- `ADMIN`: project settings, members subject to owner restrictions, board structure, labels, and issues.
- `MEMBER`: project access, issue management and movement, comments, label assignments, and attachment uploads.

Only the owner can delete a project or assign the admin role. Admins cannot manage another admin. The owner cannot be removed or reassigned through member management.

Comment editing is restricted to the author. Owners and admins can also delete other users' comments.

Attachments can be deleted by their uploader or a project owner/admin.

## Docker

The project supports both local and production Docker Compose environments.

### Local Architecture

```text
PostgreSQL 17
      │
      ▼
NestJS backend
      │
      ▼
Next.js frontend
```

Services:

| Service    | Container port | Host port |
| ---------- | -------------: | --------: |
| PostgreSQL |           5432 |      5433 |
| Backend    |           3001 |      3001 |
| Frontend   |           3000 |      3000 |

The backend waits for PostgreSQL health, applies Prisma migrations before startup, and stores uploaded files in the persistent `uploads_data` volume.

The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:3001`, because API requests originate from the user's browser.

### Production Architecture

```text
Internet
   │
   ├── https://app.mytasktrackeronline.ru
   │            │
   │          Nginx
   │            │
   │        Frontend :3000
   │
   └── https://api.mytasktrackeronline.ru
                │
              Nginx
                │
            Backend :3001
                │
            PostgreSQL :5432
```

Production services run on a VPS.

- Nginx terminates HTTPS and acts as a reverse proxy.
- Let's Encrypt provides TLS certificates.
- Frontend and backend containers are bound to localhost on the VPS.
- PostgreSQL runs as a separate container with persistent storage.
- Uploaded files are stored in persistent Docker storage.
- Production images are pulled from GitHub Container Registry.
- PostgreSQL backups are created automatically once per day and retained locally for seven days.

Production configuration is stored in `.env.production` on the VPS and is not committed to the repository.

## Local Development

### Requirements

- Node.js 24.x and npm
- Docker with Docker Compose

Backend and frontend have separate `package.json` and lockfiles. Run npm commands in the corresponding directory.

### Backend Setup

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/task_tracker"

JWT_SECRET="replace-with-a-long-random-access-secret"

JWT_REFRESH_SECRET="replace-with-a-different-long-random-refresh-secret"

PORT=3001

CORS_ORIGIN="http://localhost:3000"
```

Install and run:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
node -e "require('node:fs').mkdirSync('uploads', { recursive: true })"
npm run start:dev
```

The backend runs at:

```text
http://localhost:3001
```

Health check:

```text
GET http://localhost:3001/health
```

Create a new Prisma migration with:

```bash
npx prisma migrate dev --name <migration-name>
```

Validate the Prisma schema with:

```bash
npx prisma validate
```

### Frontend Setup

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Install and run:

```bash
cd frontend
npm ci
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

Open:

```text
http://localhost:3000/register
```

to create an account, or:

```text
http://localhost:3000/login
```

to sign in.

Successful authentication opens `/dashboard`.

### Complete Docker Stack

From the repository root:

```bash
docker compose up -d --build
```

The stack starts PostgreSQL, backend, and frontend in health-check order.

Open:

```text
http://localhost:3000
```

Backend health:

```text
http://localhost:3001/health
```

Stop the stack:

```bash
docker compose down
```

Database and uploaded files persist in Docker volumes.

### Backend Build

From `backend/`:

```bash
npm run build
node dist/main.js
```

### Frontend Build

From `frontend/`:

```bash
npm run build
npm start
```

Frontend development and build scripts explicitly use Webpack.

## Production Deployment

Production deployment is automated with GitHub Actions.

The deployment workflow:

1. Runs after a successful CI workflow on `main`.
2. Uses the CI commit SHA as the Docker image version.
3. Connects to the VPS over SSH.
4. Pulls the corresponding images from GHCR.
5. Restarts the production stack with Docker Compose.
6. Runs application health checks.
7. Leaves the PostgreSQL and upload data in persistent Docker storage.
8. Runs an automated daily PostgreSQL backup with seven-day retention.

Production services:

```text
Frontend      https://app.mytasktrackeronline.ru
API           https://api.mytasktrackeronline.ru
Health check  https://api.mytasktrackeronline.ru/health
```

Production environment variables are stored in `.env.production` on the VPS:

```text
NEXT_PUBLIC_API_URL
GHCR_IMAGE_NAMESPACE
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
CORS_ORIGIN
JWT_SECRET
JWT_REFRESH_SECRET
```

Secrets are never committed to the repository.

## Production Backup and Restoration

Production PostgreSQL data is backed up automatically on the VPS.

### Backup Strategy

- Backups run once per day at 03:00 server time.
- Backups are created with `pg_dump` from the production PostgreSQL container.
- Dumps are compressed with gzip.
- Backups are stored in `/opt/task-tracker/backups/`.
- Backups older than seven days are removed automatically.
- The backup service is managed by a systemd timer.
- Production database data is stored in the persistent `postgres_data` Docker volume.
- The backup directory and backup script are restricted to the root user.

Backup files use the following naming convention:

```text
postgres_YYYY-MM-DD_HH-MM-SS.sql.gz
```

### Backup Service

The backup consists of two systemd units:

```text
/etc/systemd/system/task-tracker-backup.service
/etc/systemd/system/task-tracker-backup.timer
```

Check the timer:

```bash
sudo systemctl status task-tracker-backup.timer --no-pager
```

List the scheduled execution:

```bash
systemctl list-timers task-tracker-backup.timer --no-pager
```

Run a backup manually:

```bash
sudo systemctl start task-tracker-backup.service
```

Check the result:

```bash
sudo systemctl status task-tracker-backup.service --no-pager
```

List available backups:

```bash
sudo ls -lh /opt/task-tracker/backups/
```

### Backup Validation

Each backup is compressed and validated with gzip after creation.

A backup archive can be checked manually:

```bash
sudo gzip -t /opt/task-tracker/backups/postgres_<timestamp>.sql.gz
```

### Restoration Test

Production backups should be tested by restoring them into a temporary PostgreSQL database without modifying the live production database.

The verified restoration procedure is:

```bash
cd /opt/task-tracker

POSTGRES_CONTAINER=$(sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps -q postgres)

BACKUP="/opt/task-tracker/backups/postgres_<timestamp>.sql.gz"

sudo docker exec "$POSTGRES_CONTAINER" \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE restore_test_manual;"'

gzip -dc "$BACKUP" | sudo docker exec -i \
  "$POSTGRES_CONTAINER" \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d restore_test_manual'
```

Verify that the restored database contains the expected schema:

```bash
sudo docker exec "$POSTGRES_CONTAINER" \
  sh -c 'psql -U "$POSTGRES_USER" -d restore_test_manual -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';"'
```

After verification, remove the temporary database:

```bash
sudo docker exec "$POSTGRES_CONTAINER" \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE restore_test_manual;"'
```

A successful restoration test confirms that the backup is readable and can be restored by PostgreSQL without affecting the live production database.

The current production backup has been successfully tested using this procedure, with the restored database containing 13 public tables.

### Full Production Restore

A full production restore is destructive and should only be performed after stopping the application and confirming the correct backup file.

The general recovery process is:

```text
Select backup
     │
     ▼
Stop application containers
     │
     ▼
Create a fresh PostgreSQL database
     │
     ▼
Restore the selected .sql.gz dump
     │
     ▼
Run Prisma migrations if required
     │
     ▼
Start backend and frontend
     │
     ▼
Run health checks
```

Before performing a destructive production restore, create an additional backup of the current production database and verify the selected backup archive with `gzip -t`.

For the demonstration environment, backups are intentionally kept on the VPS for seven days. An external backup destination is not currently configured.

## API Overview

The API has no `/api` prefix.

Protected HTTP routes require:

```text
Authorization: Bearer <accessToken>
```

| Resource       | Routes                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health         | `GET /health`                                                                                                                                                                           |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                                                                                    |
| Projects       | `POST /projects`, `GET /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`                                                                                   |
| Statistics     | `GET /projects/stats`, `GET /projects/:id/stats`                                                                                                                                        |
| Members        | `GET /projects/:projectId/members`, `POST /projects/:projectId/members`, `PATCH /projects/:projectId/members/:memberId`, `DELETE /projects/:projectId/members/:memberId`                |
| Boards         | `POST /boards`, `GET /boards`, `GET /boards/:id`, `PATCH /boards/:id`, `DELETE /boards/:id`                                                                                             |
| Columns        | `POST /boards/:boardId/columns`, `GET /boards/:boardId/columns`, `PATCH /boards/:boardId/columns/:id`, `PATCH /boards/:boardId/columns/:id/move`, `DELETE /boards/:boardId/columns/:id` |
| Issues         | `POST /tasks`, `GET /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`, `PATCH /tasks/:id/move`, `DELETE /tasks/:id`                                                                         |
| Comments       | `POST /tasks/:taskId/comments`, `GET /tasks/:taskId/comments`, `PATCH /tasks/:taskId/comments/:commentId`, `DELETE /tasks/:taskId/comments/:commentId`                                  |
| Project labels | `GET /projects/:projectId/labels`, `POST /projects/:projectId/labels`, `PATCH /projects/:projectId/labels/:labelId`, `DELETE /projects/:projectId/labels/:labelId`                      |
| Task labels    | `GET /tasks/:taskId/labels`, `POST /tasks/:taskId/labels`, `DELETE /tasks/:taskId/labels/:labelId`                                                                                      |
| Activity       | `GET /tasks/:taskId/activities`, `GET /projects/:projectId/activities`                                                                                                                  |
| Attachments    | `GET /tasks/:taskId/attachments`, `GET /tasks/:taskId/attachments/:attachmentId/download`, `POST /tasks/:taskId/attachments`, `DELETE /tasks/:taskId/attachments/:attachmentId`         |
| Calendar       | `GET /tasks/calendar?from=<ISO-date>&to=<ISO-date>`                                                                                                                                     |
| Notifications  | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`                                                                                                  |

### Issue Queries

```text
GET /tasks?search=TASK-6

GET /tasks?issueType=BUG&priority=HIGH

GET /tasks?labels=backend,urgent

GET /tasks?columnId=3

GET /tasks?dueAfter=2026-09-01T00:00:00.000Z&dueBefore=2026-09-30T23:59:59.000Z

GET /tasks?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

`labels` takes comma-separated label names.

Default query values:

```text
page=1
limit=10
sortBy=createdAt
sortOrder=desc
```

The maximum declared page size is `100`.

### Calendar Queries

```text
GET /tasks/calendar?from=2026-09-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z
```

Calendar queries use an inclusive `from` bound and an exclusive `to` bound.

### Real-time API

Connect a Socket.IO client with:

```ts
auth: {
  token: accessToken,
}
```

Authenticated connections automatically join:

```text
user:<userId>
```

Clients can subscribe to project and task rooms with:

```text
join-project
join-task
```

The server checks project membership before allowing room access.

Example events:

```text
task.created
task.updated
task.moved
task.deleted

comment.created
comment.updated
comment.deleted

label.added
label.removed

attachment.uploaded
attachment.deleted

activity.created

project.access.revoked

notification.created
```

## Testing

### Backend Tests

From `backend/`:

```bash
npm test -- --runInBand
npm run test:cov
npm run test:e2e
```

Current backend test suite:

```text
278 unit tests
74 API E2E tests
```

Unit tests cover business services, task mapping, authentication, JWT strategy, real-time services, gateway behavior, and guards.

API E2E tests exercise authentication, projects, boards, tasks, comments, labels, attachments, and application endpoints against PostgreSQL.

### Frontend Tests

From `frontend/`:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Current frontend test suite:

```text
170 Vitest tests
3 Playwright E2E tests
```

Vitest and React Testing Library cover utility functions, query and mutation hooks, real-time hooks, components, and pages.

Playwright currently covers registration, authentication, task creation, and task movement flows.

Install Chromium before running browser tests for the first time:

```bash
npx playwright install chromium
```

The current Playwright configuration expects the frontend and backend to be running at:

```text
http://localhost:3000
http://localhost:3001
```

### Test Coverage Summary

| Area                    |   Tests |
| ----------------------- | ------: |
| Backend unit            |     278 |
| Backend API E2E         |      74 |
| Frontend Vitest         |     170 |
| Frontend Playwright E2E |       3 |
| **Total**               | **525** |

## CI/CD

GitHub Actions runs on pull requests and pushes to `main`, `master`, and `develop`.

The main CI workflow is defined in:

```text
.github/workflows/ci.yml
```

The production deployment workflow is defined in:

```text
.github/workflows/deploy.yml
```

### CI Pipeline

```text
Backend
├── install dependencies
├── Prisma generate
├── Prisma migrations
├── unit tests
├── build
└── API E2E

Frontend
├── install dependencies
├── unit tests
├── lint
└── build

Docker
├── Compose validation
└── Docker image builds

Frontend E2E
├── start Docker Compose stack
├── wait for health checks
├── install Chromium
├── Playwright E2E
└── upload Playwright report

Publish Docker images
├── build backend image
├── build frontend image
└── push images to GHCR
```

Docker image publishing runs for `main`.

Production deployment is triggered after a successful CI workflow on `main`.

The deployment flow is:

```text
Pull Request
     │
     ▼
   main
     │
     ▼
   CI
     │
     ├── tests
     ├── builds
     ├── E2E
     └── Docker images
             │
             ▼
            GHCR
             │
             ▼
    Deploy to production
             │
             ▼
            VPS
             │
             ├── docker compose pull
             ├── docker compose up -d
             └── health checks
```

Docker Buildx with GitHub Actions cache is used when publishing production images.

## Security and Implementation Notes

- Passwords and refresh tokens are stored as hashes.
- API user projections exclude passwords.
- The frontend stores access and refresh tokens in local storage and sends access tokens as bearer tokens.
- Attachment downloads go through authenticated API endpoints and verify project access.
- Uploaded files are stored in persistent Docker storage but are not exposed through a public static `/uploads` route.
- HTTP CORS is configurable.
- The Socket.IO gateway declares its own origin policy separately from HTTP CORS.
- Production traffic is terminated through Nginx with Let's Encrypt TLS certificates.
- Backend and frontend containers are not exposed directly to the public network; external access is provided through Nginx.
- Production secrets are stored outside the repository in `.env.production`.
- PostgreSQL backups are generated daily and retained locally for seven days.

## Remaining Work

- Broader Playwright E2E coverage for projects, comments, labels, notifications, attachments, and RBAC edge cases.
- Optional frontend coverage reporting with a dedicated Vitest coverage provider.
- Basic production monitoring and centralized log collection.
