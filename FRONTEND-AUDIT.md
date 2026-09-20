# Frontend Architecture Audit

## 1. Executive Summary

This document presents a read-only, evidence-based audit of the existing frontend architecture in the `ai-branding-platform` (Seorchable/oxenn) repository. It serves as a technical baseline for an upcoming design-system migration. The frontend stack is built on Next.js App Router, using Tailwind CSS and custom PostCSS configurations alongside custom UI components. Although a `components.json` is present with references to "shadcn", components like `Button.tsx` and `Card.tsx` appear to be manually written with hardcoded classes instead of fully utilizing `class-variance-authority`. The application manages RTL and theming through React Context (`ThemeProvider.tsx` and `AuthProvider.tsx`), with extensive inline class logic tied to the locale (fa vs. en).

## 2. Frontend Stack

- **Framework:** Next.js `16.2.11` (App Router)
- **React Version:** `19.2.4`
- **Rendering Model:** Combination of Server and Client Components (`"use client"` declarations are prevalent in contexts, dashboard layouts, and interactive components).
- **Package Manager:** `pnpm` (lockfile: `pnpm-lock.yaml`)
- **Build Tool:** Vercel Next.js builder, custom build script (`tsx scripts/generate-docs-data.ts && next build`).
- **TypeScript:** Used extensively (`^5.9.3`), with configuration in `tsconfig.json` utilizing the bundler module resolution.
- **Styling Config:** Tailwind CSS version `^4` configured using `@tailwindcss/postcss` via `postcss.config.mjs`. (Note: `tailwind.config.ts` was not found, implying Tailwind V4 handles variables primarily via CSS).
- **Major Dependencies:** `@ai-sdk/google`, `lucide-react`, `framer-motion`, `@xyflow/react`, `recharts`, `drizzle-orm`.

## 3. Application Entry & Bootstrap

The application uses Next.js App Router with the root layout localized.

- **Root Layout:** `src/app/[locale]/layout.tsx` serves as the primary entry.
- **Font Initialization:** Custom fonts (YekanBakh, Peyda, and an English Title font) are loaded via `next/font/local` and injected into the HTML tag as CSS variables (`--font-persian-primary`, `--font-persian-display`, `--font-english-title`).
- **Directionality Definition:** The `dir` and `lang` attributes on the `<html>` element are defined dynamically based on the current locale (`fa` = `rtl`, others = `ltr`).
- **Providers:**
  - `ThemeProvider` manages theme (light/dark/persian palettes) and language.
  - `AuthProvider` wraps the rest of the application, handling session state and role permissions.
- **Global CSS:** `src/app/globals.css` is imported in the root layout and contains extensive custom CSS variables, complex background animations (`@keyframes`), and specific base layer classes for theming.

## 4. Routing Architecture

Routing is managed via Next.js App Router under `src/app/[locale]/`.

- **Primary Locale Route:** `[locale]/` handles internationalization.
- **Top-Level Public Routes:** `/about`, `/blog`, `/contact`, `/pricing`, `/login`, `/register`, `/solutions`, `/features`, `/services`, etc.
- **Dashboard Routes:** `[locale]/dashboard/` is heavily nested:
  - `aeo/`
  - `analytics/`
  - `audits/`
  - `billing/`
  - `brand/`
  - `brand-monitoring/`
  - `competitors/`
  - `content/`
  - `entities/`
  - `query/`
  - `seo/`
  - `services/`
  - `settings/`
- **Route Layout Strategy:** Layouts (`layout.tsx`) wrap specific route segments. e.g., the `[locale]/dashboard/layout.tsx` wraps all dashboard sub-routes within a `ProtectedRoute` component to enforce authentication and layout shell (TopBar, Sidebar).

## 5. Component Architecture

Components are organized in `src/components/`, sub-divided by functional domains:

- **Primitive/UI Components:** Direct files in `src/components/` (e.g., `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx`, `Dialog.tsx`).
- **Layout & Shell:** `DashboardShell.tsx`, `navigation/AppSidebar.tsx`, `navigation/DashboardSidebar.tsx`, `navigation/DashboardTopbar.tsx`.
- **Feature Specific UI:** Stored in `src/components/features/` with separate sub-directories for `audit`, `graph`, `analytics`, `dashboard-home`, etc.
- **Component Pattern Analysis:** Primitive components exhibit hard-coded styling and rely on direct string manipulation for variants rather than external variant systems. For example, `Button.tsx` implements its own dictionary of `variants` and `sizes` (e.g. `primary: "bg-[image:var(--gradient-primary)]..."`) rather than utilizing standard `cva` composition.

## 6. Styling Architecture

The project mixes Tailwind CSS with heavy reliance on custom CSS properties and PostCSS processing:

- **Global File:** `src/app/globals.css` leverages Tailwind v4. It explicitly defines custom animations (`@keyframes`), dark/light theme color mappings via CSS Variables (`:root`), and utility overrides (`@layer base`).
- **Variant Generation:** Components (e.g., `Button.tsx`) use string concatenation maps for their classes (e.g. ``bg-[var(--glass-bg)] text-[var(--text-primary)]``) heavily leveraging CSS variables instantiated in `globals.css`.
- **Inline Hardcoded Values:** Component logic frequently ties UI explicitly to locale parameters using ternary operators (e.g., ``className={`absolute bottom-20 ${isRtl ? "-left-3" : "-right-3"}`}``).
- **Multiple Styling Paradigms:** There is evidence of Tailwind's typical utility classes mixed deeply with arbitrary value classes that invoke raw CSS properties, such as ``bg-[image:var(--gradient-primary)]``.

## 7. Typography & Font Loading

- **Primary Typefaces:**
  - YekanBakh (Persian Body)
  - Peyda (Persian Display/Heading)
  - BoxFace (English Title/Brand SEO font)
- **Mechanism:** Loaded via `next/font/local` in `src/config/fonts.ts`.
- **Integration:** Initialized as CSS variables (`--font-persian-primary`, etc.) injected into the HTML root element at `src/app/[locale]/layout.tsx`.

## 8. Responsive Architecture

- **Tailwind Breakpoints:** The application uses standard Tailwind breakpoints (`sm:`, `md:`, `lg:`) extensively to switch layouts.
- **Application:** Most layouts use `md:hidden` and `lg:flex` strategies, specifically noted in `DashboardSidebar.tsx` and `DashboardTopbar.tsx` where sidebars collapse or change their display nature based on viewport width.
- **Inconsistencies:** Some spacing and component sizing utilizes manual arbitrary configurations, though broad structure aligns with Tailwind defaults.

## 9. RTL & Directionality

- **Implementation Mechanism:**
  1. The HTML element is given `dir="rtl"` dynamically in `RootLayout`.
  2. Individual UI components rely heavily on a computed `isRtl` boolean (usually via `language === "fa"` from `useTheme()`).
- **Conventions Used:** Components predominantly use explicit conditionals (`isRtl ? "left-0" : "right-0"`) rather than relying purely on CSS logical properties (e.g., `margin-inline`, `padding-inline`), forcing tight coupling between UI components and language state.

## 10. Reusable UI Patterns

Several UI primitives exist natively in `src/components/`, including:

- **Button:** `Button.tsx` (Contains manual variant handling)
- **Input:** `Input.tsx` (Uses `flex` wrapping for labels/errors with hardcoded CSS variables)
- **Badge:** `Badge.tsx` (Manual styles map for success/warning/error states)
- **Card:** `Card.tsx` (Contains multiple exported elements like `CardHeader`, `CardTitle`, functioning as a composite pattern)
- **Dialog:** `Dialog.tsx` (Includes background overlay logic and `max-w-lg` constraints)
- **Observation:** They are reusable by location but contain internally hard-coded design assumptions that don't scale effortlessly to a design-system migration without refactoring.

## 11. Existing Design Tokens / Theme Infrastructure

- **CSS Variables:** The system relies deeply on CSS variables configured in `src/app/globals.css`.
  - Colors (`--sky-blue-500`, `--orange-400`, `--background`, `--card`, `--border`)
  - Shadows (`--shadow-md`, `--shadow-lg`)
  - Radii (`--radius-md`, `--radius-lg`, `--radius-xl`)
- **Theme Provider:** `ThemeProvider.tsx` toggles `.light` and `.dark` classes on the `documentElement`, cascading the CSS variable changes.

## 12. Technical Constraints & Migration Risks

- **Hard-Coded Directionality Logic:** Using ternary operators like `isRtl ? 'pr-6' : 'pl-6'` across hundreds of layout points creates severe risk during a design-system swap where standard logical properties (like `ps-6`) are usually expected.
- **Variant Handling:** The lack of a uniform tool like `class-variance-authority` in native components forces manual maintenance of string class maps.
- **Tight Coupling:** Dashboard components implicitly rely on global CSS variables from `globals.css` rather than a unified token definition system (e.g. extending the Tailwind theme cleanly), increasing migration debt.

## 13. Design-System Migration Recommendations

1. **Standardize Component Variations:** Replace manual string-mapped variant configurations with a library like `cva` to establish a uniform API across all primitives (`Button`, `Badge`, `Input`).
2. **Transition to Logical CSS Properties:** Begin replacing manual `isRtl ? 'left-4' : 'right-4'` conditionals with Tailwind's logical properties (`start-4`, `end-4`, `ms-`, `pe-`). This removes JavaScript-level dependencies on `isRtl` for simple layout flips.
3. **Formalize Token Hierarchy:** Map all arbitrary CSS variable usages (`[var(--muted-surface)]`) to proper Tailwind theme extensions. This ensures consistency and leverages Tailwind V4 capabilities.
4. **Decouple Layouts from Locales:** Investigate refactoring the sidebar and topbar to rely on CSS grid/flex directionality inherited from the `dir="rtl"` HTML tag instead of observing `language` state.

## 14. Key Files & Architectural References

- **Global Styles:** `src/app/globals.css`
- **Application Root:** `src/app/[locale]/layout.tsx`
- **Theme/State Management:** `src/components/ThemeProvider.tsx`, `src/components/AuthProvider.tsx`
- **Font Configuration:** `src/config/fonts.ts`
- **Reusable Primitives:** `src/components/Button.tsx`, `src/components/Card.tsx`, `src/components/Input.tsx`
- **Complex UI Layouts:** `src/components/navigation/DashboardSidebar.tsx`
