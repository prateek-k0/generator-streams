// manually yields control to the event loop, allowing other tasks to run
export const yieldControl = () => new Promise((resolve) => setTimeout(resolve));