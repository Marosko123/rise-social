import type { ContentRun } from '@/domain/schemas';
import type { BoardGateway, BoardIssue } from './syncRunToBoard';

interface YouTrackProject {
  id: string;
  shortName: string;
  name: string;
}

interface YouTrackIssue {
  id: string;
  idReadable: string;
  description?: string;
}

export type YouTrackTransport = (url: string, init?: RequestInit) => Promise<unknown>;

async function defaultTransport(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`YouTrack request failed (${response.status}): ${detail}`);
  }
  return response.json();
}

export class YouTrackBoardGateway implements BoardGateway {
  private readonly baseUrl: string;
  private readonly transport: YouTrackTransport;

  constructor(
    private readonly options: {
      baseUrl: string;
      token: string;
      projectShortName: string;
      boardId: string;
      transport?: YouTrackTransport;
    },
  ) {
    const parsed = new URL(options.baseUrl);
    if (parsed.protocol !== 'https:') throw new Error('YouTrack base URL must use HTTPS.');
    if (!options.token.trim()) throw new Error('YouTrack token is required.');
    this.baseUrl = parsed.href.replace(/\/$/, '');
    this.transport = options.transport ?? defaultTransport;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    return this.transport(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.options.token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  }

  async findByRunId(runId: string): Promise<BoardIssue | undefined> {
    const params = new URLSearchParams({
      fields: 'id,idReadable,description',
      query: `project: ${this.options.projectShortName} "${runId}"`,
      $top: '20',
    });
    const issues = (await this.request(`/api/issues?${params}`)) as YouTrackIssue[];
    const issue = issues.find(candidate =>
      candidate.description?.includes(`Run ID: \`${runId}\``),
    );
    return issue
      ? {
          id: issue.idReadable,
          provider: 'youtrack',
          runId,
          url: `${this.baseUrl}/issue/${issue.idReadable}`,
        }
      : undefined;
  }

  private async project(): Promise<YouTrackProject> {
    const params = new URLSearchParams({
      fields: 'id,name,shortName',
      query: this.options.projectShortName,
    });
    const projects = (await this.request(`/api/admin/projects?${params}`)) as YouTrackProject[];
    const project = projects.find(
      candidate => candidate.shortName === this.options.projectShortName,
    );
    if (!project) {
      throw new Error(`YouTrack project ${this.options.projectShortName} is not available.`);
    }
    return project;
  }

  async createIssue(runId: string, run: ContentRun): Promise<BoardIssue> {
    const project = await this.project();
    const title = `[Social] ${run.draft.posts.map(post => post.title).join(' / ')}`.slice(0, 240);
    const description = [
      '## Content run',
      '',
      `Run ID: \`${runId}\``,
      `Repository: \`Marosko123/rise-social\``,
      `Lokálny review: http://127.0.0.1:4173/?run=${encodeURIComponent(runId)}`,
      '',
      '## Brief',
      '',
      run.draft.contentBrief.problem,
      '',
      `Riziko: **${run.draft.contentBrief.riskLevel}**`,
      `Kanály: **LinkedIn, Instagram, Facebook**`,
      '',
      '## Human gates',
      '',
      '- [ ] Brief a riziko skontrolované',
      '- [ ] Zdroje a claim IDs overené',
      '- [ ] Tri platformové texty a vizuály schválené',
      '- [ ] Manuálny export alebo Buffer draft skontrolovaný',
      '',
      '<!-- rise-social:managed -->',
    ].join('\n');
    const issue = (await this.request('/api/issues?fields=id,idReadable', {
      method: 'POST',
      body: JSON.stringify({
        project: { id: project.id, shortName: project.shortName },
        summary: title,
        description,
        customFields: [
          {
            name: 'Type',
            $type: 'SingleEnumIssueCustomField',
            value: { name: 'Chore' },
          },
        ],
      }),
    })) as YouTrackIssue;
    if (!issue.idReadable) throw new Error('YouTrack did not return a readable issue ID.');
    return {
      id: issue.idReadable,
      provider: 'youtrack',
      runId,
      url: `${this.baseUrl}/issue/${issue.idReadable}`,
    };
  }

  async attachToBoard(issue: BoardIssue): Promise<{ boardUrl: string }> {
    void issue;
    return {
      boardUrl: `${this.baseUrl}/agiles/${encodeURIComponent(this.options.boardId)}/current`,
    };
  }
}
