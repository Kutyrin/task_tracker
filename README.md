# Task Tracker

A full-stack issue and project management application inspired by Jira and Kaiten.

The backend provides a PostgreSQL-backed API for projects, Kanban boards, issues, comments, labels, activity history, attachments, statistics, and real-time events. The frontend currently implements authentication and a protected dashboard shell; project and board screens are still to be built.

## Current Features

### Backend

- **Authentication:** registration, login, current user, JWT access and refresh tokens, refresh-token rotation, logout, and bcrypt password hashing.
- **Projects:** CRUD, unique project keys, automatic owner membership, and member management by user ID or email.
- **Access control:** project membership checks and `OWNER`, `ADMIN`, and `MEMBER` roles.
- **Boards:** CRUD, default Backlog / To Do / In Progress / Done columns, column management and reordering.
- **Issues:** CRUD, movement between columns, ordering, reporter, assignee, due date, and project-scoped issue keys such as `TASK-6`.
- **Issue types:** `TASK`, `BUG`, `STORY`, `EPIC`; priorities: `LOW`, `MEDIUM`, `HIGH`.
- **Issue queries:** search by key, title, or description; filters by column, type, priority, label names, and due-date range; pagination and sorting.
- **Comments:** creation, listing, editing own comments, and deletion by the author or a project owner/admin.
- **Labels:** project-scoped unique names, label management, and issue-label assignments.
- **Activity history:** task creation and movement, field changes, comments, and label assignments; task and project activity endpoints.
- **Attachments:** upload, list, and delete files attached to tasks. Uploads use multipart field `file`, with a 5 MiB limit and JPEG, PNG, GIF, WebP, PDF, and plain-text MIME types.
- **Project statistics:** total and overdue tasks, with counts by priority, issue type, column, and assignee. The current overdue calculation uses past due dates and an associated column whose name is not `Done`.
- **Real-time updates:** Socket.IO events for projects, members, boards, columns, tasks, comments, labels, attachments, and activity.
- **Health check:** `GET /health` checks database connectivity.

### Frontend

- Next.js App Router pages: `/`, `/register`, `/login`, and `/dashboard`.
- Registration and login forms using React Hook Form and Zod.
- Redux Toolkit authentication state and session restoration from local storage.
- Axios bearer-token requests and automatic refresh on eligible `401` responses, with concurrent refresh requests deduplicated.
- Protected dashboard displaying the current user's email and a logout action.
- TanStack Query provider and Tailwind CSS styling.

The dashboard is currently a placeholder. Installed dnd-kit and Recharts dependencies do not yet correspond to implemented board or analytics screens. The frontend does not yet subscribe to backend Socket.IO events.

## Tech Stack

| Area                  | Current stack                                              |
| --------------------- | ---------------------------------------------------------- |
| Runtime               | Node.js 24 in Docker and CI, npm                           |
| Backend               | NestJS 12, TypeScript, Prisma 6.19.3, PostgreSQL 17        |
| Authentication        | JWT, Passport, bcrypt                                      |
| Uploads and real-time | Multer / local filesystem, Socket.IO 4                     |
| Frontend              | Next.js 16.3.3, React 19.2.8, TypeScript, Tailwind CSS 4   |
| State and forms       | Redux Toolkit, TanStack Query, Axios, React Hook Form, Zod |
| Backend testing       | Jest 30, SWC, Nest testing utilities, Supertest            |
| Infrastructure        | Docker Compose, backend Dockerfile, GitHub Actions         |

Vitest, React Testing Library, and Playwright are installed in the frontend, but frontend test suites and test scripts are not yet configured. Production deployment is not configured; the CI deployment job is a placeholder.

## Repository Structure

```text
.
├── .github/workflows/       # Backend tests, build, and Docker image build
├── docker-compose.yml      # PostgreSQL and backend services
├── backend/
│   ├── Dockerfile
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
│   │   ├── realtime/
│   │   ├── prisma/
│   │   ├── app.module.ts
│   │   ├── health.controller.ts
│   │   └── main.ts
│   └── test/               # API E2E tests and a manual real-time client
└── frontend/
    ├── .env.example
    └── src/
        ├── app/            # Home, login, registration, dashboard
        ├── components/auth/
        ├── lib/            # API client, auth API, token storage
        ├── providers/      # Redux, Query, session initialization
        └── store/          # Auth slice and typed hooks
```

The backend uses feature modules, controllers for HTTP routes, services for business rules and access checks, and Prisma for persistence. DTOs declare validation constraints; the E2E bootstrap installs a global `ValidationPipe`, while the current application bootstrap does not.

### Domain Model

- `User` joins a `Project` through `ProjectMember`.
- A project has boards, tasks, and labels.
- A board contains ordered `BoardColumn` records; tasks can be assigned to a column.
- `Task` is the persistence model for an issue, with a reporter and optional assignee.
- Tasks have comments, activity records, and attachments, each linked to a user.
- `TaskLabel` connects tasks and labels.

Issue numbers are generated per project by atomically incrementing `Project.issueSequence` inside a Prisma transaction. The project key and number form the display key, for example `TASK-6`.

### Roles

- `OWNER`: project settings, members, board structure, labels, issues, and project deletion.
- `ADMIN`: project settings, members subject to owner restrictions, board structure, labels, and issues.
- `MEMBER`: project access, issue management and movement, comments, label assignments, and attachment uploads.

Only the owner can delete a project or assign the admin role. Admins cannot manage another admin. The owner cannot be removed or reassigned through member management. Comment editing is restricted to the author; owners/admins can also delete other users' comments. Attachments can be deleted by their uploader or a project owner/admin.

## Local Development

### Requirements

- Node.js 24.x and npm.
- Docker with Docker Compose for PostgreSQL and the optional containerized backend.

Backend and frontend have separate `package.json` and lockfiles. Run npm commands in the corresponding directory.

### 1. Configure the backend

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/task_tracker"
JWT_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-refresh-secret"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

`DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are required at startup. `PORT` defaults to `3001`; HTTP `CORS_ORIGIN` defaults to `http://localhost:3000`. Environment files are ignored by Git.

### 2. Start PostgreSQL

From the repository root, start only the database when running the backend locally:

```bash
docker compose up -d postgres
```

PostgreSQL is exposed on host port `5433`, mapped to container port `5432`. Data persists in the `postgres_data` volume.

### 3. Install and run the backend

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
node -e "require('node:fs').mkdirSync('uploads', { recursive: true })"
npm run start:dev
```

The backend runs at [http://localhost:3001](http://localhost:3001). Check [http://localhost:3001/health](http://localhost:3001/health) for the API/database health response.

Use `npx prisma migrate dev --name <migration-name>` when creating a schema migration. `npx prisma validate` validates the schema.

### 4. Install and run the frontend

Create `frontend/.env.local` using `frontend/.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

In a separate terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000/register](http://localhost:3000/register) to create an account, or [http://localhost:3000/login](http://localhost:3000/login) to sign in. Successful authentication opens `/dashboard`.

### Alternative: backend and database in Docker

After creating `backend/.env`, run from the repository root:

```bash
docker compose up -d --build
```

Compose starts PostgreSQL and the backend, waits for database health, overrides `DATABASE_URL` to use the internal `postgres:5432` address, and exposes the backend on port `3001`. The backend container applies migrations before starting and stores uploads in the `uploads_data` volume.

The frontend must still be run separately. Stop a locally running backend before starting the container to avoid a port conflict. Compose sets HTTP `CORS_ORIGIN` from the shell or root Compose `.env`, defaulting to `http://localhost:3000`.

### Builds

Backend, from `backend/`:

```bash
npm run build
node dist/main.js
```

Frontend, from `frontend/`:

```bash
npm run build
npm start
```

Frontend development and build scripts explicitly use Webpack.

## API Overview

The API has no `/api` prefix. Protected HTTP routes require `Authorization: Bearer <accessToken>`.

| Resource           | Routes                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health             | `GET /health`                                                                                                                                                                           |
| Authentication     | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                                                                                    |
| Projects           | `POST /projects`, `GET /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`                                                                                   |
| Project statistics | `GET /projects/:id/stats`                                                                                                                                                               |
| Members            | `GET /projects/:projectId/members`, `POST /projects/:projectId/members`, `PATCH /projects/:projectId/members/:memberId`, `DELETE /projects/:projectId/members/:memberId`                |
| Boards             | `POST /boards`, `GET /boards`, `GET /boards/:id`, `PATCH /boards/:id`, `DELETE /boards/:id`                                                                                             |
| Columns            | `POST /boards/:boardId/columns`, `GET /boards/:boardId/columns`, `PATCH /boards/:boardId/columns/:id`, `PATCH /boards/:boardId/columns/:id/move`, `DELETE /boards/:boardId/columns/:id` |
| Issues             | `POST /tasks`, `GET /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`, `PATCH /tasks/:id/move`, `DELETE /tasks/:id`                                                                         |
| Comments           | `POST /tasks/:taskId/comments`, `GET /tasks/:taskId/comments`, `PATCH /tasks/:taskId/comments/:commentId`, `DELETE /tasks/:taskId/comments/:commentId`                                  |
| Project labels     | `GET /projects/:projectId/labels`, `POST /projects/:projectId/labels`, `PATCH /projects/:projectId/labels/:labelId`, `DELETE /projects/:projectId/labels/:labelId`                      |
| Task labels        | `GET /tasks/:taskId/labels`, `POST /tasks/:taskId/labels`, `DELETE /tasks/:taskId/labels/:labelId`                                                                                      |
| Activity           | `GET /tasks/:taskId/activities`, `GET /projects/:projectId/activities`                                                                                                                  |
| Attachments        | `GET /tasks/:taskId/attachments`, `POST /tasks/:taskId/attachments`, `DELETE /tasks/:taskId/attachments/:attachmentId`                                                                  |

### Issue Queries

```text
GET /tasks?search=TASK-6
GET /tasks?issueType=BUG&priority=HIGH
GET /tasks?labels=backend,urgent
GET /tasks?columnId=3
GET /tasks?dueAfter=2026-09-01T00:00:00.000Z&dueBefore=2026-09-30T23:59:59.000Z
GET /tasks?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

`labels` takes comma-separated label names. Query DTO defaults are `page=1`, `limit=10`, `sortBy=createdAt`, and `sortOrder=desc`, with a declared maximum limit of `100`. Sort fields are `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`, and `position`; sort order is `asc` or `desc`.

### Real-time API

Connect a Socket.IO client to the backend with `auth: { token: accessToken }`. Authenticated connections automatically join `user:<userId>`.

Send `join-project` with a numeric project ID or `join-task` with a numeric task ID to subscribe to the corresponding room. Both handlers check project membership. Example events include `task.created`, `task.updated`, `task.moved`, `comment.created`, `activity.created`, and `project.access.revoked`.

## Tests and CI

From `backend/`:

```bash
npm test -- --runInBand
npm run test:cov
npm run test:e2e
```

Unit tests cover services, task mapping, JWT strategy, and real-time gateway/guard behavior. E2E suites exercise authentication, projects, boards, tasks, comments, labels, attachments, and application endpoints against PostgreSQL.

E2E tests need the backend environment variables and an already migrated database. Use a dedicated test database: the suites create persistent users and project data. Point `DATABASE_URL` at that database before applying migrations and running tests.

From `frontend/`, run `npm run lint` and `npm run build` for the currently configured checks.

GitHub Actions runs on pull requests and pushes to `main`, `master`, and `develop`. It provisions PostgreSQL 17, installs dependencies with Node.js 24, generates Prisma Client, applies migrations, runs backend unit tests, builds the backend, runs E2E tests, and builds the backend Docker image. The final deployment job only prints placeholder messages; frontend checks are not included.

## Current Implementation Notes

- Passwords and refresh tokens are stored as hashes; API user projections exclude passwords.
- The frontend stores access and refresh tokens in local storage and sends access tokens as bearer tokens.
- Attachment API operations check membership, but uploaded files are currently served directly under `/uploads` without a JWT guard.
- HTTP CORS is configurable; the Socket.IO gateway currently declares `origin: '*'` separately.

## Remaining Work

- Frontend project, membership, Kanban, and issue screens.
- Frontend comments, labels, activity, attachments, and real-time integration.
- Calendar/due-date views and statistics visualizations.
- A notification feature beyond the existing real-time events.
- Frontend automated tests and CI checks.
- Production deployment configuration.
