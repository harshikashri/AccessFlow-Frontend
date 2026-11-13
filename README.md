# AccessFlow Frontend

The AccessFlow frontend is a standalone React application for the Enterprise Access & Workflow Management Platform. This repository contains the client foundation only; feature flows and business functionality have not been implemented.

## Technology

- React and TypeScript
- Vite
- React Router
- Axios
- TanStack Query
- ESLint and Prettier

## Project structure

- `src/app`: application entry point, providers, and router.
- `src/assets`: static images, icons, and fonts.
- `src/app/pages`: application pages, including the development-only component showcase.
- `src/components/ui`: reusable controls and display primitives; `common` and `feedback` contain shared page and state components.
- `src/config` and `src/constants`: validated environment and shared configuration.
- `src/features`: isolated business modules for auth, dashboard, organizations, departments, users, roles, requests, approvals, audit logs, and settings.
- `src/layouts` and `src/routes`: shared layout and routing primitives. Route access wrappers accept explicit state and are not connected to authentication.
- `src/lib` and `src/services`: third-party client configuration and shared API infrastructure.
- `src/stores`: reserved for genuinely global client-side state; server state belongs in TanStack Query.
- `src/styles`, `src/types`, and `src/utils`: global styling, shared types, and pure utilities.

## Design system preview

Run `npm run dev` and open `/ui-showcase` to explore the reusable components and responsive layout foundation. This route is registered only in Vite development mode and is not included in production routing. Design tokens are centralized in `src/styles/variables.css`; shared component and responsive layout styles live in `src/styles/components.css`.

The UI foundation includes accessible buttons, form controls, cards, badges, dialogs, dropdowns, tabs, tooltips, tables, avatars, separators, skeletons, spinners, alerts, and toasts. It does not implement authentication or feature workflows.

## Prerequisites

- Node.js 22.12 or newer.
- npm 10 or newer.

## Install and run

```sh
npm install
npm run dev
```

Vite starts the development server at `http://localhost:5173` by default.

## Build and quality checks

```sh
npm run build
npm run preview
npm run lint
npm run typecheck
npm run format:check
```

Use `npm run format` to format project files.

## Environment and API connection

Copy `.env.example` to `.env.local` and configure `VITE_API_BASE_URL`. For local backend development, the example value is `http://localhost:5000/api`.

The shared Axios client reads this variable through `src/config/env.ts`; the backend URL is not embedded in application source. The backend mounts REST modules under `/api`. Its login response provides an access token and its refresh token is an HttpOnly cookie. No login, logout, token storage, refresh rotation, or feature API calls are implemented in this frontend foundation.

## Repository boundary

The frontend is intended to be maintained in a repository separate from the backend. The backend was inspected read-only to align naming and API conventions; this initialization does not modify backend files.
