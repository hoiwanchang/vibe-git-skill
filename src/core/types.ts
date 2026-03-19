/** Represents an issue from any provider (GitHub or GitLab). */
export interface Issue {
  id: number;
  title: string;
  description: string;
  state: "open" | "closed";
  labels: string[];
  milestone?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

/** Represents a milestone from any provider. */
export interface Milestone {
  id: number;
  title: string;
  description: string;
  state: "active" | "closed";
  dueDate?: string;
  totalIssues: number;
  closedIssues: number;
  url: string;
}

/** Progress snapshot for a milestone. */
export interface MilestoneProgress {
  milestone: Milestone;
  percentage: number;
  openTasks: Issue[];
  closedTasks: Issue[];
}

/** A commit entry. */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

/** Structured context that an AI agent can consume. */
export interface AgentContext {
  currentMilestone: string;
  openTasks: string[];
  completedTasks: string[];
  currentFocus: string;
  recommendedNextStep: string;
}

/** A step in a development plan. */
export interface PlanStep {
  order: number;
  description: string;
  status: "pending" | "in-progress" | "done";
  issueId?: number;
  commitSha?: string;
}

/** A development plan derived from an issue. */
export interface DevelopmentPlan {
  issueId: number;
  issueTitle: string;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
}

/** The full workflow state persisted to disk. */
export interface WorkflowState {
  currentIssueId: number | null;
  currentPlanIndex: number;
  plans: DevelopmentPlan[];
  commits: Array<{ sha: string; message: string; issueId: number }>;
  milestoneSnapshots: MilestoneProgress[];
  lastUpdated: string;
}

/** Configuration for a provider. */
export interface ProviderConfig {
  provider: "github" | "gitlab";
  token: string;
  // GitHub
  owner?: string;
  repo?: string;
  // GitLab
  projectId?: string;
  baseUrl?: string;
}

/** Commit type for conventional commits. */
export type CommitType = "feat" | "fix" | "refactor" | "docs" | "chore" | "test" | "style";
