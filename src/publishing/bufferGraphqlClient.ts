import type {
  ChannelState,
  PublishingAsset,
  PublishingGateway,
  PublishingPostInput,
} from './publishApprovedRun';
import type { Platform } from '@/domain/schemas';

interface BufferClientOptions {
  apiKey: string;
  apiUrl?: string;
  fetcher?: typeof fetch;
}

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: { message: string }[];
}

interface PostActionPayload {
  __typename: 'PostActionSuccess' | 'MutationError';
  post?: { id: string; text: string; status: string; dueAt?: string };
  message?: string;
}

function bufferAssets(assets: PublishingAsset[], altText: string) {
  return assets.map(asset =>
    asset.kind === 'image'
      ? { image: { url: asset.url, metadata: { altText } } }
      : {
          document: {
            url: asset.url,
            title: asset.title,
            thumbnailUrl: asset.thumbnailUrl,
          },
        },
  );
}

export class BufferGraphqlClient implements PublishingGateway {
  private readonly apiUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly organizationsByChannel = new Map<string, string>();

  constructor(private readonly options: BufferClientOptions) {
    this.apiUrl = options.apiUrl ?? 'https://api.buffer.com';
    this.fetcher = options.fetcher ?? fetch;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await this.fetcher(this.apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Buffer API returned HTTP ${response.status}.`);
    const envelope = (await response.json()) as GraphqlEnvelope<T>;
    if (envelope.errors?.length) {
      throw new Error(`Buffer GraphQL error: ${envelope.errors.map(error => error.message).join('; ')}`);
    }
    if (!envelope.data) throw new Error('Buffer API returned no data.');
    return envelope.data;
  }

  private postResult(payload: PostActionPayload) {
    if (payload.__typename === 'MutationError' || !payload.post) {
      throw new Error(payload.message ?? 'Buffer post mutation failed.');
    }
    return payload.post;
  }

  async preflight(channels: Record<Platform, string>): Promise<ChannelState[]> {
    const states: ChannelState[] = [];
    for (const [platform, channelId] of Object.entries(channels) as [Platform, string][]) {
      const data = await this.graphql<{
        channel: {
          id: string;
          service: string;
          organizationId: string;
          isQueuePaused: boolean;
        } | null;
      }>(
        `query ChannelPreflight($input: ChannelInput!) {
          channel(input: $input) {
            id service organizationId isQueuePaused
          }
        }`,
        { input: { id: channelId } },
      );
      if (!data.channel) throw new Error(`Buffer channel not found: ${channelId}.`);
      this.organizationsByChannel.set(channelId, data.channel.organizationId);
      states.push({
        platform,
        channelId,
        service: data.channel.service,
        organizationId: data.channel.organizationId,
        queuePaused: data.channel.isQueuePaused,
        scheduledCount: 0,
      });
    }

    const groups = new Map<string, ChannelState[]>();
    for (const state of states) {
      groups.set(state.organizationId, [...(groups.get(state.organizationId) ?? []), state]);
    }
    for (const [organizationId, organizationStates] of groups) {
      const ids = organizationStates.map(state => state.channelId);
      const data = await this.graphql<{
        posts: { edges: { node: { id: string; channelId: string } }[] };
      }>(
        `query ScheduledCapacity($first: Int!, $input: PostsInput!) {
          posts(first: $first, input: $input) {
            edges { node { id channelId } }
          }
        }`,
        {
          first: 100,
          input: {
            organizationId,
            filter: { status: ['scheduled'], channelIds: ids },
          },
        },
      );
      for (const state of organizationStates) {
        state.scheduledCount = data.posts.edges.filter(
          edge => edge.node.channelId === state.channelId,
        ).length;
      }
    }
    return states;
  }

  async createDraft(input: PublishingPostInput) {
    const data = await this.graphql<{ createPost: PostActionPayload }>(
      `mutation CreateRiseDraft($input: CreatePostInput!) {
        createPost(input: $input) {
          __typename
          ... on PostActionSuccess { post { id text status } }
          ... on MutationError { message }
        }
      }`,
      {
        input: {
          text: input.text,
          channelId: input.channelId,
          schedulingType: 'automatic',
          mode: 'addToQueue',
          saveToDraft: true,
          aiAssisted: true,
          source: 'rise-social-studio',
          assets: bufferAssets(input.assets, input.altText),
        },
      },
    );
    const post = this.postResult(data.createPost);
    return { id: post.id, text: post.text, status: 'draft' as const };
  }

  async verifyDraft(id: string, channelId: string): Promise<boolean> {
    const organizationId = this.organizationsByChannel.get(channelId);
    if (!organizationId) throw new Error(`Channel ${channelId} did not pass preflight.`);
    const data = await this.graphql<{
      posts: { edges: { node: { id: string } }[] };
    }>(
      `query VerifyRiseDraft($first: Int!, $input: PostsInput!) {
        posts(first: $first, input: $input) { edges { node { id } } }
      }`,
      {
        first: 100,
        input: {
          organizationId,
          filter: { status: ['draft'], channelIds: [channelId] },
        },
      },
    );
    return data.posts.edges.some(edge => edge.node.id === id);
  }

  async scheduleDraft(id: string, dueAt: string) {
    const data = await this.graphql<{ editPost: PostActionPayload }>(
      `mutation ScheduleRiseDraft($input: EditPostInput!) {
        editPost(input: $input) {
          __typename
          ... on PostActionSuccess { post { id text status dueAt } }
          ... on MutationError { message }
        }
      }`,
      {
        input: {
          id,
          schedulingType: 'automatic',
          mode: 'customScheduled',
          dueAt,
          saveToDraft: false,
          aiAssisted: true,
          source: 'rise-social-studio',
        },
      },
    );
    const post = this.postResult(data.editPost);
    return { id: post.id, status: 'scheduled' as const };
  }

  async deletePost(id: string): Promise<void> {
    const data = await this.graphql<{
      deletePost: { __typename: string; message?: string };
    }>(
      `mutation DeleteRiseDraft($input: DeletePostInput!) {
        deletePost(input: $input) {
          __typename
          ... on MutationError { message }
        }
      }`,
      { input: { id } },
    );
    if (data.deletePost.__typename !== 'PostActionSuccess') {
      throw new Error(
        `Buffer delete failed: ${data.deletePost.message ?? data.deletePost.__typename}`,
      );
    }
  }

  async sentPostIds(
    channels: Record<Platform, string>,
    startDate: string,
  ): Promise<Set<string>> {
    const groups = new Map<string, string[]>();
    for (const channelId of Object.values(channels)) {
      const organizationId = this.organizationsByChannel.get(channelId);
      if (!organizationId) throw new Error(`Channel ${channelId} did not pass preflight.`);
      groups.set(organizationId, [...(groups.get(organizationId) ?? []), channelId]);
    }
    const sent = new Set<string>();
    for (const [organizationId, channelIds] of groups) {
      const data = await this.graphql<{
        posts: { edges: { node: { id: string } }[] };
      }>(
        `query ConfirmRisePostsSent($first: Int!, $input: PostsInput!) {
          posts(first: $first, input: $input) {
            edges { node { id } }
          }
        }`,
        {
          first: 100,
          input: {
            organizationId,
            filter: { status: ['sent'], channelIds, startDate },
          },
        },
      );
      for (const edge of data.posts.edges) sent.add(edge.node.id);
    }
    return sent;
  }
}
