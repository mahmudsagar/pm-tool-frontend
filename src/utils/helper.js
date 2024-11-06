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