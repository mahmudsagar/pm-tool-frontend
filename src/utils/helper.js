export const sanitize = (data, type = "object") => {
  switch (type) {
    case 'array':
      return Array.isArray(data) ? data : [];
    case 'object':
      return typeof data === 'object' && !Array.isArray(data) && data !== null ? data : {};
    default:
      return data;
  }
};

export function debounce(func, wait, immediate = false) {
  let timeout;

  return function (...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

export function formatTime(date) {
  const now = Date.now();
  const past = new Date(date).getTime();
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds >= 86400) {
    // More than 24 hours, return formatted date
    return new Date(past).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const timeIntervals = [
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  const { label, seconds } = timeIntervals.find(({ seconds }) => diffInSeconds >= seconds) || {};
  const count = Math.floor(diffInSeconds / (seconds || 1));

  return count === 1 ? `a ${label} ago` : `${count} ${label}s ago`;
}

// invariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This function is special-cased
// in flow itself, so we can't name it anything else.
export function invariant(
  cond,
  message
) {
  if (cond) {
    return;
  }

  throw new Error(
    'Internal Lexical error: invariant() is meant to be replaced at compile ' +
      'time. There is no runtime version. Error: ' +
      message,
  );
}