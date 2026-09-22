# ESLint Remediation Plan

## 1. Objective
This document defines a rigorous, executable remediation plan for future Jules sessions to resolve ESLint violations. It establishes how work will be sequenced, discovered, and executed, without prematurely defining unknown file boundaries or task counts.

## 2. Baseline Reference
This plan operates on the evidence documented in `docs/lint/LINT-BASELINE-REPORT.md`. The latest verified inventory reported 681 total violations (343 errors, 338 warnings) across 142 files out of 481 scanned.

## 3. Historical-vs-Current Measurement Model
- **Snapshot A**: Earlier observed lint state (679 total).
- **Snapshot B**: Latest verified inventory (681 total).
- **Execution-time rerun**: The current state when a future remediation task begins (must be measured at the start of the task).
- **Post-task measurement**: State after a specific task completes (measured against the execution-time starting measurement, not the historical "681").
- **Final lint gate**: Final verified repository state (target: 0 errors, 0 warnings, unless policy explicitly allows otherwise).

## 4. Plan-Time vs Execution-Time Distinction
- **Plan-Time**: This document defines the historical baseline, remediation categories, ordering, dependency/ownership principles, and the method future sessions must use. It does not map every future file or define the exact final task count.
- **Execution-Time**: Future Jules sessions are responsible for rerunning `pnpm run lint`, discovering current violations, determining exact affected files, bounding ownership domains, and determining final task counts for implementation.

## 5. Remediation Ordering
The execution must follow this conceptual order:
1. LINT-001 — Baseline
2. LINT-002 — Parse / Syntax Errors
3. LINT-003 — React Hooks Reliability
4. LINT-004 — Unused Variables / Imports
5. LINT-005+ — Explicit Any by Evidence-Based Ownership
6. Final Lint Gate

## 6. LINT-001: Baseline
- **Objective**: Establish and publish the verified lint evidence.
- **Status**: Completed by the creation of the `LINT-BASELINE-REPORT.md` and this plan.
- **Non-goals**: No code implementation is performed in this stage.

## 7. LINT-002: Parse / Syntax Errors
- **Objective**: Fix files failing to parse.
- **Baseline Context**: 17 parse/syntax errors were observed.
- **Execution-Time Discovery**: Rerun the canonical lint command, identify actual current parse violations, map them to exact files, and inspect causes.
- **Implementation Requirements**: Fix only parse/syntax issues within the task boundary.
- **Validation**: Verify that the affected files become parsable using `pnpm run lint`.

## 8. LINT-003: React Hooks Reliability
- **Objective**: Resolve `react-hooks/set-state-in-effect` (baseline: 13) and `react-hooks/exhaustive-deps` (baseline: 6).
- **Execution-Time Discovery**: Map exact files and inspect the surrounding component logic.
- **Implementation Requirements**: Remediate based on behavioral intent. Do not blindly add dependencies, alter lifecycles merely to satisfy ESLint, or suppress without understanding.
- **Non-goals**: Broad component refactoring.

## 9. LINT-004: Unused Variables / Imports
- **Objective**: Resolve `@typescript-eslint/no-unused-vars` (baseline: 315).
- **Execution-Time Discovery**: Distinguish genuinely unused code from framework/contract-required parameters.
- **Implementation Requirements**: Remove genuinely dead variables/imports. Prefix with `_` only where repository configuration and actual contracts justify it.
- **Non-goals**: Unrelated cleanup.

## 10. LINT-005+ Methodology (Explicit Any)
- **Objective**: Resolve `@typescript-eslint/no-explicit-any` (baseline: 295) and organically integrate remaining rules (e.g., `no-require-imports`, `ban-ts-comment`, `no-unescaped-entities`) based on ownership.
- **Execution-Time Discovery**:
  1. Extract current violations.
  2. Map to exact files.
  3. Inspect surrounding code.
  4. Determine actual ownership and coupling.
  5. Identify shared dependencies.
  6. Determine safe execution boundaries to create concrete LINT-005+ task scopes (e.g., LINT-005A, LINT-005B).
- **Crucial Rule**: The final number of LINT-005+ execution tasks is intentionally undetermined at plan time. It must be established during execution-time repository inspection based on current lint output, actual file ownership, coupling, and safe parallelization boundaries.
- **Implementation Requirements**:
  - Replace `any` with concrete types where knowable.
  - Use `unknown` only where genuinely unknown, and narrow appropriately.
  - Preserve runtime behavior and public API contracts.
  - Avoid purely cosmetic assertions or blanket suppressions.

## 11. Execution-Time Domain Discovery Process
Do not create domains merely because directories exist or automatically assign one task per feature. The goal is:
*"the smallest set of independently executable ownership boundaries that provides safe parallelization without creating unsafe overlap or merge conflicts."*
Execution sessions must not split tightly coupled files or merge unrelated ownership areas merely to hit task counts.

## 12. Task-Definition Contract
At execution time, every future session must identify:
- Exact current lint evidence and files in scope.
- Actual ownership boundaries and dependencies.
- Files/directories forbidden from modification.
- Implementation requirements, validation commands, expected impact, regression checks, and final diff scope.
If the repository state differs from the baseline, use the current state for implementation while preserving historical evidence.

## 13. Dependency Graph
- LINT-001 determines LINT-002, LINT-003, LINT-004, LINT-005+.
- LINT-002 must complete sequentially before proceeding deeply into subsequent TypeScript typing tasks to ensure the codebase parses.
- Concrete LINT-005+ task IDs (e.g., LINT-005A) will only enter the graph when discovered at execution time.
- The Final Lint Gate depends on the completion of all preceding tasks.

## 14. Parallelization Strategy
Parallelization is purely ownership-driven. Two tasks may run concurrently only when:
- File scopes do not overlap.
- Architectural dependencies do not overlap unsafely.
- Neither task requires the other's changes.
- Shared interfaces are understood and stable.
- Merge conflicts are reasonably avoidable.

## 15. File Ownership Principles
Execution sessions must strict lock target files. Do not modify files outside the discovered ownership domain boundary of the specific task.

## 16. Validation Strategy
- Use `pnpm run lint` for validation.
- Capture state before editing, execute fixes, and capture state after. Compare the post-task result against the immediate pre-task state.

## 17. Quality-Preservation Rules
Do not:
- Disable rules globally or weaken configurations.
- Add broad rule exceptions, blanket suppressions, or unnecessary `eslint-disable` comments.
- Run blind `eslint --fix` without verifying behavioral impact.
- Replace every `any` with `unknown` indiscriminately.
- Add meaningless type assertions.

## 18. Final Lint Gate
- **Command**: `pnpm run lint`
- **Criteria**: 0 errors, 0 warnings (unless an explicit policy overrides this).
- The final gate must verify actual command exit status and output.

## 19. Risk Considerations
- Changing type signatures in highly coupled domains risks downstream breakage. Type contracts must be preserved unless genuinely incorrect.
- React hook dependency changes risk render loops.

## 20. Definition of Done
A remediation task is done when its target files pass `pnpm run lint`, runtime behavior is preserved, type safety is improved without cosmetic suppressions, and the Final Lint Gate can be cleared upon the conclusion of all tasks.

## 21. Recommended Execution Order
Start with sequential LINT-002, followed by LINT-003 and LINT-004. Progress to LINT-005+ only after execution-time discovery establishes safe parallel boundaries.
