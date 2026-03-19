import { ProjectProvider } from "../core/provider";
import { AgentContext, Issue, Milestone } from "../core/types";

/**
 * Context Engine — the core of the vibe coding skill.
 *
 * Reads issues, milestones, and progress from the provider,
 * then produces a structured AgentContext for the AI coding agent.
 */
export class ContextEngine {
  constructor(private readonly provider: ProjectProvider) {}

  /**
   * Build a full agent context, optionally scoped to a query.
   * If a query is given, relevant issues are filtered by keyword matching.
   */
  async buildContext(query?: string): Promise<AgentContext> {
    const [issues, milestones] = await Promise.all([
      this.provider.listIssues(),
      this.provider.getMilestones(),
    ]);

    const activeMilestone = this.findActiveMilestone(milestones);
    const relevantIssues = query ? this.filterByRelevance(issues, query) : issues;

    const openTasks = relevantIssues.filter((i) => i.state === "open");
    const closedTasks = relevantIssues.filter((i) => i.state === "closed");

    const currentFocus = this.determineFocus(openTasks, query);
    const recommendedNextStep = this.recommendNextStep(openTasks, closedTasks);

    return {
      currentMilestone: activeMilestone?.title ?? "No active milestone",
      openTasks: openTasks.map((i) => `#${i.id}: ${i.title}`),
      completedTasks: closedTasks.map((i) => `#${i.id}: ${i.title}`),
      currentFocus,
      recommendedNextStep,
    };
  }

  /**
   * Find the most relevant active milestone.
   * Prefers milestones with due dates closest to now.
   */
  private findActiveMilestone(milestones: Milestone[]): Milestone | undefined {
    const active = milestones.filter((m) => m.state === "active");
    if (active.length === 0) return undefined;

    // Sort by due date (earliest first), milestones without due date go last
    return active.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })[0];
  }

  /**
   * Filter issues by keyword relevance to the query.
   */
  private filterByRelevance(issues: Issue[], query: string): Issue[] {
    const keywords = query.toLowerCase().split(/\s+/);
    return issues.filter((issue) => {
      const text = `${issue.title} ${issue.description} ${issue.labels.join(" ")}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
  }

  /**
   * Determine the current focus based on open tasks and query.
   */
  private determineFocus(openTasks: Issue[], query?: string): string {
    if (query) {
      return `User requested: "${query}"`;
    }
    if (openTasks.length === 0) {
      return "All tasks completed — consider creating new issues or closing the milestone.";
    }
    // Pick the first open task as focus
    const top = openTasks[0];
    return `#${top.id}: ${top.title}`;
  }

  /**
   * Recommend the next step based on current progress.
   */
  private recommendNextStep(openTasks: Issue[], closedTasks: Issue[]): string {
    if (openTasks.length === 0 && closedTasks.length === 0) {
      return "No issues found. Create a new issue to get started.";
    }
    if (openTasks.length === 0) {
      return "All current tasks are completed. Review and close the milestone, or plan the next one.";
    }
    const next = openTasks[0];
    return `Start working on #${next.id}: ${next.title}`;
  }
}
