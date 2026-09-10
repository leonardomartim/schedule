# AGENTS.md

## Golden Rules

- Keep every file under 500 lines. Split large modules into focused files with narrow responsibilities.
- Prefer grep-friendly, distinctive names, over vague names like `helper` or `utils`.
- Use mandatory TypeScript typing for all props, state, events, and data shapes. Avoid `any` unless it is explicitly justified and documented.
- Favor small, composable modules and explicit interfaces over broad monolithic files.

## XP / TDD Development Cycle

- Request the failing test before implementation. The default workflow is: test first, watch it fail, implement the minimal fix, then re-run the suite.
- Aim for 1:1 coverage: every production behavior should have a matching test, and every bug fix should start with a regression test.
- Do not silently accept regressions. If a change affects behavior, add or update the matching test before declaring completion.

## Grep-friendly Architecture

- Name symbols to be searchable by meaning and domain. `UserRegistrationValidator` is easier to find via lexical search than `validator` or `check`.
- Use domain-specific terms consistently so the agent can navigate the codebase by searching for exact semantic clues instead of broad text patterns.
- Keep files, components, and functions named for what they do rather than for implementation details or incidental technology.

## Tag-based Release Automation

- Use Git tags as deployment triggers. Pushing a tag such as `v1.0.0` should trigger CI to build the app, package artifacts, and prepare release assets.
- GitHub Actions should be configured to run on tag pushes, validate the build, and publish Docker images or static build artifacts as part of the release pipeline.
- Treat the tag as the source of truth for versioning and release semantics.

## Deployment Script

- Standardize deployment with a script such as `bin/deploy` that wraps Docker + SSH operations.
- Keep deployment steps explicit and reproducible so the script acts as executable documentation.
- Fail fast on missing environment variables or failed remote commands; the agent should be able to run the deployment safely with a known, reviewable procedure.

## Operational Defaults

- Prefer explicit, readable code over clever abstractions.
- Keep the implementation understandable to a future agent or teammate reading it via grep and file navigation.
- When in doubt, favor narrower files, stronger typing, and test-first changes.
