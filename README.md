# AccessFlow Frontend

The AccessFlow frontend is a standalone React application for the Enterprise Access & Workflow Management Platform. It includes the design system, authentication flow, and a responsive permission-aware workspace shell. Feature routes are intentionally placeholders; they do not load or mutate business data.

## Technology

- React and TypeScript
- Vite
- React Router
- Axios
- TanStack Query
- Vitest and Testing Library
- ESLint and Prettier

## Project structure

- `src/app`: application entry point, providers, and router.
- `src/assets`: static images, icons, and fonts.
- `src/app/pages`: application pages, including the development-only component showcase.
- `src/components/ui`: reusable controls and display primitives; `common` and `feedback` contain shared page and state components.
- `src/config` and `src/constants`: validated environment and shared configuration.
- `src/features/auth`: authentication API services, in-memory access-token handling, session context, protected routes, and sign-in/password pages.
- `src/features/authorization`: validated permission types, scope-aware permission checks, and centralized navigation requirements.
- `src/features/dashboard`: reserved for dashboard functionality.
- `src/layouts` and `src/routes`: shared workspace layout and routing primitives, including authenticated and permission-aware route guards.
- `src/lib` and `src/services`: third-party client configuration and shared API infrastructure.
- `src/stores`: reserved for genuinely global client-side state; server state belongs in TanStack Query.
- `src/styles`, `src/types`, and `src/utils`: global styling, shared types, and pure utilities.

## Design system preview

Run `npm run dev` and open `/ui-showcase` to explore the reusable components and responsive layout foundation. This route is registered only in Vite development mode and is not included in production routing. Design tokens are centralized in `src/styles/variables.css`; shared component and responsive layout styles live in `src/styles/components.css`.

The UI foundation includes accessible buttons, form controls, cards, badges, dialogs, dropdowns, tabs, tooltips, tables, avatars, separators, skeletons, spinners, alerts, and toasts.

The authentication routes are `/login`, `/forgot-password`, `/reset-password`, and `/set-password`. Authenticated users get a responsive sidebar, breadcrumbs, account menu, and explicit loading/unavailable/forbidden states. Feature routes include the platform dashboard and organizations, departments, users, roles, workflows, requests, approvals, and audit logs. Their content remains informational placeholders; notifications are also a UI placeholder because no notification API is available.

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
npm test
npm run format:check
```

Use `npm run format` to format project files.

## Environment and API connection

Copy `.env.example` to `.env.local` and configure `VITE_API_BASE_URL`. For local backend development, the example value is `http://localhost:5000/api`.

The shared Axios client reads this variable through `src/config/env.ts`; the backend URL is not embedded in application source. The backend mounts REST modules under `/api`.

Authentication calls use `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`, `/auth/logout-all`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/set-password`. The refresh token stays in the backend's HttpOnly cookie; access tokens are held only in memory and are never written to browser storage. The Axios interceptor refreshes once for `401 TOKEN_EXPIRED` responses and shares concurrent refreshes.

Login and session restoration call `/auth/me` to obtain the authoritative current-user profile. Its `authorization` object contains `platformPermissions`, `organizationPermissions`, and `departmentPermissions` keyed by department ID. The frontend validates permission IDs and department IDs, keeps organization and department scopes separate, hides protected navigation until authorization is available, and guards direct feature URLs using the same requirements. Super Admin platform navigation uses the backend's `SUPER_ADMIN` session role; the frontend does not invent platform permission IDs. Authorization can be refreshed through the current-user endpoint.

Role and workflow endpoints have additional backend assignment rules not represented in the `/auth/me` contract. Their current pages are placeholders and make no feature API calls, so they do not imply those additional backend capabilities are available in the UI.

Tests run with Vitest and happy-dom and do not require a live backend.

## Repository boundary

The frontend is intended to be maintained in a repository separate from the backend. The backend was inspected read-only to align naming and API conventions; this initialization does not modify backend files.
