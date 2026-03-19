# CLAUDE.md

## Project Overview

vibe-git-skill is a TypeScript-based AI agent skill that provides a context-aware development workflow engine. It integrates with GitHub and GitLab to turn issues and milestones into actionable development context for AI coding agents.

## Build & Test Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm run lint         # Type-check without emitting (tsc --noEmit)
npm test             # Run all tests (jest --passWithNoTests)
npm run dev          # Run CLI in development mode (ts-node)
```

## Architecture

- `src/core/` — Shared types, interfaces (`ProjectProvider`), and the commit message generator
- `src/providers/github/` — GitHub API implementation of `ProjectProvider`
- `src/providers/gitlab/` — GitLab API implementation of `ProjectProvider`
- `src/context/` — Context engine that builds structured AI-readable context from issues and milestones
- `src/workflow/` — Linear workflow engine enforcing: idea → issue → plan → code → commit → progress
- `src/memory/` — Local JSON persistence in `.vibe-memory/` directory
- `src/cli/` — Commander.js CLI entry point with all user-facing commands

## Code Conventions

- TypeScript strict mode enabled
- Conventional commit format: `type(scope): message (#issueId)`
- No `any` types — all data structures are fully typed
- All platform-specific code is behind the `ProjectProvider` interface
- Tests are co-located with source files using `.test.ts` suffix
- Jest with ts-jest preset for testing
- Configuration via environment variables (see `.env.example`)

## Workflow

Before starting any task, run:
```bash
npx agent-skill context -q "<current task>"
```

After completing a step, run:
```bash
npx agent-skill complete-step -s <commit-sha>
```

Always reference the issue ID in commit messages.
