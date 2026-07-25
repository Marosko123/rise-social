const LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173',
]);

export function assertLocalMutationRequest(request: Request, expectedAction: string): void {
  const origin = request.headers.get('origin');
  if (!origin || !LOCAL_ORIGINS.has(origin)) {
    throw new Error('Mutation requires the local origin at 127.0.0.1:4173.');
  }
  if (request.headers.get('x-rise-social-action') !== expectedAction) {
    throw new Error('Mutation action header is missing or invalid.');
  }
}
