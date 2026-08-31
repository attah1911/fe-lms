# E-Learning SMPN 37 Jakarta — Frontend

Web client for a school learning-management system. Next.js (Pages Router) + NextUI.

**Backend repo:** [back-end-e-learning](https://github.com/attah1911/back-end-e-learning)
**Live:** https://front-end-e-learning.vercel.app

<!-- Screenshots: add images to docs/ and reference them here — login, and one dashboard per role reads well. -->

## Stack

| | |
|---|---|
| Framework | Next.js 14 (Pages Router) + React 18 + TypeScript |
| UI | NextUI 2 + Tailwind CSS + Framer Motion |
| Auth | NextAuth (Credentials provider) wrapping the backend JWT; role-based route guard in `middleware.ts` |
| Data | TanStack Query + Axios — an interceptor injects the token and handles 401/403 |
| Forms | React Hook Form + Yup |

## Features

- Role-aware shell (admin / guru / murid) — sidebar, routes, and middleware all keyed to the session role
- Login, register, email-activation, and student-onboarding flows
- **Admin:** manage accounts, teachers, students, and subjects
- **Guru:** subjects, materials, assignments, grading, personal to-dos
- **Murid:** enrolled subjects, materials, assignment submission, deadline tracking

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3001
```

Requires the [backend](https://github.com/attah1911/back-end-e-learning) — run it locally, or point `NEXT_PUBLIC_API_URL` at the deployed one.

### Environment

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend API base, e.g. `http://localhost:3000/api` |
| `NEXTAUTH_URL` | this app's URL — `http://localhost:3001` in dev (Vercel sets it automatically in prod) |
| `NEXTAUTH_SECRET` | NextAuth session encryption key — generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_FRONTEND_URL` | optional; falls back to the current origin |

## Project layout

```
src/
  pages/               Pages Router; api/auth/[...nextauth].ts is the only API route
  components/
    commons/           reusable (DataTable, Modal, FileUploader, …)
    layouts/           AuthLayout, DashboardLayout
    views/<Role>/<Feature>/
                       index.tsx (wrapper) + <Feature>.tsx (UI) + use<Feature>.tsx (logic)
  services/            one Axios module per domain
  libs/axios/          Axios instance + interceptors
  hooks/               useTableData (pagination + search)
  middleware.ts        role-based route guard
```

## Scripts

| | |
|---|---|
| `npm run dev` | dev server, port 3001 |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run clean` | delete the `.next` folder |
