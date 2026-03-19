import { CommitGenerator } from "../core/commit-generator";
import { Issue } from "../core/types";

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 42,
    title: "Implement JWT authentication",
    description: "",
    state: "open",
    labels: [],
    url: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("CommitGenerator", () => {
  const gen = new CommitGenerator();

  describe("detectType", () => {
    it("detects feat by default", () => {
      expect(gen.detectType(makeIssue())).toBe("feat");
    });

    it("detects fix from labels", () => {
      expect(gen.detectType(makeIssue({ labels: ["bug"] }))).toBe("fix");
    });

    it("detects refactor from title prefix", () => {
      expect(gen.detectType(makeIssue({ title: "Refactor user service" }))).toBe("refactor");
    });

    it("detects docs from labels", () => {
      expect(gen.detectType(makeIssue({ labels: ["documentation"] }))).toBe("docs");
    });

    it("detects test from labels", () => {
      expect(gen.detectType(makeIssue({ labels: ["test"] }))).toBe("test");
    });
  });

  describe("extractScope", () => {
    it("extracts first keyword from title", () => {
      expect(gen.extractScope(makeIssue({ title: "Implement JWT authentication" }))).toBe("jwt");
    });

    it("strips action verbs", () => {
      expect(gen.extractScope(makeIssue({ title: "Add login page" }))).toBe("login");
    });
  });

  describe("generate", () => {
    it("produces a conventional commit message", () => {
      const msg = gen.generate(makeIssue());
      expect(msg).toMatch(/^feat\(jwt\): .+ \(#42\)$/);
    });

    it("uses step description when provided", () => {
      const msg = gen.generate(makeIssue(), "add token validation middleware");
      expect(msg).toBe("feat(jwt): add token validation middleware (#42)");
    });

    it("references the issue number", () => {
      const msg = gen.generate(makeIssue({ id: 99 }));
      expect(msg).toContain("(#99)");
    });

    it("handles fix type", () => {
      const msg = gen.generate(makeIssue({ labels: ["bug"], title: "Fix login crash" }));
      expect(msg).toMatch(/^fix\(/);
    });
  });
});
