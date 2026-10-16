# Task Tracker

A full-stack issue and project management platform inspired by Jira and Kaiten. The project combines a NestJS REST API, a Next.js frontend, PostgreSQL persistence, role-based access control, real-time collaboration, Kanban workflows, notifications, file attachments, and calendar-based task tracking.

## Demo

Production:

- Frontend: <https://app.mytasktrackeronline.ru>
- API: <https://api.mytasktrackeronline.ru>
- Health check: <https://api.mytasktrackeronline.ru/health>

## Current Features

### Backend

- **Authentication:** registration, login, current user, JWT access and refresh tokens, refresh-token rotation, logout, bcrypt password hashing, and email-based password recovery.
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

- Registration, login, logout, password recovery, protected routes, session restoration, and automatic token refresh.
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
/forgot-password
/reset-password
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
| Authentication        | JWT, Passport, bcrypt, Nodemailer / SMTP                   |
| Uploads and real-time | Multer, local filesystem, Socket.IO 4                      |
| Frontend              | Next.js 16.3.8+, React 19.2.8, TypeScript, Tailwind CSS 4  |
| UI components         | shadcn/ui (Radix Nova), Radix UI, Lucide icons             |
| State and forms       | Redux Toolkit, TanStack Query, Axios, React Hook Form, Zod |
| Backend testing       | Jest 30, SWC, Nest testing utilities, Supertest            |
| Frontend testing      | Vitest 4, React Testing Library, jsdom, Playwright         |
| Drag and drop         | dnd-kit                                                    |
| Infrastructure        | Docker Compose, Dockerfiles, Nginx, GitHub Actions, GHCR   |

Recharts is installed, while current dashboard distributions are rendered with CSS bars.

### UI customization

Shared UI components live in `frontend/src/components/ui`, with the shadcn configuration in `frontend/components.json`. Buttons, inputs, textareas, native selects, labels, cards, badges, alerts, loading skeletons, and the notification popover use these components. Theme colors, typography, and corner radii are defined in `frontend/src/app/globals.css`; the palette uses `#FF9200` orange accents in both light and dark modes. The sun/moon control is available on public pages and in the application header. The first visit follows the system preference; a manual choice is saved locally under `task-tracker-theme` and persists across navigation and reloads. Customize the shared components to apply consistent changes across screens.

To add a component, run `npx shadcn@latest add <component>` from `frontend`. Review generated changes before overwriting existing customized components.

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
│       ├── unit/          # Jest unit tests│       └── API E2E tests and test environment
│
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example
    ├── test/             # Vitest tests, setup and Playwright e2e/
    ├── playwright.config.ts
    ├── vitest.config.mts
    └── src/
        ├── app/
        ├── components/
        ├── hooks/
        ├── lib/
        ├── providers/
        └── store/
```

The backend uses feature modules, controllers for HTTP routes, services for business rules and access checks, DTOs declaring validation constraints, and Prisma for persistence. The E2E bootstrap installs a global `ValidationPipe`; the current application bootstrap does not.

## Domain Model

- `User` joins a `Project` through `ProjectMember`.
- A project has boards, tasks, labels, and notifications; project activity is collected through its tasks.
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

## Local Development

Use Node.js 24.x, npm, and Docker with Docker Compose. Backend and frontend have separate package manifests and lockfiles; run npm commands in the indicated directory.

### Environment

Create `backend/.env` from [backend/.env.example](backend/.env.example). Required startup variables are `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/task_tracker"
JWT_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-refresh-secret"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

Create `frontend/.env.local` from [frontend/.env.example](frontend/.env.example):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Run with local Node.js processes

First start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Then install and start the backend:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
node -e "require('node:fs').mkdirSync('uploads', { recursive: true })"
npm run start:dev
```

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open [registration](http://localhost:3000/register) or [login](http://localhost:3000/login); authentication opens `/dashboard`. Check backend/database connectivity at [http://localhost:3001/health](http://localhost:3001/health).

For schema changes, run `npx prisma migrate dev --name <migration-name>` from `backend/`. Use `npx prisma validate` to validate the schema.

### Run the complete Docker stack

After creating `backend/.env`, run from the repository root:

```bash
docker compose up -d --build
```

| Service        | Purpose                                                           | Local host port           |
| -------------- | ----------------------------------------------------------------- | ------------------------- |
| `postgres`     | PostgreSQL 17 with the `postgres_data` volume                     | `5433` → container `5432` |
| `uploads-init` | One-shot initialization of upload ownership for UID/GID 1000      | None                      |
| `backend`      | NestJS; waits for PostgreSQL and successful upload initialization | `3001`                    |
| `frontend`     | Next.js; waits for backend health                                 | `3000`                    |

The backend applies Prisma migrations before starting the HTTP server. Attachments persist in `uploads_data`; `uploads-init` finishing with exit code 0 is expected.

PostgreSQL and Node images come from `public.ecr.aws/docker/library/`, including the base images in both Dockerfiles. No Docker Hub credentials are used by the current workflows. Public registries can still throttle pulls; CI handles dependency pulls as described below.

Compose overrides the backend database address to `postgres:5432`. `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` can be set in the shell or a root Compose `.env`; their defaults are `http://localhost:3000` and `http://localhost:3001`. The API URL must be reachable by the browser and is embedded during the frontend build, so changing it requires rebuilding the frontend image.

Stop local Node.js servers before starting the complete stack to avoid port conflicts. `docker compose down` stops the stack while retaining its volumes.

### Builds

From `backend/`:

```bash
npm run build
node dist/main.js
```

From `frontend/`:

```bash
npm run build
npm start
```

Frontend development and builds explicitly use Webpack.

## Password Recovery

`/forgot-password` requests an email link; `/reset-password?token=...` sets a new password. Configure the backend SMTP variables in `backend/.env` locally or `.env.production` on the VPS:

| Variable                     | Purpose                                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| `SMTP_HOST`, `SMTP_FROM`     | SMTP server and sender; required for delivery                       |
| `SMTP_PORT`, `SMTP_SECURE`   | Provider-specific port and TLS mode                                 |
| `SMTP_USER`, `SMTP_PASSWORD` | SMTP credentials, configured together when authentication is needed |
| `FRONTEND_URL`               | Public frontend origin used to construct reset links                |

The backend example uses port `587` with `SMTP_SECURE=false`; the production example uses `2465` with `true`. Replace these with your provider's settings. Without SMTP configuration the application can start, but reset emails cannot be delivered.

Reset tokens expire after 30 minutes, are stored as SHA-256 hashes, and can be used once. Requests for the same account have a 60-second cooldown and return a generic response regardless of account existence or delivery failure. A successful reset invalidates the stored refresh token; already issued access tokens remain valid until expiry.

## Production Deployment

The production topology is Nginx / HTTPS → frontend (`127.0.0.1:3000`) and backend (`127.0.0.1:3001`) → PostgreSQL on the internal Docker network. The repository includes an [Nginx example](deploy/nginx/task-tracker.conf.example) with Socket.IO forwarding and Let's Encrypt certificate paths; Nginx installation and certificate provisioning are separate VPS setup steps.

### Configuration

Create `.env.production` on the VPS from [.env.production.example](.env.production.example). Set the database credentials, JWT secrets, `GHCR_IMAGE_NAMESPACE`, `IMAGE_TAG`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and SMTP settings for password recovery. The production Compose file constructs `DATABASE_URL` from the PostgreSQL variables; use URL-safe database credentials as in the example.

Application images come from GHCR; PostgreSQL and `uploads-init` use ECR Public. Backend runs as UID 1000, and both application services use `no-new-privileges`. PostgreSQL and attachments use persistent volumes. Backend health checks have a **180-second startup grace period** to allow migrations and slower VPS startup before failures count toward an unhealthy state.

GitHub configuration:

| Setting                                       | Purpose                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| Variable `NEXT_PUBLIC_API_URL`                | Production API origin embedded when CI builds the frontend |
| Secrets `VPS_HOST`, `VPS_USER`, `VPS_APP_DIR` | SSH destination and existing application directory         |
| Secrets `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`      | SSH private key and trusted server host keys               |
| Environment `production`                      | Deployment environment used by the Deploy job              |

CI uses the built-in `GITHUB_TOKEN` with `packages: write` for GHCR publishing. `DOCKERHUB_TOKEN` and `DOCKERHUB_USERNAME` are not referenced. Deploy does not log the VPS into GHCR: private application images require registry access configured on the server beforehand. Keep actual `.env` files and secret values outside Git.

### Release flow

After CI succeeds for a push to `main`, [deploy.yml](.github/workflows/deploy.yml):

1. Checks out the successful CI commit and uses its SHA as `IMAGE_TAG`.
2. Uploads that commit's production Compose file as a temporary file in `VPS_APP_DIR`.
3. Validates it and pulls release images, retrying up to three times with 10- and 20-second delays.
4. Replaces the active Compose file only after pulls succeed, then runs `up -d --remove-orphans`.
5. Checks the backend health endpoint and frontend HTTP response; collects service logs on deployment failure or health timeout.
6. Removes dangling Docker images after success.

The workflow leaves `.env.production` and data volumes on the VPS. It does not install Nginx, provision TLS, or configure database backup timers. A failure after container replacement does not automatically roll back the release.

### Troubleshooting on the VPS

From the application directory:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps -a
docker compose --env-file .env.production -f docker-compose.prod.yml logs --no-color --tail=100 backend
```

If backend is now healthy but frontend remains `Created` after an earlier startup timeout, start the existing frontend container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml start frontend
```

This starts the existing image without selecting a new release tag. For a new release, use the deployment workflow so the Compose file and image SHA stay aligned.

## Production Backup and Restoration

The previously documented VPS backup setup uses a separately provisioned systemd timer. Its script and unit files are not included in this repository, and CI/CD does not install them. Verify the timer on the server before relying on the schedule below.

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

To test an existing SQL dump in a temporary database:

```bash
cd /opt/task-tracker

POSTGRES_CONTAINER=$(sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps -q postgres)

BACKUP="/opt/task-tracker/backups/postgres_<timestamp>.sql.gz"

sudo docker exec "$POSTGRES_CONTAINER" \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE restore_test_manual;"'

sudo gzip -dc "$BACKUP" | sudo docker exec -i \
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

Check the restored schema and application data against the chosen backup; table counts change with migrations. Database dumps do not include files in the `uploads_data` volume.

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
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                         |
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

The maximum declared page size is `100`. Sort fields are `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`, and `position`, with `asc` or `desc` ordering.

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

Unit tests cover business services, task mapping, authentication, JWT strategy, real-time services, gateway behavior, and guards.

API E2E tests exercise authentication, projects, boards, tasks, comments, labels, attachments, and application endpoints against PostgreSQL. Use a dedicated migrated test database and backend environment variables: these tests create persistent users and project data.

### Frontend Tests

From `frontend/`:

```bash
npm test
npm run lint
npm run build
```

Vitest and React Testing Library cover utility functions, query and mutation hooks, real-time hooks, components, and pages.

Playwright covers registration/login, task creation/movement, project creation/deletion, comment editing/deletion, label management/assignment, attachment validation/download/deletion, notification navigation/read state, and member/admin/outsider access boundaries. Password recovery tests use a real SMTP message captured by [Mailpit](https://mailpit.axllent.org/docs/api-v1/), check new credentials, revoked refresh tokens, reused/invalid links, mismatched passwords, and unknown email addresses.

All backend tests live in `backend/test` (unit tests in `unit/`); all frontend tests live in `frontend/test` (browser tests in `e2e/`). Start a disposable test stack from the repository root using the main Compose file's `e2e` profile. `backend/test/e2e.env` routes mail to Mailpit and supplies test-only JWT secrets; no local `.env` or production credentials are needed. Ports 3000, 3001, 5433 and 8025 must be free:

```bash
export BACKEND_ENV_FILE=./backend/test/e2e.env
docker compose -p task-tracker-e2e --profile e2e up -d --build --wait
```

In PowerShell use `$env:BACKEND_ENV_FILE='./backend/test/e2e.env'` instead of `export`. The ordinary Compose stack does not start Mailpit unless the `e2e` profile is enabled.

PowerShell, from the repository root (the ports above must be free):

```powershell
$env:BACKEND_ENV_FILE='./backend/test/e2e.env'
docker compose -p task-tracker-e2e --profile e2e up -d --build --wait
Invoke-RestMethod http://localhost:8025/api/v1/messages
cd frontend
npm run test:e2e -- --reporter=list
```

`ECONNREFUSED` on port 8025 means Mailpit is not reachable. Starting only the regular application stack is insufficient: the backend must also use the test SMTP settings from `backend/test/e2e.env`. Stop any ordinary local stack occupying these ports with `docker compose stop` before starting the separate E2E stack; this keeps its data. Do not delete ordinary or production volumes to fix an E2E failure.

Install Chromium and run tests from `frontend`:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright does not start servers automatically. Each scenario creates independent test data; retries use fresh users/projects. Use only a disposable backend. Defaults are frontend `http://localhost:3000`, API `http://localhost:3001`, and Mailpit `http://localhost:8025`. Override these with `E2E_BASE_URL`, `E2E_API_URL` and `E2E_MAIL_URL` (also align backend `FRONTEND_URL`, CORS and frontend API build settings).

Password recovery tests require Mailpit and fail if it is unavailable. No real mailbox credentials or new CI secrets are needed. After testing, remove only the disposable stack and its data from the repository root:

```bash
docker compose -p task-tracker-e2e --profile e2e down -v
```

Use `npm run test:watch` for Vitest watch mode and `npm run test:e2e:ui` for Playwright's UI.

To measure code coverage, run from the repository root:

```bash
npm --prefix backend run test:cov -- --runInBand
npm --prefix frontend run test:coverage
```

Both commands print statements, branches, functions and lines percentages, including source files not exercised by tests. HTML reports are written to `backend/coverage/index.html` and `frontend/coverage/index.html`; JSON summaries and LCOV files are also available in those directories. These percentages measure Jest/Vitest code coverage, not the percentage of user scenarios covered by Playwright. Browser E2E coverage instrumentation is not configured.

## CI/CD

[ci.yml](.github/workflows/ci.yml) runs on pull requests and pushes to `main`, `master`, and `develop`:

- **Backend:** Ubuntu 24.04, Node.js 24 and native PostgreSQL 17, installed from PGDG if missing. An isolated `17/ci` cluster on port 5434 is checked with a password-authenticated SQL query before Prisma migrations, unit tests, build and API E2E tests. There is no Docker service pull before job steps.
- **Frontend:** unit tests, ESLint, and production build.
- **Docker:** Compose validation and application image builds.
- **Frontend E2E:** enables the main Compose file's `e2e` profile and uses `backend/test/e2e.env`. It resolves the images for `postgres`, `uploads-init` and `mailpit` from Compose and pulls them sequentially, reusing local images. If ECR Public fails, `.github/scripts/pull-image.sh` tries the same official image tag on Docker Hub and tags it with the name expected by Compose. GHCR images are retried without registry substitution. There are up to five rounds with 15/30/60/120-second delays; both public registries can impose limits. The Docker build job also uses this helper for its Node pre-pull. Application images are built separately, the stack starts with `--no-build --pull never`, then Chromium tests run and upload the Playwright report. Cleanup removes the test project volumes.
- **Publish:** after all checks pass on a push to `main`, publishes backend/frontend images to GHCR with commit-SHA and `latest` tags using Buildx and GitHub Actions cache. A successful CI run triggers the production release flow described above.

## Security and Implementation Notes

- Passwords and refresh tokens are stored as hashes.
- API user projections exclude passwords.
- The frontend stores access and refresh tokens in local storage and sends access tokens as bearer tokens.
- Attachment downloads go through authenticated API endpoints and verify project access.
- Uploaded files are stored in persistent Docker storage but are not exposed through a public static `/uploads` route.
- HTTP CORS is configurable.
- The Socket.IO gateway declares its own origin policy separately from HTTP CORS.
- Production secrets are stored outside the repository in `.env.production`.

## Remaining Work

`

- Basic production monitoring and centralized log collection.
