# Git Controls & Workflow Standards

This document serves as the foundation for version control management in the TzDraft monorepo. All contributors are expected to adhere to these standards to maintain codebase health and deployment reliability.

## 1. Branching Strategy: GitFlow-Lite

We utilize a structured branching model to separate stable code from active development.

| Branch Type | naming Convention | Target | Description |
| :--- | :--- | :--- | :--- |
| **Main** | `main` | - | **Production-ready only.** Merges to main trigger deployment. |
| **Develop** | `develop` | `main` | **Integration branch.** All features merge here first. |
| **Feature** | `feat/*` | `develop` | New features, enhancements, or experiments. |
| **Fix** | `fix/*` | `develop` | Bug fixes and hot patches for non-production environments. |
| **Chore** | `chore/*` | `develop` | Maintenance tasks, dependencies, and configuration changes. |
| **Hotfix** | `hotfix/*` | `main` | Critical production fixes that bypass standard develop cycles. |

## 2. Commit Message Convention: Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This enables automated changelog generation and easier history analysis.

### Format
`<type>(<scope>): <subject>`

### Types
- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process or auxiliary tools and libraries.

### Monorepo Scopes
- `core`: Root configuration, scripts, or workspace settings.
- `web`: Changes localized to the `frontend/` directory.
- `api`: Changes localized to the `backend/` directory.
- `mobile`: Changes localized to the `apps/mobile/` directory.
- `shared`: Changes to shared logic in `packages/shared-client/`.
- `engine`: Changes to game engines in `packages/` or `engines/`.

### Examples
- `feat(web): implementation of undo button for mobile local games`
- `fix(api): correction of matchmaking race condition on high latency`
- `chore(core): add commitlint to enforce message standards`

## 3. Pull Request (PR) Policy

1. **Self-Review**: Ensure code follows established linting and formatting rules.
2. **CI Compliance**: All GitHub Actions (`ci.yml`) must pass before a merge is considered.
3. **Atomic Changes**: PRs should focus on a single responsibility or feature area.
4. **Squash & Merge**: Standard merge strategy for `develop` to maintain a linear and readable integration history.

---
*Last Updated: 2026-04-12*
