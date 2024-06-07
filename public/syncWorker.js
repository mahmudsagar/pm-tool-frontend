const debounceDuration = 100; // Adding debounce so it's not in infinite loop of state update

let debounceTimer;
let latestData = null;

self.addEventListener('message', (event) => {
  if (event.data.type === 'BetterNotionStorage') {
    latestData = event.data;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      self.postMessage(latestData);
      latestData = null; // Clear latestData after posting
    }, debounceDuration);
  }
});
