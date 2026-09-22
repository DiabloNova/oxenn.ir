# ESLint Baseline Report

## 1. Purpose
This document establishes the verified historical baseline of ESLint violations in the repository. It serves as the durable handoff for future execution sessions to understand the known evidence, the repository's lint architecture, and the boundaries of current knowledge.

## 2. Investigation Context
An investigation was conducted to analyze reported ESLint failures. The investigation verified that the failure is caused by actual lint violations in the repository, not by a missing dependency or configuration error. The investigation produced two distinct snapshots of the repository's lint state.

## 3. Repository Lint Architecture
The repository uses ESLint with `eslint.config.mjs`, pulling from `eslint/config`, `eslint-config-next/core-web-vitals`, and `eslint-config-next/typescript`.
It ignores `.next/**`, `out/**`, `build/**`, and `next-env.d.ts` globally.
The linting process is wrapped by `lint-wrapper.js`, which programmatically invokes the ESLint Node API.

## 4. Exact Commands Used
- **Canonical lint command**: `pnpm run lint` (The primary repository lint command).
- **Direct wrapper execution**: `node lint-wrapper.js` (Executes the repository's lint wrapper directly).
- **ESLint dependency verification**: `pnpm list eslint` (Used to verify the installed ESLint dependency).
- **Dependency installation**: `pnpm install` (Executed during the investigation).

## 5. ESLint Dependency Verification
The investigation verified the installed dependency state:
- **eslint**: `9.39.5` (installed as a `devDependency`).

## 6. Snapshot A (Earlier Investigation Run)
The initial observation reported the following state:
- Total violations: 679
- Errors: 341
- Warnings: 338

## 7. Snapshot B (Latest Inventory Run)
A subsequent, more detailed inventory scan reported:
- Files scanned: 481
- Affected files: 142
- Total violations: 681
- Errors: 343
- Warnings: 338

## 8. Reconciliation of the Two Snapshots
Snapshot A and Snapshot B represent two separate observed points in time.
They are not merged. The difference in counts (679 vs 681 total) is treated as a factual observation without speculative causal explanation. Snapshot B is treated as the latest verified inventory available for planning.

## 9. Latest Verified Baseline
Based on Snapshot B, the latest verified baseline is:
- **Files scanned**: 481
- **Files with violations**: 142
- **Total violations**: 681
- **Errors**: 343
- **Warnings**: 338

## 10. Rule Distribution
The latest inventory (Snapshot B) found the following highest-frequency rules:
| Rule | Count |
| :--- | :--- |
| `@typescript-eslint/no-unused-vars` | 315 |
| `@typescript-eslint/no-explicit-any` | 295 |
| Parse / syntax errors | 17 |
| `@typescript-eslint/no-require-imports` | 14 |
| `react-hooks/set-state-in-effect` | 13 |
| `@typescript-eslint/ban-ts-comment` | 9 |
| `react-hooks/exhaustive-deps` | 6 |
| `react/no-unescaped-entities` | 6 |

## 11. Top Affected Files
The latest inventory identified these high-concentration files:
| File | Verified Violations |
| :--- | :--- |
| `src/app/[locale]/dashboard/aeo/playground/page.tsx` | 41 |
| `src/features/ai-intelligence/repositories/index.ts` | 29 |
| `tests/services/auth/session.test.ts` | 26 |
| `tests/features/acquisition/crawl-limits.test.ts` | 25 |
| `tests/services/monitoring/ai-visibility-monitoring.test.ts` | 23 |
| `src/app/[locale]/dashboard/brand-monitoring/page.tsx` | 22 |
| `src/app/[locale]/dashboard/brand/citations/page.tsx` | 21 |

## 12. Evidence Available for Those Files
These seven files represent the reported highest-concentration examples available from the inventory. They are verified evidence of intense violation clustering.

## 13. Evidence Limitations
The seven files listed above are **not** a complete affected-file inventory.
The baseline evidence does not provide:
- Complete repository coverage.
- Complete file-level violation counts.
- Complete rule-to-file mapping.
- Domain ownership or feature ownership boundaries.
- Dependency/parallelization boundaries.

## 14. What is Known at Plan Time
At plan time, we know the historical snapshot counts, the latest verified inventory distribution, the core tools used, and the methodology required to safely approach remediation (categorized from Parse errors down to `explicit-any` domain tasks).

## 15. What Must Be Rediscovered at Execution Time
Future execution sessions must not assume Snapshot B is the current state. They must:
- Rerun `pnpm run lint` to get the actual current state.
- Determine exact affected files.
- Determine exact ownership and domain boundaries.
- Determine the final number of tasks required for explicit-any remediation.

## 16. Historical-Baseline Preservation Rules
- If future reruns produce different counts, record them as new measurements.
- Never rewrite this historical baseline to match a later measurement.
- A future execution session must not treat the historical number "681" as proof that exactly "681" violations currently exist.
