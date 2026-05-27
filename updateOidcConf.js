const DEBUG = false;

const debugLog = (...args) => {
  if (!DEBUG) {
    return;
  }

  console.debug(...args);
};
