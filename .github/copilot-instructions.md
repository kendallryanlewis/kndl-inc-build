# KNDL Inc — Copilot Workspace Instructions

## Project Overview

Angular 17+ web application for **KNDL Inc** — a web development agency. The app serves three primary purposes:
1. **App showcase** — demonstrates website templates and designs built for clients
2. **Website job showcase** — displays the agency's work and service offerings
3. **Client welcome page** — onboards new clients and connects them to their dashboard

**Stack:** Angular | Firebase (Firestore, Storage, Functions) | Stripe | SCSS | FontAwesome | Bootstrap

---

## Core Coding Rules (apply to every response)

### 1. Overwrite, Never Duplicate
- **Always modify existing code in place.** Do not create parallel versions, backup copies, or shadow implementations.
- If a component, service, function, or class already exists for the purpose, **edit it** — do not scaffold a new one.
- Before creating any new file, check whether an existing file should be extended instead.

### 2. Remove Dead Code Immediately
- Delete any code that is no longer referenced: unused imports, unreachable branches, commented-out blocks, obsolete methods, unused variables, and stale template bindings.
- If a method is being replaced, remove the old version in the same change.
- Remove unused `@NgModule` declarations, providers, and imports from `app.module.ts` when their components are deleted.

### 3. Reuse Functions and Services
- Before writing new logic, check existing services (`src/app/services/`), pipes (`src/app/pipes/`), and directives (`src/app/directives/`) for reusable utilities.
- Extract shared logic into a service or pipe when it is used in more than one place.
- Prefer calling an existing method over writing a near-duplicate.
- Consolidate similar template blocks into a reusable component inside `src/app/reusable/`.

### 4. Angular Conventions
- Use the existing `AppModule` (not standalone components) — this project is NgModule-based.
- Declare new components in `app.module.ts` only if they are not already declared.
- Use `async/await` with Firebase SDK v9 modular API (already established pattern).
- Follow the existing file-naming convention: `kebab-case.component.ts`, `kebab-case.service.ts`.
- SCSS scoped styles go in the component's `.scss` file; global styles go in `src/styles.scss`.
- Prefer Bootstrap layout/utilities in templates for spacing, alignment, and responsive behavior before introducing custom layout CSS.

### 5. Firebase & Data Access
- Firebase is initialized in `src/app/firebase-init.ts` — never re-initialize elsewhere.
- Use the modular Firebase SDK (`getFirestore`, `doc`, `getDoc`, etc.) consistent with the existing codebase.
- Default/fallback content lives in `src/app/config/default-site-content.ts` — update that file when defaults change, do not hardcode fallbacks inline.
- **Read `src/app/firebase-init.ts` and the relevant service before writing any Firebase code.** Only apply Firebase patterns found there; do not introduce new SDK entry points.

### 6. Main View — `KndlComponent` (`src/app/kndl/`)
- This is the primary public-facing route (`/`). Every change here directly impacts the app showcase and client first impression.
- The site is a **single-page tab-switching SPA**. The four tabs are `home`, `about`, `products`, and `contact`. All rendered inside `kndl.component.html`.
- Child component responsibilities are clearly separated — keep business logic in `KndlComponent`, pass data via `@Input()`.
- SEO is managed via `SEOService` — call the appropriate SEO method on every route; do not set meta tags manually.

#### Approved Page Designs (May 2026) — implement exactly

### 7. Dashboard (`src/app/dashboard/`)
- Client-facing area post-login. Guard with Firebase Auth — never expose admin routes to unauthenticated users.
- Admin sub-routes live under `src/app/dashboard/admin/` and require additional role checks.

### 8. Stripe Integration
- Configuration in `src/app/config/stripe.config.ts`.
- All Stripe server-side calls go through Firebase Functions (`functions/`), never from the Angular client directly.
- **Only read Stripe integration files (`stripe.service.ts`, `stripe.config.ts`, `functions/`) when the task explicitly involves Stripe.** Do not load or modify Stripe code for unrelated changes.

### 9. Responsive Bootstrap Design & Layouts
- Build all UI sections mobile-first using Bootstrap’s responsive grid (`container`/`container-fluid`, `row`, `col-*`).
- Use Bootstrap breakpoint utilities and classes (`sm`, `md`, `lg`, `xl`, `xxl`) to control layout changes across screen sizes.
- Ensure sections are responsive by default: no horizontal overflow, no fixed-width desktop-only blocks, and readable spacing on small screens.
- Prefer Bootstrap utility classes for common layout patterns (stacking, gutters, spacing, flex alignment) and only add custom SCSS when Bootstrap cannot cover the requirement.
- When refactoring existing templates, align them to Bootstrap-responsive patterns instead of introducing parallel non-Bootstrap layout systems.

### 10. Tasteful Animations & Transitions
- Use subtle, purposeful animations that improve clarity and perceived quality, not decorative noise.
- Prefer CSS transitions/animations for hover, focus, reveal, and state changes; keep durations typically between `160ms` and `320ms`.
- Use smooth easing (`ease`, `ease-out`, or custom cubic-bezier) and avoid aggressive bounce/spin effects unless explicitly requested.
- Animate performant properties (`transform`, `opacity`) instead of layout-heavy properties (`width`, `height`, `top`, `left`) where possible.
- Respect accessibility with `@media (prefers-reduced-motion: reduce)` by minimizing or disabling non-essential motion.
- Keep interaction feedback consistent across components (buttons, cards, nav items, modals) with shared motion rhythm.

---

## Do Not
- Add comments that restate what the code already clearly expresses.
- Add error handling for scenarios that cannot occur in the current call path.
- Create example, demo, or placeholder files that are not wired into the app.
- Scaffold a new component when updating an existing one satisfies the requirement.
- Leave `.bak` files or temporary files in the repository.
