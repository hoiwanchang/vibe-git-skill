import { ContextEngine } from "../context/context-engine";
import { ProjectProvider } from "../core/provider";
import { Issue, Milestone, MilestoneProgress, Commit } from "../core/types";

function createMockProvider(
  issues: Issue[] = [],
  milestones: Milestone[] = [],
): ProjectProvider {
  return {
    getIssue: jest.fn(),
    listIssues: jest.fn().mockResolvedValue(issues),
    getMilestones: jest.fn().mockResolvedValue(milestones),
    getMilestoneProgress: jest.fn(),
    createIssue: jest.fn(),
    updateIssue: jest.fn(),
    getRecentCommits: jest.fn().mockResolvedValue([]),
  };
}

describe("ContextEngine", () => {
  it("returns empty context when no issues or milestones", async () => {
    const provider = createMockProvider();
    const engine = new ContextEngine(provider);
    const ctx = await engine.buildContext();

    expect(ctx.currentMilestone).toBe("No active milestone");
    expect(ctx.openTasks).toEqual([]);
    expect(ctx.completedTasks).toEqual([]);
    expect(ctx.recommendedNextStep).toContain("No issues found");
  });

  it("picks the active milestone with nearest due date", async () => {
    const milestones: Milestone[] = [
      {
        id: 1, title: "v2.0", description: "", state: "active",
        dueDate: "2026-06-01", totalIssues: 5, closedIssues: 2, url: "",
      },
      {
        id: 2, title: "v1.5", description: "", state: "active",
        dueDate: "2026-04-01", totalIssues: 3, closedIssues: 3, url: "",
      },
    ];
    const provider = createMockProvider([], milestones);
    const engine = new ContextEngine(provider);
    const ctx = await engine.buildContext();

    expect(ctx.currentMilestone).toBe("v1.5");
  });

  it("filters issues by query keyword", async () => {
    const issues: Issue[] = [
      { id: 1, title: "Implement auth", description: "JWT login", state: "open", labels: [], url: "", createdAt: "", updatedAt: "" },
      { id: 2, title: "Add dashboard", description: "Charts", state: "open", labels: [], url: "", createdAt: "", updatedAt: "" },
    ];
    const provider = createMockProvider(issues);
    const engine = new ContextEngine(provider);
    const ctx = await engine.buildContext("auth");

    expect(ctx.openTasks).toHaveLength(1);
    expect(ctx.openTasks[0]).toContain("auth");
  });

  it("sets recommended next step to first open task", async () => {
    const issues: Issue[] = [
      { id: 5, title: "Setup CI", description: "", state: "open", labels: [], url: "", createdAt: "", updatedAt: "" },
    ];
    const provider = createMockProvider(issues);
    const engine = new ContextEngine(provider);
    const ctx = await engine.buildContext();

    expect(ctx.recommendedNextStep).toContain("#5");
  });
});
