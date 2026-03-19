import { ProjectProvider } from "../core/provider";
import { GitHubProvider } from "../providers/github/github-provider";
import { GitLabProvider } from "../providers/gitlab/gitlab-provider";

/**
 * Read provider configuration from environment variables.
 * Supports both GitHub and GitLab.
 */
export function createProvider(): ProjectProvider {
  const providerType = process.env.PROVIDER ?? "github";

  if (providerType === "github") {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      throw new Error(
        "Missing GitHub configuration. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.",
      );
    }
    return new GitHubProvider(owner, repo, token);
  }

  if (providerType === "gitlab") {
    const token = process.env.GITLAB_TOKEN;
    const projectId = process.env.GITLAB_PROJECT_ID;
    const baseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";

    if (!token || !projectId) {
      throw new Error(
        "Missing GitLab configuration. Set GITLAB_TOKEN and GITLAB_PROJECT_ID environment variables.",
      );
    }
    return new GitLabProvider(projectId, token, baseUrl);
  }

  throw new Error(`Unknown provider: "${providerType}". Use "github" or "gitlab".`);
}
