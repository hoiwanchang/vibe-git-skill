import { ProjectProvider } from "../../core/provider";
import { Issue, Milestone, MilestoneProgress, Commit } from "../../core/types";

interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  milestone: { title: string } | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

interface GitHubMilestoneResponse {
  number: number;
  title: string;
  description: string | null;
  state: string;
  due_on: string | null;
  open_issues: number;
  closed_issues: number;
  html_url: string;
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

export class GitHubProvider implements ProjectProvider {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(
    private readonly owner: string,
    private readonly repo: string,
    token: string,
  ) {
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const response = await fetch(url, { ...options, headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }
    return response.json() as Promise<T>;
  }

  private mapIssue(raw: GitHubIssueResponse): Issue {
    return {
      id: raw.number,
      title: raw.title,
      description: raw.body ?? "",
      state: raw.state === "open" ? "open" : "closed",
      labels: raw.labels.map((l) => l.name),
      milestone: raw.milestone?.title,
      url: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private mapMilestone(raw: GitHubMilestoneResponse): Milestone {
    return {
      id: raw.number,
      title: raw.title,
      description: raw.description ?? "",
      state: raw.state === "open" ? "active" : "closed",
      dueDate: raw.due_on ?? undefined,
      totalIssues: raw.open_issues + raw.closed_issues,
      closedIssues: raw.closed_issues,
      url: raw.html_url,
    };
  }

  async getIssue(issueId: number): Promise<Issue> {
    const raw = await this.request<GitHubIssueResponse>(`/issues/${issueId}`);
    return this.mapIssue(raw);
  }

  async listIssues(milestoneTitle?: string): Promise<Issue[]> {
    let query = "/issues?state=open&per_page=50";
    if (milestoneTitle) {
      // GitHub API requires milestone number, so find it first
      const milestones = await this.getMilestones();
      const ms = milestones.find((m) => m.title === milestoneTitle);
      if (ms) {
        query += `&milestone=${ms.id}`;
      }
    }
    const raw = await this.request<GitHubIssueResponse[]>(query);
    // Filter out pull requests (GitHub returns PRs in issue endpoints)
    return raw.filter((r) => !("pull_request" in r)).map((r) => this.mapIssue(r));
  }

  async getMilestones(): Promise<Milestone[]> {
    const raw = await this.request<GitHubMilestoneResponse[]>("/milestones?state=all&per_page=50");
    return raw.map((r) => this.mapMilestone(r));
  }

  async getMilestoneProgress(milestoneId: number): Promise<MilestoneProgress> {
    const raw = await this.request<GitHubMilestoneResponse>(`/milestones/${milestoneId}`);
    const milestone = this.mapMilestone(raw);

    const openIssues = await this.request<GitHubIssueResponse[]>(
      `/issues?milestone=${milestoneId}&state=open&per_page=100`,
    );
    const closedIssues = await this.request<GitHubIssueResponse[]>(
      `/issues?milestone=${milestoneId}&state=closed&per_page=100`,
    );

    const total = milestone.totalIssues || 1;
    return {
      milestone,
      percentage: Math.round((milestone.closedIssues / total) * 100),
      openTasks: openIssues.map((i) => this.mapIssue(i)),
      closedTasks: closedIssues.map((i) => this.mapIssue(i)),
    };
  }

  async createIssue(title: string, description: string): Promise<Issue> {
    const raw = await this.request<GitHubIssueResponse>("/issues", {
      method: "POST",
      body: JSON.stringify({ title, body: description }),
    });
    return this.mapIssue(raw);
  }

  async updateIssue(
    issueId: number,
    content: Partial<Pick<Issue, "title" | "description" | "state" | "labels">>,
  ): Promise<Issue> {
    const body: Record<string, unknown> = {};
    if (content.title !== undefined) body.title = content.title;
    if (content.description !== undefined) body.body = content.description;
    if (content.state !== undefined) body.state = content.state;
    if (content.labels !== undefined) body.labels = content.labels;

    const raw = await this.request<GitHubIssueResponse>(`/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return this.mapIssue(raw);
  }

  async getRecentCommits(count = 10): Promise<Commit[]> {
    const raw = await this.request<GitHubCommitResponse[]>(`/commits?per_page=${count}`);
    return raw.map((r) => ({
      sha: r.sha,
      message: r.commit.message,
      author: r.commit.author.name,
      date: r.commit.author.date,
      url: r.html_url,
    }));
  }
}
