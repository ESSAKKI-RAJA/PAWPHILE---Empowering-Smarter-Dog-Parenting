# Contributing to PAWPHILE

Thank you for your interest in contributing to **PAWPHILE**, the AI-Powered Preventive Healthcare Platform for Companion Dogs! We aim to build a robust, enterprise-grade, open-source medical informatics platform, and we welcome contributions from full-stack developers, ML researchers, and veterinary professionals.

---

## 🚀 Getting Started

### 1. Prerequisites
Before contributing, ensure your development environment is set up according to our [Installation Guide](README.md#installation). You will need:
- Node.js (v18+)
- Python (v3.11+)
- Git
- Access to Neon (PostgreSQL), Clerk, and Cloudinary

### 2. Fork and Clone
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/PAWPHILE.git
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ESSAKKI-RAJA/PAWPHILE.git
   ```

---

## 🌿 Branching Strategy

We follow a structured branching model. Please do not commit directly to `main`.

- `main`: Production-ready code.
- `develop`: Ongoing development. All PRs should target this branch.

### Branch Naming Conventions
Use clear, descriptive branch names indicating the type of work:
- `feat/feature-name` (New features)
- `fix/issue-description` (Bug fixes)
- `docs/documentation-update` (Documentation changes)
- `chore/task-name` (Maintenance, dependencies)
- `research/model-update` (ML/Vision specific updates)

*Example: `feat/offline-sync-queue` or `fix/jwt-validation-error`*

---

## 📝 Commit Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). This allows us to auto-generate changelogs and maintain semantic versioning.

### Format
```
<type>(<scope>): <subject>
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

*Example:* `feat(vision): integrate EfficientNet for DermAI`

---

## ✅ Pull Request Process

1. **Keep it focused**: PRs should address a single concern or issue. If you are adding multiple independent features, open separate PRs.
2. **Sync with upstream**: Ensure your branch is up to date with `upstream/develop`.
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```
3. **Tests pass**: Ensure all existing tests pass and add new tests for your feature.
   - Frontend: `npm test`
   - Backend: `pytest`
4. **Code Quality**: Ensure the code adheres to ESLint/Prettier standards (frontend) and PEP 8 / Flake8 (backend).
5. **Update Documentation**: If you change the API or architecture, update the corresponding markdown files in `docs/`.
6. **Create the PR**: Use our Pull Request Template to describe your changes clearly. Wait for a maintainer to review and approve your code.

---

## 🐞 Reporting Issues

We use GitHub Issues to track public bugs and requests. 

When opening an issue, please use the provided templates and include:
- A clear, descriptive title.
- Steps to reproduce (if it's a bug).
- Expected vs. actual behavior.
- Context (OS, browser, Python/Node versions).
- Relevant logs or screenshots.

---

## 🏥 Clinical & AI Guardrails

If you are contributing to the **PAWPHILE AI Core** or **Vision Service**, please adhere to our Safety Architecture guidelines:
1. **Never bypass emergency keywords**: The deterministic red-tier rules must take precedence over LLM generation.
2. **No diagnostic absolutes**: Ensure outputs clearly state they are *triage* and *informational*, appending disclaimers.

We appreciate your effort in keeping canine health safe and accurate!

---

By contributing, you agree that your contributions will be licensed under the project's [Apache 2.0 License](LICENSE).
