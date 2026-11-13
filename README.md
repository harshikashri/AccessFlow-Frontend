# AccessFlow Frontend

The AccessFlow frontend is a standalone React application for the Enterprise Access & Workflow Management Platform. It includes the design system, authentication flow, a responsive permission-aware workspace shell, and a data-driven dashboard backed by the existing dashboard APIs.

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
- `src/features/dashboard`: typed dashboard API integration, permission-aware widgets, filters, charts, activity, and dashboard states.
- `src/layouts` and `src/routes`: shared workspace layout and routing primitives, including authenticated and permission-aware route guards.
- `src/lib` and `src/services`: third-party client configuration and shared API infrastructure.
- `src/stores`: reserved for genuinely global client-side state; server state belongs in TanStack Query.
- `src/styles`, `src/types`, and `src/utils`: global styling, shared types, and pure utilities.

## Design system preview

Run `npm run dev` and open `/ui-showcase` to explore the reusable components and responsive layout foundation. This route is registered only in Vite development mode and is not included in production routing. Design tokens are centralized in `src/styles/variables.css`; shared component and responsive layout styles live in `src/styles/components.css`.

The UI foundation includes accessible buttons, form controls, cards, badges, dialogs, dropdowns, tabs, tooltips, tables, avatars, separators, skeletons, spinners, alerts, and toasts.

The authentication routes are `/login`, `/forgot-password`, `/reset-password`, and `/set-password`. Authenticated users get a responsive sidebar, breadcrumbs, account menu, and explicit loading/unavailable/forbidden states. The platform and tenant dashboard routes load API-backed data; organizations, departments, users, roles, workflows, requests, approvals, and audit logs remain informational placeholders. Notifications are also a UI placeholder because no notification API is available.

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

## Dashboard API plan and scope

The dashboard uses the existing authenticated Axios client and TanStack Query. All dashboard endpoints are `GET /dashboard/...` relative to `VITE_API_BASE_URL`, which includes the backend `/api` prefix. Responses use the standard `{ success, message, data }` envelope; dashboard failures use the shared `{ success: false, message, code, details? }` API error shape.

| Endpoint | Data used |
| --- | --- |
| `GET /dashboard/config` | Server-filtered `PLATFORM` or `DYNAMIC` dashboard type, visible widget registry, and supported date-range options. Query parameters are not accepted. |
| `GET /dashboard/summary` | Effective KPI array, deferred widget metadata, and resolved date range. Accepts `range`, `fromDate`, `toDate`. |
| `GET /dashboard/organization-analytics` | Platform organization registration/status trends and organization comparisons/overview. |
| `GET /dashboard/user-analytics` | Platform or tenant user totals, registration trends, and platform organization/role or tenant department breakdowns. |
| `GET /dashboard/request-analytics` | Platform or authorized tenant request trends, status and type distributions, period comparison, and platform organization comparison. |
| `GET /dashboard/approval-analytics` | Authorized tenant approval workload, status/stage/decision summaries, and returned approval-duration/SLA metrics. Not available to Super Admin. |
| `GET /dashboard/department-analytics` | Platform department analytics or the tenant department statistics/directory variant authorized by the caller's permissions. |
| `GET /dashboard/recent-activity` | Scope-filtered platform or tenant activity with pagination. Accepts date-range fields plus `page` and `limit`; it has no activity-category filter. |

The backend widget configuration is the source of truth for visible dashboard content. Tenant widgets map as follows: `REQUEST_SUMMARY` → request KPIs/analytics; `APPROVAL_SUMMARY` and `APPROVAL_ACTIVITY` → approval KPIs/analytics; `USER_STATISTICS` → user KPIs/analytics; `DEPARTMENT_OVERVIEW` → department KPIs/analytics; `ROLE_OVERVIEW` → role KPIs (role analytics is deferred); `AUDIT_ACTIVITY` → recent activity (its KPI provider is deferred). `REQUEST_CREATE` is a deferred data widget and may only link to the existing request placeholder when `requests.create` is effective.

Platform widgets map as follows: `PLATFORM_OVERVIEW` → platform KPIs; `ORGANIZATION_ANALYTICS` → organization analytics; `USER_ANALYTICS` → platform user analytics; `PLATFORM_USAGE_ANALYTICS` → platform request analytics; `DEPARTMENT_ANALYTICS` → platform department analytics; `PLATFORM_ACTIVITY` → platform recent activity. Deferred or unknown widgets are not given fabricated values.

Tenant dashboard authorization and scopes remain enforced by the backend and are also reflected in the existing `/auth/me` permission helpers. Department Managers and Employees receive personal/authorized request-history scope, not an assumed department-wide view. Approval analytics is limited to authorized assigned/delegated work. `availableToClaimStages` is only a count returned by the backend; the frontend does not infer claim eligibility or reveal details for unclaimed stages. Super Admin uses only the platform configuration and platform analytics endpoints.

Date filters use the backend-provided options (`LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `THIS_MONTH`, `THIS_YEAR`, `CUSTOM`), default to `LAST_30_DAYS`, and send custom UTC date bounds only when both are valid. Custom ranges are limited to 366 days and use a half-open interval. Summary user/department/role totals and most platform totals are current or lifetime counts, not date-windowed. Department request rows do not provide average approval time; the backend returns that field as `null`. No platform approval-analytics endpoint or custom widget-registration endpoint exists.

The dashboard uses the Phase 1 `PageHeader`, `Card`, `Table`, `Badge`, `Button`, feedback states, AccessFlow icons, Phase 3 workspace shell, authorization helpers, and query client. It renders accessible SVG/CSS visualizations from analytics response data without adding a chart dependency. Tenant dashboard presentations are driven by the returned `DYNAMIC` widget set; the API does not expose a built-in role-name dashboard discriminator, so the frontend does not guess whether a dynamic user is an Organization Admin, Department Manager, Department Member, or custom-role user.

The dashboard provides permission-filtered KPIs and widgets, server-supported date filters with validated custom UTC bounds, refresh, scoped quick actions, and paginated recent activity. It uses user- and filter-scoped TanStack Query keys, displays loading/error/empty states, and clears dashboard query data after a successful profile/permission refresh. Unsupported or deferred providers are not populated with fabricated data. Page, service, and utility tests cover tenant/platform rendering, filter requests, response validation, permissions, and user-context mismatches.

Tests run with Vitest and happy-dom and do not require a live backend.

## Repository boundary

The frontend is intended to be maintained in a repository separate from the backend. The backend was inspected read-only to align naming and API conventions; this initialization does not modify backend files.
