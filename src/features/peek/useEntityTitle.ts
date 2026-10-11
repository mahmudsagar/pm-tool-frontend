import { useCachedData } from '@/layouts/shell/useBreadcrumbs';
import { useContainerContents, useSpaceTree } from '@/features/spaces/queries';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import { kindFromSection } from './peekUrl';
import type { EntityKind } from '@/features/spaces/entity';

type Named = { name?: string; title?: string; page_type?: string; board?: { name?: string } };

/** Title and kind for a route, read from data the page has already loaded. */
export function useEntityTitle(section: string, id: string): { title: string; kind: EntityKind } {
  const { spaces } = useSpaceTree();
  const isPage = ['document', 'single', 'sheet', 'whiteboard'].includes(section);
  const isBoard = section === 'board' || section === 'scrum';
  const isContainer = section === 'folder' || section === 'group';

  // Tabs that aren't open yet fetch their item so they can show a real title.
  const { data: doc } = (useDocument as (id: string | null) => { data?: Named })(isPage ? id : null);
  const board = useCachedData<Named | Named[]>(isBoard ? ['boards', id] : null);
  const { data: container } = useContainerContents(section === 'group' ? 'group' : 'folder', id, isContainer);
  const treeItem = spaces.find((s) => s._id === id) ?? spaces.flatMap((s) => s.childs).find((c) => c._id === id);

  const boardData = Array.isArray(board) ? board[0] : board;
  const title =
    doc?.title ||
    boardData?.board?.name ||
    boardData?.name ||
    (container?.[0] as Named | undefined)?.name ||
    treeItem?.name ||
    (treeItem as Named | undefined)?.title ||
    'Untitled';

  return { title, kind: kindFromSection(section, doc?.page_type ?? (treeItem as Named | undefined)?.page_type) };
}
