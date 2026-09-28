# Task Tracker

A full-stack issue and project management application inspired by Jira and Kaiten.

A NestJS API and Next.js frontend support project management, Kanban workflows, task details, due-date calendars, project statistics, notifications, file attachments, and real-time updates. The complete application runs locally or through Docker Compose.

## Current Features

### Backend

* **Authentication:** registration, login, current user, JWT access and refresh tokens, refresh-token rotation, logout, and bcrypt password hashing.
* **Projects:** CRUD, unique project keys, automatic owner membership, and member management by user ID or email.
* **Access control:** project membership checks and `OWNER`, `ADMIN`, and `MEMBER` roles.
* **Boards:** CRUD, default Backlog / To Do / In Progress / Done columns, column management and reordering.
* **Issues:** CRUD, movement between columns, ordering, reporter, assignee, due date, and project-scoped issue keys such as `TASK-6`.
* **Issue types:** `TASK`, `BUG`, `STORY`, `EPIC`; priorities: `LOW`, `MEDIUM`, `HIGH`.
* **Issue queries:** search by key, title, or description; filters by column, type, priority, label names, and due-date range; pagination and sorting.
* **Comments:** creation, listing, editing own comments, and deletion by the author or a project owner/admin.
* **Labels:** project-scoped unique names, label management, and issue-label assignments.
* **Activity history:** task creation and movement, field changes, comments, and label assignments; task and project activity endpoints.
* **Attachments:** upload, list, download, and delete files attached to tasks. Uploads use multipart field `file`, with a 5 MiB limit and JPEG, PNG, GIF, WebP, PDF, and plain-text MIME types.
* **Statistics:** dashboard totals across accessible projects and per-project statistics, including total and overdue tasks, with counts by priority, issue type, column, and assignee.
* **Real-time updates:** Socket.IO events for projects, members, boards, columns, tasks, comments, labels, attachments, activity, and notifications.
* **Calendar:** tasks with due dates in a requested date range across accessible projects.
* **Notifications:** persistent user notifications for assignments, comments, task deletion, and membership changes, with unread counts and read actions.
* **Health check:** `GET /health` checks database connectivity.

### Frontend

* Registration, login, logout, protected routes, session restoration, and automatic token refresh.
* Project listing, creation, and deletion.
* Project pages with members, roles, boards, labels, and activity history.
* Kanban boards with task creation, filtering, drag-and-drop movement, ordering, and column management.
* Task detail pages with editing, deletion, assignee and due-date fields, comments, labels, attachments, and activity.
* Dashboard with project/task totals, overdue counts, and distributions by priority, issue type, and column.
* Monthly calendar with due-date task links and month navigation.
* Notification bell with unread count, related-item navigation, and individual/all-read actions.
* Socket.IO subscriptions update project, board, task, dashboard, calendar, and notification data through TanStack Query.

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
| Infrastructure        | Docker Compose, Dockerfiles, GitHub Actions                |

Recharts is installed, while current dashboard distributions are rendered with CSS bars.

## Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
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

* `User` joins a `Project` through `ProjectMember`.
* A project has boards, tasks, labels, activities, and notifications.
* A board contains ordered `BoardColumn` records.
* `Task` is the persistence model for an issue, with a reporter and optional assignee.
* Tasks have comments, activity records, attachments, and labels.
* `TaskLabel` connects tasks and labels.
* `Notification` belongs to a user and can reference a task or project.

Issue numbers are generated per project by atomically incrementing `Project.issueSequence` inside a Prisma transaction. The project key and number form the display key, for example `TASK-6`.

## Roles

* `OWNER`: project settings, members, board structure, labels, issues, and project deletion.
* `ADMIN`: project settings, members subject to owner restrictions, board structure, labels, and issues.
* `MEMBER`: project access, issue management and movement, comments, label assignments, and attachment uploads.

Only the owner can delete a project or assign the admin role. Admins cannot manage another admin. The owner cannot be removed or reassigned through member management. Comment editing is restricted to the author; owners/admins can also delete other users' comments. Attachments can be deleted by their uploader or a project owner/admin.

## Docker

The project can be started as a complete three-service stack:

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

## Local Development

### Requirements

* Node.js 24.x and npm
* Docker with Docker Compose

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

The backend runs at `http://localhost:3001`.

Health check:

```text
GET http://localhost:3001/health
```

Use the following command when creating a new Prisma migration:

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

The frontend runs at `http://localhost:3000`.

Open `http://localhost:3000/register` to create an account or `http://localhost:3000/login` to sign in. Successful authentication opens `/dashboard`.

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

## API Overview

The API has no `/api` prefix. Protected HTTP routes require:

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

Authenticated connections automatically join `user:<userId>`.

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
71 API E2E tests
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
| Backend API E2E         |      71 |
| Frontend Vitest         |     170 |
| Frontend Playwright E2E |       3 |
| **Total**               | **522** |

## CI/CD

GitHub Actions runs on pull requests and pushes to `main`, `master`, and `develop`.

The workflow is defined in `.github/workflows/ci.yml`.

The pipeline contains four jobs:

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
```

Production deployment is not configured yet.

## Security and Implementation Notes

* Passwords and refresh tokens are stored as hashes.
* API user projections exclude passwords.
* The frontend stores access and refresh tokens in local storage and sends access tokens as bearer tokens.
* Attachment downloads through the API check project membership and preserve the original filename.
* Static `/uploads` serving remains enabled without a JWT guard.
* HTTP CORS is configurable.
* The Socket.IO gateway currently declares its own origin policy separately from HTTP CORS.

## Remaining Work

* Production deployment configuration.
* Broader browser E2E coverage for projects, comments, labels, notifications, attachments, and RBAC edge cases.
* Optional frontend coverage reporting with a dedicated Vitest coverage provider.
