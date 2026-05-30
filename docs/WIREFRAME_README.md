# Wireframe Implementation Guide (Cursor AI)

This guide is for Cursor AI agents implementing or updating the Qwik website from wireframes.
Use it to keep UI delivery consistent, backend-compatible, and safe.

## 1) Scope

- Active scope: `website/` and backend API contracts in `backend/`.
- Do not edit `admin/` or `frontend/` unless explicitly requested.
- Follow repository rules in `.cursor/rules/*.mdc` first.

## 2) Wireframe-to-Code Workflow

1. Parse wireframe into sections/components (hero, cards, lists, CTA, form, footer).
2. Map each section to existing routes/components before creating new ones.
3. Reuse existing marketing components in `website/src/components/marketing/` when possible.
4. If new component is needed, keep it small, typed, and reusable.
5. Use existing content layer and types before adding new data paths.

## 3) Routing and Qwik Patterns

- Put public website pages under `website/src/routes/(public)/`.
- Prefer `routeLoader$` for server-side page data needs.
- Use `routeAction$` + `Form` for form submissions.
- Do not use browser-only APIs directly in SSR paths without guards.
- Use `useNavigate()` instead of `window.location`.

## 4) Data and Content Source Rules

- Primary content source behavior is controlled by website config/env.
- If content is static/marketing, prefer existing local content files in `website/src/content/`.
- If wireframe needs dynamic backend data, consume existing API endpoints first.
- When adding new API consumption, keep response shapes aligned with `website/src/lib/marketing/types.ts`.
- Do not silently fallback to wrong locale content in localized listings.

## 5) UI Quality Guardrails

- Ensure responsive behavior (mobile-first).
- Keep loading, empty, and error states explicit.
- Keep spacing/typography aligned with existing design tokens and Tailwind patterns.
- Use accessible semantic structure (`header`, `main`, `section`, labels, alt text).
- Prefer incremental styling changes over global visual rewrites.

## 6) Backend Contract Safety

When wireframe requires new backend fields/endpoints:

1. Add backend changes in `backend/` with validation.
2. Keep API response shape consistent with existing patterns.
3. Update frontend types and mappers together.
4. Add or update tests for changed API behavior.

## 7) Required Verification

Before marking done:

- Run website checks in `website/`:
  - lint/build or project-standard checks for touched scope
- Verify affected routes render correctly in browser.
- Verify no SSR/runtime errors for changed pages.
- Verify any backend endpoint changes with targeted tests.

If any check cannot be run, state what was skipped and why.

## 8) Documentation Updates

If wireframe implementation changes behavior/config/API:

- Update `website/docs/API_REFERENCE.md` for contract changes.
- Update `website/docs/CONFIGURATION.md` for config/env changes.
- Update `docs/CONFIGURATION.md` and `backend/.env.example` if backend config/env changed.

## 9) Done Criteria (Wireframe Tasks)

A wireframe task is complete only when:

1. Layout and interaction intent are implemented accurately.
2. Components follow existing project patterns.
3. Responsive + state handling are correct.
4. Backend/website contracts remain compatible.
5. Required tests and docs are updated.
