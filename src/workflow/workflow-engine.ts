import { ProjectProvider } from "../core/provider";
import { CommitGenerator } from "../core/commit-generator";
import { AgentContext, DevelopmentPlan, PlanStep, Issue } from "../core/types";
import { MemoryStore } from "../memory/memory-store";
import { ContextEngine } from "../context/context-engine";

/**
 * Linear Vibe Coding Workflow Engine.
 *
 * Enforces the deterministic flow:
 *   idea → issue → plan → code → commit → progress update
 */
export class WorkflowEngine {
  private readonly commitGen: CommitGenerator;

  constructor(
    private readonly provider: ProjectProvider,
    private readonly memory: MemoryStore,
    private readonly context: ContextEngine,
  ) {
    this.commitGen = new CommitGenerator();
  }

  // ── Step 1: Create Issue ──────────────────────────────────────────

  /** Create a new issue from a user idea. */
  async createIssue(title: string, description: string): Promise<Issue> {
    const issue = await this.provider.createIssue(title, description);
    this.memory.setCurrentIssue(issue.id);
    return issue;
  }

  // ── Step 2: Generate Plan ─────────────────────────────────────────

  /** Generate a development plan from an issue. */
  async generatePlan(issueId: number): Promise<DevelopmentPlan> {
    const issue = await this.provider.getIssue(issueId);
    const steps = this.deriveSteps(issue);

    const plan: DevelopmentPlan = {
      issueId: issue.id,
      issueTitle: issue.title,
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memory.savePlan(plan);
    this.memory.setCurrentIssue(issueId);
    return plan;
  }

  // ── Step 3: Continue (Execute Next Step) ──────────────────────────

  /**
   * Continue the workflow: execute the next pending step.
   * Returns the step to work on and a suggested commit message.
   */
  async continue(): Promise<{
    step: PlanStep | null;
    commitMessage: string | null;
    context: AgentContext;
    done: boolean;
  }> {
    const state = this.memory.load();
    if (state.currentIssueId === null) {
      const ctx = await this.context.buildContext();
      return { step: null, commitMessage: null, context: ctx, done: true };
    }

    const plan = state.plans.find((p) => p.issueId === state.currentIssueId);
    if (!plan) {
      const ctx = await this.context.buildContext();
      return { step: null, commitMessage: null, context: ctx, done: true };
    }

    const pendingStep = plan.steps.find((s) => s.status === "pending");
    if (!pendingStep) {
      // All steps done — close issue workflow
      this.memory.setCurrentIssue(null);
      const ctx = await this.context.buildContext();
      return { step: null, commitMessage: null, context: ctx, done: true };
    }

    // Mark step as in-progress
    pendingStep.status = "in-progress";
    plan.updatedAt = new Date().toISOString();
    this.memory.savePlan(plan);

    const issue = await this.provider.getIssue(state.currentIssueId);
    const commitMessage = this.commitGen.generate(issue, pendingStep.description);
    const ctx = await this.context.buildContext();

    return { step: pendingStep, commitMessage, context: ctx, done: false };
  }

  // ── Step 4: Complete Step ─────────────────────────────────────────

  /** Mark the current step as done and record the commit. */
  completeStep(commitSha: string): void {
    const state = this.memory.load();
    if (state.currentIssueId === null) return;

    const plan = state.plans.find((p) => p.issueId === state.currentIssueId);
    if (!plan) return;

    const inProgress = plan.steps.find((s) => s.status === "in-progress");
    if (inProgress) {
      inProgress.status = "done";
      inProgress.commitSha = commitSha;
      plan.updatedAt = new Date().toISOString();
      this.memory.savePlan(plan);

      const commitMessage = this.buildCommitMessage(state.currentIssueId, plan.issueTitle, inProgress.description);
      this.memory.recordCommit(commitSha, commitMessage, state.currentIssueId);
      this.memory.advancePlanStep();
    }
  }

  // ── Step 5: Progress ──────────────────────────────────────────────

  /** Get a progress summary for the current workflow. */
  getProgress(): {
    currentIssueId: number | null;
    totalSteps: number;
    completedSteps: number;
    currentStep: string | null;
    recentCommits: Array<{ sha: string; message: string }>;
  } {
    const state = this.memory.load();
    if (state.currentIssueId === null) {
      return {
        currentIssueId: null,
        totalSteps: 0,
        completedSteps: 0,
        currentStep: null,
        recentCommits: state.commits.slice(-5),
      };
    }

    const plan = state.plans.find((p) => p.issueId === state.currentIssueId);
    const steps = plan?.steps ?? [];
    const done = steps.filter((s) => s.status === "done").length;
    const current = steps.find((s) => s.status === "in-progress" || s.status === "pending");

    return {
      currentIssueId: state.currentIssueId,
      totalSteps: steps.length,
      completedSteps: done,
      currentStep: current ? current.description : null,
      recentCommits: state.commits.slice(-5),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Build a conventional commit message from issue metadata and step description.
   */
  private buildCommitMessage(issueId: number, issueTitle: string, stepDescription: string): string {
    const issue: Issue = {
      id: issueId,
      title: issueTitle,
      description: "",
      state: "open",
      labels: [],
      url: "",
      createdAt: "",
      updatedAt: "",
    };
    return this.commitGen.generate(issue, stepDescription);
  }

  /**
   * Derive plan steps from an issue's description.
   * Parses markdown checklists or creates a generic plan.
   */
  private deriveSteps(issue: Issue): PlanStep[] {
    const lines = issue.description.split("\n");
    const steps: PlanStep[] = [];
    let order = 1;

    for (const line of lines) {
      // Match markdown checklist items: - [ ] or - [x]
      const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (match) {
        const done = match[1].toLowerCase() === "x";
        steps.push({
          order: order++,
          description: match[2].trim(),
          status: done ? "done" : "pending",
          issueId: issue.id,
        });
      }
    }

    // If no checklist found, create a generic 3-step plan
    if (steps.length === 0) {
      steps.push(
        { order: 1, description: `Analyze requirements for: ${issue.title}`, status: "pending", issueId: issue.id },
        { order: 2, description: `Implement: ${issue.title}`, status: "pending", issueId: issue.id },
        { order: 3, description: `Test and verify: ${issue.title}`, status: "pending", issueId: issue.id },
      );
    }

    return steps;
  }
}
