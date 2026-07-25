export const GIT_LFS_FREE_LIMIT_BYTES = 10 * 1024 ** 3;

export function assertWithinLfsBudget(
  bytes: number,
  limit = GIT_LFS_FREE_LIMIT_BYTES,
): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new Error('Git LFS usage must be a non-negative safe integer.');
  }
  if (bytes > limit) {
    throw new Error(
      `Git LFS objects use ${bytes} bytes, above the 10 GiB free safety ceiling. Push blocked; do not enable paid overage.`,
    );
  }
}
