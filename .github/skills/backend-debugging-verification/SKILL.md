---
name: backend-debugging-verification
description: 'Use when diagnosing backend bugs, tracing TypeScript issues, validating fixes, or verifying that a change compiles and behaves correctly in this Node.js project.'
argument-hint: 'Describe the bug, failing behavior, or command you want to validate.'
user-invocable: true
disable-model-invocation: false
---

# Backend Debugging and Verification

## When to Use
- Investigate a failing API, service, repository, or database flow
- Reproduce an error before making a fix
- Verify whether a code change resolves the root cause
- Check whether TypeScript or project tests still pass after edits

## Core Workflow

### 1) Reproduce and localize
- Start with the exact symptom: error message, stack trace, failing route, or incorrect output.
- Capture the smallest reliable reproduction path before changing code.
- Use targeted searches and narrow reads instead of reading the whole codebase.
- Trace the data flow to the failing layer: controller -> use case -> service -> repository -> database or external API.

### 2) Identify the root cause
- Look for the first incorrect assumption, missing guard, invalid input, bad mapping, or contract mismatch.
- Prefer one clear hypothesis over multiple speculative edits.
- Check recent changes, configuration, environment variables, and runtime assumptions.
- If the issue is not yet understood, stop and gather more evidence rather than patching blindly.

### 3) Lock in a failing check
- Add or use the smallest possible regression check: unit test, endpoint repro, or compile-time validation.
- The failing check should prove the bug before the fix and protect against regressions after the fix.
- If no automated test exists, use a minimal script or command that demonstrates the broken behavior.

### 4) Implement the fix
- Make the smallest root-cause fix that addresses the actual failure.
- Avoid unrelated refactors or broad cleanup while debugging.
- Keep the change focused on behavior, validation, and invariants.

### 5) Verify with fresh evidence
- Run the narrowest relevant validation: TypeScript compile, targeted tests, or project command that exercises the changed path.
- Confirm the original issue no longer reproduces.
- Check for new errors or regressions in adjacent behavior.
- Only call the fix complete when the verification output is clean and relevant.

## Decision Points

### If the issue is a compile or type error
- Read the exact error and fix the type contract, interface, or implementation mismatch first.
- Re-run the TypeScript build or project validation after the fix.

### If the issue is a runtime bug
- Trace the failing request and inspect the data at the boundary where it changes.
- Validate expected values, null/undefined handling, authorization, and environment configuration.

### If the issue is unclear
- Gather evidence from logs, request payloads, database state, and the relevant call chain.
- Reproduce in a smaller scope before broadening the fix.

## Completion Criteria
A task is ready to close only if all of the following are true:
- The root cause is understood and documented in reasoning.
- The fix is minimal and directly addresses that cause.
- The relevant verification command has been run successfully.
- The original bug no longer reproduces under the same conditions.
- No obvious adjacent regressions were introduced.

## Preferred Project Practices
- Prefer targeted reads over full-file exploration.
- Favor real behavior checks over mock-only assertions.
- Keep commands focused and deterministic.
- If the project uses TypeScript, validate with the compiler or the project’s smallest applicable build/test step.

## Example Prompts
- "Debug the login flow and identify why tokens are not generated correctly."
- "Fix the failing order creation path and verify it with the smallest relevant check."
- "Why is this API returning 500 after the recent service change?"
- "Validate whether the TypeScript build still passes after the repository update."
