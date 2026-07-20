export function normalizeSprintKey(sprint) {
  return String(sprint || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function resolveCurrentUserId() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?._id || user?.id || null;
    }
  } catch {
    // ignore parse errors
  }
  const legacyId = localStorage.getItem('userId');
  return legacyId && /^[0-9a-fA-F]{24}$/.test(legacyId) ? legacyId : null;
}
