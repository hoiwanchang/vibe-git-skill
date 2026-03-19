import { Issue, Milestone, MilestoneProgress, Commit } from "./types";

/**
 * Abstract provider interface.
 * All platform-specific providers (GitHub, GitLab) must implement this.
 * The rest of the system depends only on this interface.
 */
export interface ProjectProvider {
  /** Fetch a single issue by its ID. */
  getIssue(issueId: number): Promise<Issue>;

  /** List all open issues (optionally filtered by milestone). */
  listIssues(milestoneTitle?: string): Promise<Issue[]>;

  /** List all milestones. */
  getMilestones(): Promise<Milestone[]>;

  /** Get progress for a specific milestone. */
  getMilestoneProgress(milestoneId: number): Promise<MilestoneProgress>;

  /** Create a new issue. Returns the created issue. */
  createIssue(title: string, description: string): Promise<Issue>;

  /** Update an existing issue. Returns the updated issue. */
  updateIssue(issueId: number, content: Partial<Pick<Issue, "title" | "description" | "state" | "labels">>): Promise<Issue>;

  /** Get recent commits (default: last 10). */
  getRecentCommits(count?: number): Promise<Commit[]>;
}
