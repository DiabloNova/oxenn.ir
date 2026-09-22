# FE-001: Baseline Capture

## Objective
Establish visual and technical baselines for the application before beginning the Phase 1 architectural migration.

## Route Inventory
The application uses Next.js App Router with a `[locale]` dynamic segment for internationalization (`en` and `fa`).

### Public Routes
- `/` (Home)
- `/about`
- `/blog`
- `/contact`
- `/docs`
- `/docs/[slug]`
- `/features`
- `/industries`
- `/pricing`
- `/privacy`
- `/resources`
- `/services`
- `/services/[slug]`
- `/solutions`
- `/solutions/aeo`
- `/solutions/geo`
- `/solutions/protection`
- `/solutions/radar`

### Authentication Routes
- `/login`
- `/register`
- `/forgot-password`
- `/verify-email`

### User / Dashboard Routes
- `/profile`
- `/settings`
- `/invoice`
- `/(dashboard)/dashboard/prompts`
- `/dashboard`
- `/dashboard/aeo/audits`
- `/dashboard/aeo/content`
- `/dashboard/aeo/playground`
- `/dashboard/analytics`
- `/dashboard/analytics/llm`
- `/dashboard/analytics/llm-bias`
- `/dashboard/audits`
- `/dashboard/audits/[id]`
- `/dashboard/billing`
- `/dashboard/brand`
- `/dashboard/brand-monitoring`
- `/dashboard/brand/citations`
- `/dashboard/competitors`
- `/dashboard/competitors/radar`
- `/dashboard/content`
- `/dashboard/content/ingestion`
- `/dashboard/content/studio`
- `/dashboard/entities`
- `/dashboard/entities/graph`
- `/dashboard/query`
- `/dashboard/seo/schema`
- `/dashboard/seo/technical`
- `/dashboard/services`
- `/dashboard/settings`

## Theming Behavior
- The application supports **Light** and **Dark** themes.
- Theme state is managed via `ThemeProvider.tsx` and toggles `.light` and `.dark` classes on the `<html>` root element.
- Initial theme relies on `localStorage` ("theme") and falls back to the system's `prefers-color-scheme`.
- CSS custom variables are heavily utilized for colors and gradients in `globals.css` and are tied to these `.light`/`.dark` classes.

## RTL / LTR Layout Behavior
- Layout direction is mapped directly to the active locale (`fa` -> `rtl`, `en` -> `ltr`).
- The `dir` and `lang` attributes are injected dynamically into the `<html>` root tag via `RootLayout` and updated by `ThemeProvider.tsx`.
- The current implementation extensively uses explicit inline `isRtl` boolean logic within components (e.g., `isRtl ? 'pr-6' : 'pl-6'`) rather than CSS logical properties.
- Fonts are tailored to direction: Persian fonts (`YekanBakh`, `Peyda`) for `fa`, and standard/English fonts (`BoxFace`, `Inter`) for `en`.

## Responsiveness (Desktop/Mobile)
- Standard Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) are used throughout the UI to adapt components across breakpoints.
- Navigation elements are adapted for mobile vs desktop views (e.g. standard headers vs mobile menus).
- Baseline measurements confirm the necessity to migrate away from hard-coded pixel widths and margins towards flex/grid gaps and logical spacing per the transition plan.

## Conclusion
This baseline capture verifies the structural routing, theme management, and directional behaviors currently active in the application, setting the stage for `FE-002: Token Map & Design System Foundation`.
