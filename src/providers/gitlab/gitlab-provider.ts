import { ProjectProvider } from "../../core/provider";
import { Issue, Milestone, MilestoneProgress, Commit } from "../../core/types";

interface GitLabIssueResponse {
  iid: number;
  title: string;
  description: string | null;
  state: string;
  labels: string[];
  milestone: { title: string } | null;
  web_url: string;
  created_at: string;
  updated_at: string;
}

interface GitLabMilestoneResponse {
  id: number;
  title: string;
  description: string | null;
  state: string;
  due_date: string | null;
  web_url: string;
}

interface GitLabCommitResponse {
  id: string;
  message: string;
  author_name: string;
  created_at: string;
  web_url: string;
}

export class GitLabProvider implements ProjectProvider {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(
    private readonly projectId: string,
    token: string,
    baseUrl = "https://gitlab.com",
  ) {
    this.baseUrl = `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}`;
    this.headers = {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, { ...options, headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitLab API error ${response.status}: ${body}`);
    }
    return response.json() as Promise<T>;
  }

  private mapIssue(raw: GitLabIssueResponse): Issue {
    return {
      id: raw.iid,
      title: raw.title,
      description: raw.description ?? "",
      state: raw.state === "opened" ? "open" : "closed",
      labels: raw.labels,
      milestone: raw.milestone?.title,
      url: raw.web_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private mapMilestone(raw: GitLabMilestoneResponse, total: number, closed: number): Milestone {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? "",
      state: raw.state === "active" ? "active" : "closed",
      dueDate: raw.due_date ?? undefined,
      totalIssues: total,
      closedIssues: closed,
      url: raw.web_url,
    };
  }

  async getIssue(issueId: number): Promise<Issue> {
    const raw = await this.request<GitLabIssueResponse>(`/issues/${issueId}`);
    return this.mapIssue(raw);
  }

  async listIssues(milestoneTitle?: string): Promise<Issue[]> {
    let query = "/issues?state=opened&per_page=50";
    if (milestoneTitle) {
      query += `&milestone=${encodeURIComponent(milestoneTitle)}`;
    }
    const raw = await this.request<GitLabIssueResponse[]>(query);
    return raw.map((r) => this.mapIssue(r));
  }

  async getMilestones(): Promise<Milestone[]> {
    const raw = await this.request<GitLabMilestoneResponse[]>("/milestones?state=active&per_page=50");
    const milestones: Milestone[] = [];
    for (const ms of raw) {
      const issues = await this.request<GitLabIssueResponse[]>(
        `/milestones/${ms.id}/issues?per_page=100`,
      );
      const closed = issues.filter((i) => i.state === "closed").length;
      milestones.push(this.mapMilestone(ms, issues.length, closed));
    }
    return milestones;
  }

  async getMilestoneProgress(milestoneId: number): Promise<MilestoneProgress> {
    const raw = await this.request<GitLabMilestoneResponse>(`/milestones/${milestoneId}`);
    const issues = await this.request<GitLabIssueResponse[]>(
      `/milestones/${milestoneId}/issues?per_page=100`,
    );

    const openTasks = issues.filter((i) => i.state === "opened").map((i) => this.mapIssue(i));
    const closedTasks = issues.filter((i) => i.state === "closed").map((i) => this.mapIssue(i));
    const total = issues.length || 1;

    const milestone = this.mapMilestone(raw, issues.length, closedTasks.length);
    return {
      milestone,
      percentage: Math.round((closedTasks.length / total) * 100),
      openTasks,
      closedTasks,
    };
  }

  async createIssue(title: string, description: string): Promise<Issue> {
    const raw = await this.request<GitLabIssueResponse>("/issues", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
    return this.mapIssue(raw);
  }

  async updateIssue(
    issueId: number,
    content: Partial<Pick<Issue, "title" | "description" | "state" | "labels">>,
  ): Promise<Issue> {
    const body: Record<string, unknown> = {};
    if (content.title !== undefined) body.title = content.title;
    if (content.description !== undefined) body.description = content.description;
    if (content.state !== undefined) {
      body.state_event = content.state === "closed" ? "close" : "reopen";
    }
    if (content.labels !== undefined) body.labels = content.labels.join(",");

    const raw = await this.request<GitLabIssueResponse>(`/issues/${issueId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return this.mapIssue(raw);
  }

  async getRecentCommits(count = 10): Promise<Commit[]> {
    const raw = await this.request<GitLabCommitResponse[]>(
      `/repository/commits?per_page=${count}`,
    );
    return raw.map((r) => ({
      sha: r.id,
      message: r.message,
      author: r.author_name,
      date: r.created_at,
      url: r.web_url,
    }));
  }
}
