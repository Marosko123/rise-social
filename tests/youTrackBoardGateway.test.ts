import { describe, expect, test } from 'vitest';

import { YouTrackBoardGateway } from '@/board/youTrackBoardGateway';

import { createFixtureRun } from './fixtures';

describe('YouTrack board gateway', () => {
  test('uses the RISE project, stores the run marker, and never puts the token in a URL', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const transport = async (url: string, init?: RequestInit): Promise<unknown> => {
      requests.push({ url, init });
      if (url.includes('/api/admin/projects')) {
        return [{ id: '0-1', shortName: 'RISE', name: 'Rise' }];
      }
      if (init?.method === 'POST') {
        return { id: '2-42', idReadable: 'RISE-42' };
      }
      return [];
    };
    const gateway = new YouTrackBoardGateway({
      baseUrl: 'https://rise.youtrack.cloud',
      token: 'perm:top-secret',
      projectShortName: 'RISE',
      boardId: '204-1',
      transport,
    });

    const issue = await gateway.createIssue('run-exact', createFixtureRun(false));
    const board = await gateway.attachToBoard(issue);

    expect(issue.id).toBe('RISE-42');
    expect(board.boardUrl).toBe('https://rise.youtrack.cloud/agiles/204-1/current');
    expect(requests.every(request => !request.url.includes('top-secret'))).toBe(true);
    expect(requests.every(request => request.init?.headers !== undefined)).toBe(true);
    const body = String(requests.find(request => request.init?.method === 'POST')?.init?.body);
    expect(body).toContain('Run ID: `run-exact`');
    expect(body).toContain('"shortName":"RISE"');
  });

  test('finds an existing managed issue by exact run marker', async () => {
    const gateway = new YouTrackBoardGateway({
      baseUrl: 'https://rise.youtrack.cloud',
      token: 'perm:secret',
      projectShortName: 'RISE',
      boardId: '204-1',
      transport: async () => [
        {
          id: '2-42',
          idReadable: 'RISE-42',
          description: 'Run ID: `run-exact`\n<!-- rise-social:managed -->',
        },
      ],
    });

    await expect(gateway.findByRunId('run-exact')).resolves.toEqual({
      id: 'RISE-42',
      provider: 'youtrack',
      runId: 'run-exact',
      url: 'https://rise.youtrack.cloud/issue/RISE-42',
    });
  });
});
