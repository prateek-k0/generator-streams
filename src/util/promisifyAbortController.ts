export const promisifyAbortController = (
  controller: AbortController,
  withError?: Error
): Promise<never> =>
  new Promise((_, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(withError);
    });
  });
