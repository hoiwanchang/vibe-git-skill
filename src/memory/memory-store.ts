import * as fs from "fs";
import * as path from "path";
import { WorkflowState, DevelopmentPlan, MilestoneProgress } from "../core/types";

const DEFAULT_MEMORY_DIR = ".vibe-memory";
const STATE_FILE = "workflow-state.json";

/**
 * Local persistent memory system.
 * Stores structured workflow data as JSON files on disk.
 */
export class MemoryStore {
  private readonly dir: string;
  private readonly statePath: string;

  constructor(projectRoot?: string) {
    const root = projectRoot ?? process.cwd();
    this.dir = path.join(root, DEFAULT_MEMORY_DIR);
    this.statePath = path.join(this.dir, STATE_FILE);
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  /** Load the full workflow state, or return a fresh one. */
  load(): WorkflowState {
    if (!fs.existsSync(this.statePath)) {
      return this.createEmpty();
    }
    const raw = fs.readFileSync(this.statePath, "utf-8");
    return JSON.parse(raw) as WorkflowState;
  }

  /** Save the current workflow state to disk. */
  save(state: WorkflowState): void {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), "utf-8");
  }

  /** Add or update a development plan. */
  savePlan(plan: DevelopmentPlan): void {
    const state = this.load();
    const idx = state.plans.findIndex((p) => p.issueId === plan.issueId);
    if (idx >= 0) {
      state.plans[idx] = plan;
    } else {
      state.plans.push(plan);
    }
    this.save(state);
  }

  /** Record a commit. */
  recordCommit(sha: string, message: string, issueId: number): void {
    const state = this.load();
    state.commits.push({ sha, message, issueId });
    this.save(state);
  }

  /** Update the milestone progress snapshot. */
  saveMilestoneSnapshot(progress: MilestoneProgress): void {
    const state = this.load();
    const idx = state.milestoneSnapshots.findIndex(
      (s) => s.milestone.id === progress.milestone.id,
    );
    if (idx >= 0) {
      state.milestoneSnapshots[idx] = progress;
    } else {
      state.milestoneSnapshots.push(progress);
    }
    this.save(state);
  }

  /** Set the current issue being worked on. */
  setCurrentIssue(issueId: number | null): void {
    const state = this.load();
    state.currentIssueId = issueId;
    if (issueId === null) {
      state.currentPlanIndex = 0;
    }
    this.save(state);
  }

  /** Advance to the next plan step. */
  advancePlanStep(): void {
    const state = this.load();
    state.currentPlanIndex += 1;
    this.save(state);
  }

  private createEmpty(): WorkflowState {
    return {
      currentIssueId: null,
      currentPlanIndex: 0,
      plans: [],
      commits: [],
      milestoneSnapshots: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
