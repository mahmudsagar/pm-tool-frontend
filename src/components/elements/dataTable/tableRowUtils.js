/** @param {{ id?: string, type?: string, page_type?: string } | null | undefined} row */
export function getRowPath(row) {
  const original = row?.original || row || {};
  const id = original.id;
  if (!id) return '/';

  if (original.type === 'folder') return `/folder/${id}`;
  if (original.type === 'group') return `/group/${id}`;
  if (original.type === 'space') return `/space/${id}`;
  if (original.page_type === 'scrum') return `/scrum/${id}`;
  if (original.type === 'board' || original.page_type === 'board') return `/board/${id}`;
  if (original.page_type === 'whiteboard') return `/whiteboard/${id}`;
  if (original.page_type === 'sheet') return `/sheets/${id}`;
  return `/document/${id}`;
}

/** @param {{ id?: string, type?: string, page_type?: string } | null | undefined} row */
export function getDeleteEntityType(row) {
  const original = row?.original || row || {};
  if (
    original.type === 'board' ||
    original.page_type === 'board' ||
    original.page_type === 'scrum'
  ) {
    return 'board';
  }
  if (['folder', 'group', 'space', 'page'].includes(original.type)) {
    return original.type;
  }
  if (original.page_type) return 'page';
  return original.type || 'page';
}

/** @param {{ id?: string, type?: string, page_type?: string } | null | undefined} row */
export function getRowAbsoluteUrl(row) {
  return `${window.location.origin}${getRowPath(row)}`;
}
