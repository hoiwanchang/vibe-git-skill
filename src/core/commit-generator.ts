import { CommitType, Issue } from "./types";

/**
 * Generates structured commit messages that reference issues.
 * Uses conventional commit format: type(scope): message (#issueId)
 */
export class CommitGenerator {
  /**
   * Detect the commit type from issue labels and title.
   */
  detectType(issue: Issue): CommitType {
    const labels = issue.labels.map((l) => l.toLowerCase());
    const title = issue.title.toLowerCase();

    if (labels.includes("bug") || labels.includes("fix") || title.startsWith("fix")) {
      return "fix";
    }
    if (labels.includes("refactor") || title.startsWith("refactor")) {
      return "refactor";
    }
    if (labels.includes("docs") || labels.includes("documentation") || title.startsWith("docs")) {
      return "docs";
    }
    if (labels.includes("test") || labels.includes("testing") || title.startsWith("test")) {
      return "test";
    }
    if (labels.includes("chore") || title.startsWith("chore")) {
      return "chore";
    }
    if (labels.includes("style") || title.startsWith("style")) {
      return "style";
    }
    return "feat";
  }

  /**
   * Extract a short scope from the issue title.
   * Takes the first meaningful word or component name.
   */
  extractScope(issue: Issue): string {
    const title = issue.title.toLowerCase();
    // Remove common prefixes
    const cleaned = title
      .replace(/^(feat|fix|refactor|docs|chore|test|style)[:\s]*/i, "")
      .replace(/^(implement|add|create|update|remove|delete|fix)\s+/i, "")
      .trim();

    // Take first word or hyphenated compound as scope
    const match = cleaned.match(/^[\w-]+/);
    if (match && match[0].length <= 20) {
      return match[0];
    }
    // Fallback: first 15 chars
    return cleaned.slice(0, 15).replace(/\s+/g, "-");
  }

  /**
   * Generate a commit message from an issue and optional step description.
   */
  generate(issue: Issue, stepDescription?: string): string {
    const type = this.detectType(issue);
    const scope = this.extractScope(issue);
    const summary = stepDescription || this.summarizeTitle(issue.title);

    return `${type}(${scope}): ${summary} (#${issue.id})`;
  }

  private summarizeTitle(title: string): string {
    // Remove type prefixes, truncate to 50 chars
    const cleaned = title
      .replace(/^(feat|fix|refactor|docs|chore|test|style)[:\s]*/i, "")
      .trim();

    if (cleaned.length <= 50) {
      return cleaned.toLowerCase();
    }
    return cleaned.slice(0, 47).trimEnd() + "...";
  }
}
