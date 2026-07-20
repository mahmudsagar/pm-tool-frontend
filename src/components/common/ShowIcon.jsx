import { Users, Folder, FileText, StickyNote, FileSpreadsheet, LayoutGrid, SquareKanban } from 'lucide-react';
import { resolveBoardListPageType } from '@/components/elements/dataView/scrum/scrumBoardConstants';

const ShowIcon = ({ file, page, size = 20, item = null }) => {
  const resolvedPage = page || (file === 'board' && item ? resolveBoardListPageType(item) : null);

  switch (file) {
    case 'group':
      return <Users size={size} />;
    case 'folder':
      return <Folder width={size} />;
    case 'board':
      return resolvedPage === 'scrum'
        ? <SquareKanban size={size} />
        : <LayoutGrid size={size} />;
    case 'page':
      switch (resolvedPage) {
        case 'document':
          return <FileText size={size} />;
        case 'sheet':
          return <FileSpreadsheet size={size} />;
        case 'whiteboard':
          return <StickyNote size={size} />;
        case 'scrum':
          return <SquareKanban size={size} />;
        case 'board':
          return <LayoutGrid size={size} />;
        default:
          return <FileText size={size} />;
      }
    default:
      return <FileText size={size} className="inline" />;
  }
};

export default ShowIcon;
