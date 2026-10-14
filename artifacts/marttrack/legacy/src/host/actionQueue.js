export const createActionQueue = () => {
  let tail = Promise.resolve();

  return operation => {
    const result = tail.then(operation);
    // A rejected operation must not prevent later actions from being handled.
    tail = result.catch(() => undefined);
    return result;
  };
};
