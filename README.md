# Email Job Scheduler

A full-stack email scheduling and delivery system built with TypeScript, Express, BullMQ, Redis, PostgreSQL, Prisma, Elasticsearch, React, and Tailwind CSS.

The application allows users to create email campaigns, schedule large batches of emails, control delivery rate and delay, search email records, monitor queues, and receive Slack notifications when an hourly sending limit is reached.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Email Campaign Scheduling](#email-campaign-scheduling)
- [Rate Limiting and Scheduling Windows](#rate-limiting-and-scheduling-windows)
- [Email Delivery](#email-delivery)
- [BullMQ Worker](#bullmq-worker)
- [Restart Recovery](#restart-recovery)
- [Duplicate Processing Protection](#duplicate-processing-protection)
- [Elasticsearch Search](#elasticsearch-search)
- [Slack Integration](#slack-integration)
- [Slack Hourly Limit Notification](#slack-hourly-limit-notification)
- [Bull Board](#bull-board)
- [Dashboard](#dashboard)
- [Large Batch Scheduling](#large-batch-scheduling)
- [Database Design](#database-design)
- [Important API Areas](#important-api-areas)
- [Running the Complete Application](#running-the-complete-application)
- [Testing Checklist](#testing-checklist)
- [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)
- [Development Notes](#development-notes)
- [Author](#author)

---

## Features

- Google OAuth authentication
- Email campaign scheduling
- Multiple senders
- CSV/TXT recipient upload
- Configurable start time
- Configurable delay between individual emails
- Configurable hourly sending limit
- BullMQ + Redis persistent job scheduling
- Configurable worker concurrency
- PostgreSQL persistence using Prisma
- Ethereal SMTP for test email delivery
- Elasticsearch-powered email search
- Scheduled emails dashboard
- Sent emails dashboard
- Slack OAuth integration
- Slack notification when hourly sending limit is reached
- Bull Board queue monitoring
- Restart recovery for scheduled jobs
- Support for large batches of emails
- Idempotent job claiming to reduce duplicate processing
- Delivery attempt tracking
- Campaign statistics and status tracking

---

## Technology Stack

### Backend

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Nodemailer
- Ethereal Email
- Elasticsearch
- Passport.js
- Google OAuth
- Slack OAuth

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- Redis
- Elasticsearch

---

## System Architecture

```text
                     ┌──────────────────────┐
                     │       React UI       │
                     │   TypeScript +       │
                     │      Tailwind        │
                     └──────────┬───────────┘
                                │
                                │ HTTP / REST
                                ▼
                     ┌──────────────────────┐
                     │   Express Backend    │
                     │      TypeScript      │
                     └───────┬──────┬───────┘
                             │      │
                ┌────────────┘      └─────────────┐
                ▼                                 ▼
       ┌─────────────────┐              ┌─────────────────┐
       │   PostgreSQL    │              │      Redis      │
       │                 │              │                 │
       │ Users           │              │ BullMQ queues   │
       │ Campaigns       │              │ Job state       │
       │ Email Jobs      │              │ OAuth state     │
       │ Attempts        │              │ Notifications   │
       │ Senders         │              └────────┬────────┘
       └─────────────────┘                       │
                                                 ▼
                                        ┌─────────────────┐
                                        │ BullMQ Workers  │
                                        │                 │
                                        │ Email delivery  │
                                        └────────┬────────┘
                                                 │
                              ┌──────────────────┴──────────────┐
                              ▼                                 ▼
                     ┌─────────────────┐               ┌─────────────────┐
                     │  Ethereal SMTP  │               │  Elasticsearch  │
                     │ Email Delivery  │               │  Email Search   │
                     └─────────────────┘               └────────┬────────┘
                                                                │
                                                                ▼
                                                         Search Results
```

---

## Project Structure

```text
email-job-schedular/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   └── src/
│       ├── config/
│       ├── generated/
│       ├── middleware/
│       ├── modules/
│       ├── queue/
│       ├── services/
│       └── app.ts
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── services/
│       ├── types/
│       └── App.tsx
│
├── infrastructure/
│   └── docker-compose.yml
│
├── .env
├── .gitignore
└── README.md
```

---

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- Docker Desktop
- Git

The project uses Docker for:

- PostgreSQL
- Redis
- Elasticsearch

---

## Infrastructure Setup

From the project root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Check the containers:

```bash
docker ps
```

The infrastructure contains:

- PostgreSQL
- Redis
- Elasticsearch

PostgreSQL is exposed on port `5433` in the current local setup.

---

## Backend Setup

Go to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

The backend runs on: <http://localhost:4000>

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend runs on: <http://localhost:5173>

---

## Environment Variables

Create the required environment configuration in the backend.

Example:

```env
DATABASE_URL="postgresql://scheduler:scheduler_password@localhost:5433/email_scheduler?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=4000
FRONTEND_URL="http://localhost:5173"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

JWT_SECRET="your-jwt-secret"

ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT="587"
ETHEREAL_USER="your-ethereal-user"
ETHEREAL_PASSWORD="your-ethereal-password"

ELASTICSEARCH_URL="http://localhost:9200"

SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_CALLBACK_URL="http://localhost:4000/auth/slack/callback"

WORKER_CONCURRENCY="5"
```

> **Warning:** Do not commit real credentials or secrets to GitHub.

---

## Authentication

The application uses Google OAuth.

### Authentication Flow

```text
User
  ↓
Google Login
  ↓
Google OAuth
  ↓
Backend callback
  ↓
User created/found in PostgreSQL
  ↓
Authenticated dashboard
```

### Dashboard Account Information

The dashboard displays:

- Google profile name
- Email
- Profile image
- Logout option

---

## Email Campaign Scheduling

A campaign contains:

- Sender
- Subject
- Body
- Recipients
- Start time
- Delay between emails
- Hourly sending limit

### Example

| Setting      | Value |
| ------------ | ----- |
| Recipients   | 1000  |
| Start time   | 10:00 |
| Delay        | 0 ms  |
| Hourly limit | 100   |

The scheduler distributes email jobs across available hourly capacity.

---

## Rate Limiting and Scheduling Windows

Hourly capacity is represented using PostgreSQL `ScheduleWindow` records.

Each scheduling window contains:

- Sender
- Window start
- Window end
- Capacity
- Reserved count

This allows large campaigns to be distributed across multiple hourly windows before jobs are placed into BullMQ.

### Example

With an hourly limit of 100:

- 100 emails → Hour 1
- 100 emails → Hour 2
- 100 emails → Hour 3
- ...

The scheduler reserves capacity before creating the individual email jobs. This prevents a large campaign from being scheduled entirely into a single hourly window.

---

## Email Delivery

BullMQ is used for asynchronous email delivery.

### Delivery Flow

```text
Campaign created
      ↓
EmailJob records created
      ↓
BullMQ jobs created
      ↓
Worker receives job
      ↓
Email job claimed
      ↓
Ethereal SMTP
      ↓
Delivery result stored in PostgreSQL
      ↓
Elasticsearch updated
```

Ethereal is used as the SMTP provider for development and demonstration purposes. Ethereal provides a preview URL for sent test emails.

---

## BullMQ Worker

The worker processes email jobs from Redis.

Worker concurrency can be configured using:

```env
WORKER_CONCURRENCY=5
```

This controls how many jobs a worker can process concurrently.

BullMQ is used instead of cron-based scheduling.

---

## Restart Recovery

Scheduled email jobs are persisted in PostgreSQL.

When the backend starts, the application checks for email jobs that are still scheduled or retrying and restores missing BullMQ jobs.

```text
PostgreSQL
    ↓
Application restart
    ↓
Find scheduled/retrying jobs
    ↓
Restore missing BullMQ jobs
    ↓
Workers continue processing
```

This prevents scheduled jobs from being lost when the backend restarts.

---

## Duplicate Processing Protection

Email jobs use a processing token and database state transition.

A job must move through the following states:

```text
SCHEDULED / RETRYING
        ↓
    PROCESSING
        ↓
   SENT / FAILED
```

Only a job that can successfully transition into `PROCESSING` is allowed to continue with delivery. Delivery attempts are stored separately for tracking.

This provides application-level idempotency protection around job processing.

> **Note:** The SMTP provider remains an external side-effect boundary, so generic exactly-once delivery cannot be guaranteed across a database transaction and an external SMTP server.

---

## Elasticsearch Search

Email records are indexed in Elasticsearch.

The dashboard provides search across indexed email data.

### Example

Search for: `Hourly`

The frontend calls:

```http
GET /api/search?q=Hourly
```

The backend authenticates the user and performs the Elasticsearch search. Search results are displayed in the dashboard.

---

## Slack Integration

The application supports Slack OAuth.

Users can connect Slack from the dashboard without redeploying the application.

### Slack Connection Flow

```text
Dashboard
    ↓
Connect Slack
    ↓
Slack OAuth
    ↓
Slack callback
    ↓
Integration stored
    ↓
Dashboard shows connected workspace/channel
```

The Slack integration stores the OAuth integration information required to send notifications.

---

## Slack Hourly Limit Notification

When the configured hourly sending limit is reached, the application can send a Slack notification.

### Example Notification

```text
Hourly email limit reached

Sender: sender@example.com
Hourly limit: 100

The remaining emails will continue in the next available hourly window.
```

Redis is used to prevent duplicate notifications for the same sender and hour.

If Slack is not connected, email scheduling continues without depending on Slack availability.

---

## Bull Board

Bull Board provides a dashboard for monitoring BullMQ queues.

Open: <http://localhost:4000/admin/queues>

It can be used to inspect:

- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Queue activity

---

## Dashboard

The frontend dashboard provides the following sections.

### Statistics

- Total campaigns
- Scheduled emails
- Sent emails
- Account information

### Slack

- Slack connection status
- Workspace
- Channel
- Test notification
- Disconnect

### Search

Search scheduled and sent email records through Elasticsearch.

### Schedule Campaign

Configure:

- Sender
- Subject
- Body
- Recipients
- Start time
- Delay
- Hourly limit

### Scheduled Emails

Displays upcoming email jobs.

### Sent Emails

Displays successfully delivered email jobs.

---

## Large Batch Scheduling

The application has been tested with large email batches.

A 1000-email scheduling test was performed to verify that large numbers of jobs can be persisted and queued.

The scheduling system distributes jobs according to the configured hourly capacity.

---

## Database Design

The main PostgreSQL entities include:

- `User`
- `Sender`
- `Campaign`
- `ScheduleWindow`
- `EmailJob`
- `DeliveryAttempt`
- `SlackIntegration`

### Important Relationships

```text
User
 ├── Senders
 ├── Campaigns
 └── SlackIntegration

Campaign
 └── EmailJobs

Sender
 ├── Campaigns
 ├── EmailJobs
 └── ScheduleWindows

EmailJob
 └── DeliveryAttempts
```

---

## Important API Areas

### Authentication

```http
GET  /auth/google
GET  /auth/google/callback
GET  /auth/me
POST /auth/logout
```

### Email / Campaigns

The backend provides authenticated endpoints for:

- Campaign creation
- Scheduled email retrieval
- Sent email retrieval

### Search

```http
GET /api/search?q=<query>
```

### Slack

```http
GET  /api/slack/status
POST /api/slack/disconnect
POST /api/slack/test
```

### Slack OAuth

```http
GET /auth/slack
GET /auth/slack/callback
```

---

## Running the Complete Application

**1. Start infrastructure:**

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

**2. Start the backend:**

```bash
cd backend
npm run dev
```

**3. Start the frontend in another terminal:**

```bash
cd frontend
npm run dev
```

**4. Open the application:**

- App: <http://localhost:5173>
- Bull Board: <http://localhost:4000/admin/queues>

---

## Testing Checklist

The following functionality has been tested during development:

- [x] Google OAuth login
- [x] Dashboard authentication
- [x] Google user information
- [x] Logout
- [x] Email campaign scheduling
- [x] Multiple senders
- [x] Delay configuration
- [x] Hourly capacity scheduling
- [x] Large batch scheduling
- [x] BullMQ job processing
- [x] Redis connectivity
- [x] PostgreSQL persistence
- [x] Ethereal email delivery
- [x] Scheduled email dashboard
- [x] Sent email dashboard
- [x] Elasticsearch indexing
- [x] Elasticsearch search
- [x] Slack OAuth
- [x] Slack connection status
- [x] Slack test notification
- [x] Slack hourly-limit notification flow
- [x] Bull Board
- [x] Backend restart recovery

---

## Design Decisions and Trade-offs

### PostgreSQL as the Source of Truth

PostgreSQL stores users, campaigns, senders, email jobs, scheduling windows, and delivery attempts. Redis/BullMQ is used for runtime queue processing rather than as the permanent source of email records.

### Elasticsearch as a Search Projection

Elasticsearch is used to provide fast email search while PostgreSQL remains the primary data store.

### BullMQ Instead of Cron

BullMQ provides persistent queued jobs and delayed execution without relying on cron jobs.

### Schedule Windows

Hourly capacity is reserved during campaign creation so large campaigns can be distributed across available delivery windows.

### SMTP Side-Effect Boundary

The system uses database state transitions and processing tokens to reduce duplicate job processing. However, no application can guarantee generic exactly-once external SMTP delivery across a database transaction and an independent SMTP provider without provider-level idempotency support.

---

## Development Notes

This project is intended as a full-stack email scheduling and delivery system for development and demonstration purposes.

Ethereal is used instead of a production email provider so that email delivery can be demonstrated safely without sending real production emails.

### Production Considerations

Production deployment would require additional infrastructure and security hardening, including:

- Production SMTP provider
- Secret management
- HTTPS
- Production OAuth redirect URLs
- Encryption/secure storage for provider credentials
- Monitoring and alerting
- Production Elasticsearch configuration
- Scalable worker deployment
- Stronger retry and provider-specific idempotency handling

---

## Author

Developed as a full-stack email scheduling system using TypeScript, React, Express, PostgreSQL, Redis, BullMQ, Elasticsearch, Slack OAuth, and Google OAuth.