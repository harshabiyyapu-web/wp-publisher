/**
 * Sliding-window concurrency queue.
 * Mirrors the bulk-rewrite.js queue logic from the existing plugin,
 * but in TypeScript with max 5 concurrent tasks.
 */

export type Task<T> = () => Promise<T>;

export interface QueueResult<T> {
  index: number;
  result?: T;
  error?: Error;
}

/**
 * Run an array of async tasks with a max concurrency limit.
 * Calls onProgress for each completed task (success or error).
 */
export async function runWithConcurrency<T>(
  tasks: Task<T>[],
  maxConcurrency: number,
  onProgress?: (result: QueueResult<T>) => void
): Promise<QueueResult<T>[]> {
  const results: QueueResult<T>[] = [];
  const queue = tasks.map((task, index) => ({ task, index }));
  let active = 0;
  let queueIndex = 0;

  return new Promise((resolve) => {
    function tryNext() {
      while (active < maxConcurrency && queueIndex < queue.length) {
        const { task, index } = queue[queueIndex++];
        active++;

        task()
          .then((result) => {
            const r: QueueResult<T> = { index, result };
            results.push(r);
            onProgress?.(r);
          })
          .catch((err: unknown) => {
            const r: QueueResult<T> = {
              index,
              error: err instanceof Error ? err : new Error(String(err)),
            };
            results.push(r);
            onProgress?.(r);
          })
          .finally(() => {
            active--;
            tryNext();
            if (active === 0 && queueIndex >= queue.length) {
              resolve(results.sort((a, b) => a.index - b.index));
            }
          });
      }
    }

    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    tryNext();
  });
}
