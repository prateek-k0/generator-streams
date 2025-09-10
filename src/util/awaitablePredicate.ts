export const awaitablePredicate = (fn: () => boolean) =>
  new Promise<void>((resolve) => {
    if (fn()) resolve();
  });
