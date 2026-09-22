# Frontend Transformation Plan

## 1. Executive Summary

This document serves as the comprehensive execution blueprint for transforming the current custom frontend into an enterprise-grade bespoke design system. The plan is structured around a two-phase strategy: first stabilizing the architecture and primitives (Phase 1), followed by an intentional visual redesign (Phase 2). This blueprint emphasizes high parallelization, explicit file ownership, and safe, staged token and RTL layout migrations.

### Executive Transformation Plan
| Phase | Objective | Key Actions | Dependencies | Priority | Expected Outcome |
|---|---|---|---|---|---|
| **Phase A: Foundation** | Establish stable tokens & typography | Baseline capture, build token map & type scaling | None | P0 | Verified CSS variables & fonts; zero layout breakage. |
| **Phase B: Primitives** | Standardize core reusable UI | Migrate Button, Badge, Input, Card, Dialog to CVA & logical CSS | Phase A | P0 | Unified component APIs with variants & safe RTL. |
| **Phase C: Shells** | Migrate shared navigational UI | Update Dashboard Sidebar/Topbar and AppShell layouts | Phase B | P1 | Robust layout structures adapting natively to direction. |
| **Phase D: Features** | Incremental feature migration | Parallelize AEO, Analytics, Audit, Settings refactors | Phase C | P1 | Product surfaces fully utilizing the new design system. |
| **Phase E: Clean & QA** | Final QA and token cleanup | Responsive/a11y/RTL checks, remove unused legacy tokens | Phase D | P0 | A production-ready, stable architectural baseline. |
| **Phase F: Visuals** | Premium visual redesign | Sophisticated motion, refined gradients & spacing | Phase E | P2 | AWWWARDS-level visual polish on stable architecture. |

---

## 2. Current Architecture Baseline

- **Framework:** Next.js 16.2.11 (App Router), React 19.2.4.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`, complex custom animations in `globals.css`.
- **RTL:** HTML `dir` dynamically set. Extensive inline `isRtl` boolean logic in UI components rather than CSS logical properties.
- **Theming:** Custom React `ThemeContext` toggles `light`/`dark` classes, driving extensive CSS variables.
- **Components:** Custom primitives (e.g., `Button.tsx`, `Card.tsx`) using hardcoded class string interpolation rather than `cva`.

## 3. Audit Findings Relevant to the Transformation

1. **Hard-coded RTL Logic:** Use of ternary operators (`isRtl ? 'pr-6' : 'pl-6'`) across hundreds of layout points creates severe risk.
2. **Missing Component Variants:** Lack of `cva` forces manual maintenance of class maps.
3. **Token Coupling:** UI elements directly map to `globals.css` variables, without a well-defined intermediate semantic token layer.
4. **Mix of Paradigms:** Utility classes are heavily mixed with raw arbitrary values (e.g., `bg-[image:var(--gradient-primary)]`).

## 4. Transformation Goals

- Build a coherent enterprise-grade bespoke design system.
- Standardize APIs for shared internal primitives (using `cva` or equivalent).
- Use Tailwind CSS v4 variables appropriately.
- Transition purely layout-driven `isRtl` references to CSS logical properties (`margin-inline-start`, etc.).
- Establish strict file ownership rules to enable parallel task execution via Jules.

## 5. Non-Goals

- Do **not** replace the architecture wholesale with shadcn/ui or Radix unless a specific headless primitive adds proven value for complex interactions.
- Do **not** prematurely mix Phase 2 visual redesign into Phase 1 architectural migration.
- Do **not** modify backend/API or business logic.

## 6. Target Architecture

The target is an enterprise-grade bespoke design system.
- **Module Boundaries:** Clear separation between generic design-system primitives, shared shells, and specific product feature surfaces.
- **State/Theme:** Retain existing `ThemeProvider` and font configurations.
- **Component APIs:** CVA-driven variant management.
- **Styling:** Tailwind v4 driven by a semantic layer of CSS variables.

## 7. Design Token Architecture

**Migration Principle:**
`OLD TOKENS` → `NEW TOKEN ARCHITECTURE` → `COMPONENT MIGRATION` → `PAGE MIGRATION` → `VERIFY NO CONSUMERS` → `REMOVE LEGACY TOKENS`.
Do not delete legacy tokens from `globals.css` until Phase E.

## 8. Typography Architecture

- Retain existing Next.js local font setup (YekanBakh, Peyda, BoxFace).
- Map fonts to structured semantic design tokens rather than ad-hoc inline usage.

## 9. Component Architecture

- Create internal variants using `cva` for predictable composition.
- Export base atoms and layout patterns cleanly.

## 10. RTL Architecture

**Hybrid Migration Strategy:**
CSS logical properties must replace direction-sensitive CSS where direction is purely a layout concern.
- **SAFE to convert:** `margin-left` → `margin-inline-start`, padding, inset, border, text-align.
- **UNSAFE to convert (keep `isRtl`):** Charts, data visualizations, directional icons (e.g., `ArrowLeft`), explicit transforms, animations with semantic direction, third-party libraries.

## 11. Theme Architecture

- Retain `ThemeProvider.tsx`.
- Standardize the mapping of themes (`light`, `dark`) to the new semantic tokens in `globals.css`.

## 12. Responsive Architecture

- Use standard Tailwind breakpoints (`sm`, `md`, `lg`).
- Move away from hardcoded pixel offsets where logical grid/flex gaps work better.

## 13. Accessibility Architecture

- Ensure all components support keyboard navigation, ARIA attributes, and adequate color contrast. Focus rings should be consistent.

## 14. Motion Strategy

- Consolidate complex `@keyframes` in `globals.css`.
- Respect `prefers-reduced-motion` explicitly.

---

## 15. Phase 1 — Architectural Migration (Detailed Task Backlog)

**Important Rule for All Tasks:**
*You have ONE task. Do not perform unrelated refactoring. Do not modify files owned by another active Jules session. Do not redesign components outside your scope. Do not modify backend logic. Use the existing local Persian font infrastructure. Run `npm run lint` and `npm run build` to validate.*

### FE-001: Baseline Capture
- **Objective:** Establish visual and technical baselines.
- **Context:** Capture existing state of the app before significant changes.
- **Allowed Files:** N/A (Read-only documentation output).
- **Forbidden Files:** All source code files.
- **Dependencies:** None.
- **Implementation Requirements:** Document route inventory, themes, desktop/mobile, LTR/RTL behavior.
- **Acceptance Criteria:** A baseline document/screenshot set exists.
- **Validation Commands:** `npm run dev`
- **Expected Final Report:** Summary of captured routes, verified themes and RTL behaviors.
- **Parallelization Status:** Sequential (No).

### FE-002: Token Map & Design System Foundation
- **Objective:** Introduce semantic CSS variables alongside legacy ones.
- **Context:** Map new CSS variables based on the audit's recommendation to decouple styling.
- **Allowed Files:** `src/app/globals.css`, `.tailwindcss/postcss` (if applicable).
- **Forbidden Files:** Component code (`src/components/`, `src/app/**/*.tsx`).
- **Dependencies:** FE-001.
- **Implementation Requirements:** Add a new layer of semantic tokens without removing the old variables.
- **Acceptance Criteria:** Both legacy and new tokens are present. UI looks identical.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Confirmed the addition of semantic tokens.
- **Parallelization Status:** Sequential (No).

### FE-003: Typography Foundation
- **Objective:** Standardize font usage via tokens.
- **Context:** Map the Next.js local fonts to CSS variables.
- **Allowed Files:** `src/config/fonts.ts`, `src/app/[locale]/layout.tsx`, `src/app/globals.css`.
- **Forbidden Files:** UI components (`src/components/Button.tsx`, etc.).
- **Dependencies:** FE-002.
- **Implementation Requirements:** Ensure existing local fonts (YekanBakh, Peyda) use standard token mappings.
- **Acceptance Criteria:** Font display is unchanged visually, mapped via semantic variables.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Typography standard verified.
- **Parallelization Status:** Sequential (No).

### FE-004: Core Variant Architecture (CVA Setup)
- **Objective:** Setup `cva` utility.
- **Context:** Standardize the API for components.
- **Allowed Files:** `src/lib/utils.ts` (or equivalent), `package.json`.
- **Forbidden Files:** Any UI components.
- **Dependencies:** FE-003.
- **Implementation Requirements:** Add `cva`, `clsx`, `tailwind-merge` utility functions if missing.
- **Acceptance Criteria:** Standard `cn` and `cva` are exported from a utils file.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Utils are ready for components.
- **Parallelization Status:** Sequential (No).

### FE-005: Migrate Primitive - Button
- **Objective:** Refactor `Button.tsx` to use CVA and logical CSS properties.
- **Context:** Standardize the button API.
- **Allowed Files:** `src/components/Button.tsx`.
- **Forbidden Files:** Other UI components.
- **Dependencies:** FE-004.
- **Implementation Requirements:** Remove manual variant logic. Use `cva`. Replace purely layout `isRtl` logic with logical CSS.
- **Acceptance Criteria:** `Button` API works with `variant` and `size` props. LTR/RTL layout is correct.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Button refactored.
- **Parallelization Status:** Parallel (with FE-006, FE-007, FE-008, FE-009).

### FE-006: Migrate Primitive - Badge
- **Objective:** Refactor `Badge.tsx`.
- **Context:** Standardize badge API.
- **Allowed Files:** `src/components/Badge.tsx`.
- **Forbidden Files:** Other UI components.
- **Dependencies:** FE-004.
- **Implementation Requirements:** Use `cva` and logical CSS.
- **Acceptance Criteria:** Badge API updated. LTR/RTL valid.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Badge refactored.
- **Parallelization Status:** Parallel.

### FE-007: Migrate Primitive - Input
- **Objective:** Refactor `Input.tsx`.
- **Context:** Standardize input API.
- **Allowed Files:** `src/components/Input.tsx`.
- **Forbidden Files:** Other UI components.
- **Dependencies:** FE-004.
- **Implementation Requirements:** Use `cva` and logical CSS.
- **Acceptance Criteria:** Input API updated.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Input refactored.
- **Parallelization Status:** Parallel.

### FE-008: Migrate Primitive - Card
- **Objective:** Refactor `Card.tsx` (and subcomponents).
- **Context:** Standardize card composite API.
- **Allowed Files:** `src/components/Card.tsx`.
- **Forbidden Files:** Other UI components.
- **Dependencies:** FE-004.
- **Implementation Requirements:** Use `cva` and logical CSS.
- **Acceptance Criteria:** Card structure updated.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Card refactored.
- **Parallelization Status:** Parallel.

### FE-009: Migrate Primitive - Dialog
- **Objective:** Refactor `Dialog.tsx`.
- **Context:** Standardize dialog composite API.
- **Allowed Files:** `src/components/Dialog.tsx`.
- **Forbidden Files:** Other UI components.
- **Dependencies:** FE-004.
- **Implementation Requirements:** Use `cva` and logical CSS.
- **Acceptance Criteria:** Dialog structural CSS modernized.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Dialog refactored.
- **Parallelization Status:** Parallel.

### FE-010: Migrate Dashboard Sidebar
- **Objective:** Convert layout directionality to logical properties.
- **Context:** Decouple the shell's layout from `isRtl` where possible.
- **Allowed Files:** `src/components/navigation/DashboardSidebar.tsx`, `src/components/navigation/AppSidebar.tsx`.
- **Forbidden Files:** DashboardTopbar, Feature routes.
- **Dependencies:** FE-005, FE-006, FE-007, FE-008, FE-009.
- **Implementation Requirements:** Swap structural layout (paddings/margins) to logical.
- **Acceptance Criteria:** Sidebar correctly renders in both LTR/RTL.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Sidebar layout modernized.
- **Parallelization Status:** Parallel (with FE-011).

### FE-011: Migrate Dashboard Topbar
- **Objective:** Convert topbar layout directionality.
- **Context:** Update navigational layout.
- **Allowed Files:** `src/components/navigation/DashboardTopbar.tsx`.
- **Forbidden Files:** DashboardSidebar, Feature routes.
- **Dependencies:** FE-005, FE-006, FE-007, FE-008, FE-009.
- **Implementation Requirements:** Use logical CSS.
- **Acceptance Criteria:** Topbar works in LTR/RTL.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Topbar layout modernized.
- **Parallelization Status:** Parallel (with FE-010).

### FE-012: Migrate Dashboard Shell
- **Objective:** Integrate updated navigational components into the shell.
- **Context:** Ensure the full shell wrapper is fully migrated.
- **Allowed Files:** `src/components/DashboardShell.tsx`, `src/app/[locale]/dashboard/layout.tsx`.
- **Forbidden Files:** Feature pages.
- **Dependencies:** FE-010, FE-011.
- **Implementation Requirements:** Align shell spacing with logical properties.
- **Acceptance Criteria:** The entire dashboard shell handles RTL correctly.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Shell migration complete.
- **Parallelization Status:** Sequential (No).

### FE-013 to FE-021: Feature Domain Migrations
- **Objective:** Refactor specific feature components to use updated primitives and logical properties.
- **Context:** Convert individual product surfaces to the new design system.
- **Task Domains:**
  - FE-013: AEO (`src/components/features/aeo/`, `src/app/[locale]/dashboard/aeo/`)
  - FE-014: Analytics (`src/components/features/analytics/`)
  - FE-015: Audit (`src/components/features/audit/`)
  - FE-016: Content (`src/components/features/content/`)
  - FE-017: SEO (`src/app/[locale]/dashboard/seo/`)
  - FE-018: Settings (`src/app/[locale]/dashboard/settings/`)
  - FE-019: Billing (`src/app/[locale]/dashboard/billing/`)
  - FE-020: Brand (`src/app/[locale]/dashboard/brand/`)
  - FE-021: Query (`src/app/[locale]/dashboard/query/`)
- **Dependencies:** FE-012.
- **Implementation Requirements:** Replace layout `isRtl` and hardcoded components with logical properties and new `cva` primitives.
- **Forbidden Files:** Shell components, globals.css, other feature folders outside the task domain.
- **Acceptance Criteria:** Feature behaves identically, utilizing the semantic design system and logical RTL properties.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Feature migrated safely.
- **Parallelization Status:** Parallel (Maximum 9 concurrent).

### FE-022: Final QA & Legacy Token Cleanup
- **Objective:** Verify integrations, remove legacy tokens.
- **Context:** Final pass over the architecture to confirm migration is over.
- **Allowed Files:** `src/app/globals.css`.
- **Forbidden Files:** Core components unless fixing a critical bug.
- **Dependencies:** All Feature Migrations (FE-013 to FE-021).
- **Implementation Requirements:** Safely drop unused old token variables. Verify zero consumers.
- **Acceptance Criteria:** Project builds. Visual QA (responsive, LTR/RTL, a11y) passes.
- **Validation Commands:** `npm run lint`, `npm run build`.
- **Expected Final Report:** Token cleanup verified; phase 1 is complete.
- **Parallelization Status:** Sequential (No).

---

## 16. Phase 2 — Premium Visual Redesign

*Only execute after FE-022 is complete.*
- Introduce stronger art direction, refined visual hierarchy, sophisticated motion, and high-quality hero sections. Tasks to be defined post-Phase 1.

---

## 17. Dependency Graph & Parallelization Strategy

1. **Sequential Foundation:** FE-001 -> FE-002 -> FE-003 -> FE-004.
2. **Parallel Primitives:** FE-005 to FE-009 run concurrently.
3. **Parallel Nav UI:** FE-010, FE-011 run concurrently.
4. **Sequential Shell Integration:** FE-012.
5. **Highly Parallel Features:** FE-013 through FE-021 run concurrently.
6. **Sequential Final QA:** FE-022.

## 18. File Ownership Rules

- A task may only modify files listed in its "Allowed Files".
- Modifications to `package.json` are strictly controlled.
- Modifying backend routing, database schemas, or `src/core/` is explicitly forbidden.
- If a Jules session requires a change in a primitive while executing a feature task, it must report it instead of fixing it to avoid conflict.

## 19. Git Checkpoints

- **Checkpoint 0 (Baseline):** After FE-001.
- **Checkpoint 1 (Foundation):** After FE-004.
- **Checkpoint 2 (Primitives):** After FE-009.
- **Checkpoint 3 (Shells):** After FE-012.
- **Checkpoint 4 (Features):** After FE-021.
- **Checkpoint 5 (Clean):** After FE-022.

## 20. Validation Strategy & Quality Gates

**Gate Criteria for Every Task:**
- `npm run lint` must pass (no warnings).
- `npm run build` must succeed.
- TypeScript compilation must pass.
- Components must render without errors in both LTR (en) and RTL (fa) contexts.
- Accessibility passes basic checks (focus states visible, aria labels present).

## 21. Risk Register & Rollback Strategy

- **Risk:** Unsafe RTL conversion breaks data visualization charts.
  - **Mitigation:** Strict guidelines on what `isRtl` logic is safe to convert. Feature owners must explicitly check charts.
- **Risk:** Token migration breaks existing UI.
  - **Mitigation:** Phased token introduction; old tokens are not removed until FE-022.
- **Rollback:** Because the migration is incrementally structured, any failed Checkpoint can be reverted via Git without blocking parallel independent feature work.

## 22. Definition of Done
- A task is considered done when `npm run lint` and `npm run build` complete without errors.
- Visual regressions are verified against the Checkpoint 0 baseline.
- Code matches Phase 1 boundaries.

## 23. Recommended Execution Order
Execute FE-001 through FE-022 strictly adhering to the Dependency Graph. Initiate parallel tasks only when prerequisite Checkpoints are validated.
