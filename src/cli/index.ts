#!/usr/bin/env node

import { Command } from "commander";
import { createProvider } from "./config";
import { ContextEngine } from "../context/context-engine";
import { MemoryStore } from "../memory/memory-store";
import { WorkflowEngine } from "../workflow/workflow-engine";

const program = new Command();

program
  .name("agent-skill")
  .description("Cross-platform AI agent skill for vibe coding with GitLab/GitHub")
  .version("1.0.0");

// ── context ─────────────────────────────────────────────────────────

program
  .command("context")
  .description("Build structured agent context from issues and milestones")
  .option("-q, --query <query>", "Optional query to scope the context")
  .action(async (opts: { query?: string }) => {
    const provider = createProvider();
    const engine = new ContextEngine(provider);
    const ctx = await engine.buildContext(opts.query);
    console.log(JSON.stringify(ctx, null, 2));
  });

// ── create-issue ────────────────────────────────────────────────────

program
  .command("create-issue")
  .description("Create a new issue from a user idea")
  .requiredOption("-t, --title <title>", "Issue title")
  .option("-d, --description <desc>", "Issue description", "")
  .action(async (opts: { title: string; description: string }) => {
    const provider = createProvider();
    const memory = new MemoryStore();
    const context = new ContextEngine(provider);
    const workflow = new WorkflowEngine(provider, memory, context);
    const issue = await workflow.createIssue(opts.title, opts.description);
    console.log(`Created issue #${issue.id}: ${issue.title}`);
    console.log(`URL: ${issue.url}`);
  });

// ── plan ────────────────────────────────────────────────────────────

program
  .command("plan")
  .description("Generate a development plan from an issue")
  .requiredOption("-i, --issue <id>", "Issue ID", parseInt)
  .action(async (opts: { issue: number }) => {
    const provider = createProvider();
    const memory = new MemoryStore();
    const context = new ContextEngine(provider);
    const workflow = new WorkflowEngine(provider, memory, context);
    const plan = await workflow.generatePlan(opts.issue);
    console.log(`Plan for #${plan.issueId}: ${plan.issueTitle}`);
    console.log("Steps:");
    for (const step of plan.steps) {
      const mark = step.status === "done" ? "✓" : step.status === "in-progress" ? "→" : " ";
      console.log(`  [${mark}] ${step.order}. ${step.description}`);
    }
  });

// ── continue ────────────────────────────────────────────────────────

program
  .command("continue")
  .description("Continue the workflow — get the next step and suggested commit")
  .action(async () => {
    const provider = createProvider();
    const memory = new MemoryStore();
    const context = new ContextEngine(provider);
    const workflow = new WorkflowEngine(provider, memory, context);
    const result = await workflow.continue();

    if (result.done) {
      console.log("No pending steps. Workflow is complete or no issue is selected.");
      console.log("\nContext:");
      console.log(JSON.stringify(result.context, null, 2));
      return;
    }

    console.log(`Next step: ${result.step?.description}`);
    console.log(`Suggested commit: ${result.commitMessage}`);
    console.log("\nContext:");
    console.log(JSON.stringify(result.context, null, 2));
  });

// ── progress ────────────────────────────────────────────────────────

program
  .command("progress")
  .description("Show current workflow progress")
  .action(() => {
    const memory = new MemoryStore();
    const state = memory.load();
    const currentIssueId = state.currentIssueId;

    const plan = currentIssueId !== null
      ? state.plans.find((p) => p.issueId === currentIssueId)
      : undefined;
    const steps = plan?.steps ?? [];
    const completedSteps = steps.filter((s) => s.status === "done").length;
    const currentStep = steps.find((s) => s.status === "in-progress" || s.status === "pending");

    const p = {
      currentIssueId,
      totalSteps: steps.length,
      completedSteps,
      currentStep: currentStep?.description ?? null,
      recentCommits: state.commits.slice(-5),
    };

    if (p.currentIssueId === null) {
      console.log("No active issue. Use 'agent-skill plan -i <id>' to start.");
      return;
    }

    console.log(`Issue: #${p.currentIssueId}`);
    console.log(`Progress: ${p.completedSteps}/${p.totalSteps} steps`);
    if (p.currentStep) {
      console.log(`Current step: ${p.currentStep}`);
    }
    if (p.recentCommits.length > 0) {
      console.log("\nRecent commits:");
      for (const c of p.recentCommits) {
        console.log(`  ${c.sha.slice(0, 7)} ${c.message}`);
      }
    }
  });

// ── complete-step ───────────────────────────────────────────────────

program
  .command("complete-step")
  .description("Mark the current step as done")
  .requiredOption("-s, --sha <sha>", "Commit SHA for the completed step")
  .action((opts: { sha: string }) => {
    const memory = new MemoryStore();
    const provider = createProvider();
    const context = new ContextEngine(provider);
    const workflow = new WorkflowEngine(provider, memory, context);
    workflow.completeStep(opts.sha);
    console.log("Step completed and recorded.");
  });

program.parse();
