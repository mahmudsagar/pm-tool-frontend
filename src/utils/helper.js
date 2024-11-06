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