# Vibe Git Skill

A cross-platform **TypeScript-based AI Agent Skill** for project management through **GitHub** and **GitLab**. It persists a structured, linear "vibe coding workflow" that turns issues and milestones into actionable development context for AI coding agents.

## What It Does

This is **not** just a Git API wrapper. It is a **context-aware development workflow engine** that uses issues, milestones, and progress as structured long-term memory for AI coding.

The core loop:

```
User idea → Create issue → Generate plan → Code step-by-step → Commit → Update progress → Next issue
```

## Features

| Feature | Description |
|---|---|
| **Provider Abstraction** | Swap between GitHub and GitLab without changing any workflow code |
| **Context Engine** | Converts issues + milestones into structured AI-readable context |
| **Linear Workflow** | Deterministic step-by-step plan execution — no parallel tasks |
| **Local Memory** | Persists plans, progress, and commits as JSON in `.vibe-memory/` |
| **Commit Generator** | Produces conventional commits referencing issue IDs automatically |
| **CLI Interface** | Simple commands for every workflow step |

## Quick Start

### 1. Install

```bash
npm install
npm run build
```

### 2. Configure

Set the required environment variables. You can either export them directly in your shell or use a `.env` file (copy `.env.example` as a starting point):

```bash
# Option A: copy the example file and edit it
cp .env.example .env

# Option B: export directly
export PROVIDER=github
export GITHUB_TOKEN=ghp_xxxx
export GITHUB_OWNER=your-org
export GITHUB_REPO=your-repo
```

**GitHub:**
```env
PROVIDER=github
GITHUB_TOKEN=ghp_xxxx
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
```

**GitLab:**
```env
PROVIDER=gitlab
GITLAB_TOKEN=glpat-xxxx
GITLAB_PROJECT_ID=12345
GITLAB_BASE_URL=https://gitlab.com
```

### 3. Use

```bash
# Get structured context for the AI agent
npx agent-skill context

# Get context scoped to a topic
npx agent-skill context -q "authentication"

# Create a new issue
npx agent-skill create-issue -t "Implement JWT auth" -d "Add token validation"

# Generate a plan from an issue
npx agent-skill plan -i 42

# Continue the workflow (get next step + commit suggestion)
npx agent-skill continue

# Mark a step as done
npx agent-skill complete-step -s abc1234

# View current progress
npx agent-skill progress
```

## CLI Commands

| Command | Description |
|---|---|
| `agent-skill context [-q query]` | Build structured context from issues and milestones |
| `agent-skill create-issue -t <title> [-d <desc>]` | Create a new issue |
| `agent-skill plan -i <issueId>` | Generate a development plan from an issue |
| `agent-skill continue` | Get the next pending step and suggested commit message |
| `agent-skill complete-step -s <sha>` | Mark the current step as complete |
| `agent-skill progress` | Show workflow progress summary |

## Context Engine Output

When you run `agent-skill context`, the engine produces a structured JSON object that any AI agent can consume:

```json
{
  "currentMilestone": "v1.0 - Core Features",
  "openTasks": [
    "#12: Implement JWT authentication",
    "#14: Add rate limiting"
  ],
  "completedTasks": [
    "#10: Setup project structure",
    "#11: Add database models"
  ],
  "currentFocus": "#12: Implement JWT authentication",
  "recommendedNextStep": "Start working on #12: Implement JWT authentication"
}
```

## Using with AI Coding Agents

### Claude Code

Add this to your Claude Code project instructions:

```
Before starting any task, run:
  npx agent-skill context -q "<current task>"

Use the returned context to understand what milestone is active,
which tasks are open, and what the recommended next step is.

After completing a step, run:
  npx agent-skill complete-step -s <commit-sha>

Always reference the issue ID in commit messages.
```

### OpenCode

Configure OpenCode to call the CLI before each coding session:

```
1. Run `npx agent-skill context` to load project state
2. Parse the JSON output as your working context
3. Use `npx agent-skill continue` to get the next step
4. After coding, run `npx agent-skill complete-step -s <sha>`
```

### OpenClaw

Integrate via the tool-calling interface:

```
Tools available:
- agent-skill context: Returns project context as JSON
- agent-skill plan -i <id>: Generates step-by-step plan
- agent-skill continue: Returns next action to take
- agent-skill complete-step -s <sha>: Records progress

The agent should call these tools in the linear workflow order.
```

### How It Enables Vibe Coding

Traditional coding agents start from scratch each session. This skill gives them **persistent memory**:

1. **Before coding**: The agent reads context (milestones, open issues, progress) to understand where the project stands.
2. **During coding**: The workflow engine provides step-by-step guidance and commit message suggestions.
3. **After coding**: Progress is persisted locally, so the next session picks up exactly where you left off.

The `.vibe-memory/` directory acts as the agent's long-term project memory.

## Architecture

```
src/
├── core/                  # Types, interfaces, commit generator
│   ├── types.ts           # All shared TypeScript types
│   ├── provider.ts        # ProjectProvider interface
│   └── commit-generator.ts
├── providers/
│   ├── github/            # GitHub API implementation
│   └── gitlab/            # GitLab API implementation
├── context/               # Context engine (the brain)
│   └── context-engine.ts
├── workflow/              # Linear workflow engine
│   └── workflow-engine.ts
├── memory/                # Local JSON persistence
│   └── memory-store.ts
└── cli/                   # CLI entry point
    ├── index.ts
    └── config.ts
```

### Design Principles

- **Provider interface**: All platform code is behind `ProjectProvider`. Adding a new platform (e.g., Gitea) means implementing one interface.
- **No hardcoded projects**: Everything is configured via environment variables.
- **Strong typing**: Every data structure is typed. No `any`.
- **Separation of concerns**: Context engine, workflow engine, memory, and providers are fully independent modules.

## Future Plan

> **Note**: This section describes planned functionality that is not yet implemented.

### Fully Local Vibe Coding System

A future version will support a **fully offline mode** that works without GitHub or GitLab:

- **Local filesystem as structured memory**: Issues, milestones, and plans stored as versioned markdown/JSON files in a `.vibe/` directory.
- **Git-native tracking**: Use git commits and tags as the timeline instead of API calls.
- **Zero dependencies on external services**: The entire workflow runs locally with `git` as the only requirement.
- **Bidirectional sync**: Optionally push/pull local state to GitHub/GitLab when connectivity is available.

This would make vibe coding work in air-gapped environments, on planes, or for developers who prefer fully local tooling.

## License

MIT
