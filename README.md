# TaskMaster

Jira-level project management application built with modern TypeScript stack.

> 📋 **Development Roadmap:** See [JIRA_PARITY_ROADMAP.md](./JIRA_PARITY_ROADMAP.md) for the full feature parity plan.

## Current Status

**~55-60% Jira Feature Parity**

### ✅ Completed Features
- Issue Management (hierarchy, LexoRank ordering)
- Custom Fields (15+ field types, config override)
- Workflows (conditions, validators, post-functions)
- Sprint Management (burndown, history)
- Notification Schemes (Jira-style)
- Permission System (40+ granular permissions)
- Components, Versions, Labels, Issue Linking

### 🚧 In Progress
- Screens & Field Configurations
- Boards (Scrum/Kanban)
- JQL Query Engine
- Time Tracking
- Automation Rules

## Tech Stack

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **BullMQ** - Job queue for background tasks
- **Redis** - Caching and queue backend
- **Better Auth** - Email & password authentication
- **Turborepo** - Optimized monorepo build system

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time | WebSocket (boards) + SSE (notifications) | Hybrid for optimal use cases |
| JQL Parser | Hand-written recursive descent | Better error messages, full control |
| Automation vs Post-Functions | Separate systems | Different execution models (async vs sync) |
| Multi-tenancy | Single-tenant | Current scope, row-level isolation possible later |

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun db:push
```


Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).



## Project Structure

```
my-better-t-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, TRPC)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
