---
name: vibe-git-skill
description: Context-aware development workflow engine for AI coding agents with GitHub/GitLab integration
license: MIT
compatibility: opencode, claude-code
metadata:
  audience: ai-agents, developers
  workflow: github, gitlab
---

## What I do

- Provide structured project context (issues, milestones, progress) to AI coding agents
- Enforce a deterministic linear workflow: idea → issue → plan → code → commit → progress
- Generate conventional commit messages referencing issue IDs
- Persist workflow state locally in `.vibe-memory/` as long-term memory across sessions
- Abstract GitHub and GitLab behind a unified provider interface

## When to use me

Use this when an AI coding agent needs persistent project context and a structured development workflow.
The skill turns issues and milestones into actionable steps with automatic commit message generation.

Ask clarifying questions if the target provider (GitHub vs GitLab) or project configuration is unclear.

## Commands

| Command | Description |
|---|---|
| `agent-skill context [-q query]` | Build structured context from issues and milestones |
| `agent-skill create-issue -t <title> [-d <desc>]` | Create a new issue from a user idea |
| `agent-skill plan -i <issueId>` | Generate a step-by-step development plan from an issue |
| `agent-skill continue` | Get the next pending step and a suggested commit message |
| `agent-skill complete-step -s <sha>` | Mark the current step as complete |
| `agent-skill progress` | Show workflow progress summary |
