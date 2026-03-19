import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MemoryStore } from "../memory/memory-store";
import { DevelopmentPlan } from "../core/types";

describe("MemoryStore", () => {
  let tmpDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-test-"));
    store = new MemoryStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates an empty state on first load", () => {
    const state = store.load();
    expect(state.currentIssueId).toBeNull();
    expect(state.plans).toEqual([]);
    expect(state.commits).toEqual([]);
  });

  it("persists state across loads", () => {
    store.setCurrentIssue(10);
    const state = store.load();
    expect(state.currentIssueId).toBe(10);
  });

  it("saves and retrieves a plan", () => {
    const plan: DevelopmentPlan = {
      issueId: 1,
      issueTitle: "Test",
      steps: [{ order: 1, description: "Do thing", status: "pending" }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.savePlan(plan);

    const state = store.load();
    expect(state.plans).toHaveLength(1);
    expect(state.plans[0].issueTitle).toBe("Test");
  });

  it("updates an existing plan", () => {
    const plan: DevelopmentPlan = {
      issueId: 1,
      issueTitle: "Test",
      steps: [{ order: 1, description: "Do thing", status: "pending" }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.savePlan(plan);
    store.savePlan({ ...plan, issueTitle: "Updated" });

    const state = store.load();
    expect(state.plans).toHaveLength(1);
    expect(state.plans[0].issueTitle).toBe("Updated");
  });

  it("records commits", () => {
    store.recordCommit("abc123", "feat: test", 1);
    store.recordCommit("def456", "fix: bug", 2);

    const state = store.load();
    expect(state.commits).toHaveLength(2);
    expect(state.commits[0].sha).toBe("abc123");
  });

  it("advances plan step", () => {
    store.setCurrentIssue(1);
    store.advancePlanStep();
    const state = store.load();
    expect(state.currentPlanIndex).toBe(1);
  });

  it("resets plan index when clearing current issue", () => {
    store.setCurrentIssue(1);
    store.advancePlanStep();
    store.setCurrentIssue(null);
    const state = store.load();
    expect(state.currentPlanIndex).toBe(0);
  });
});
