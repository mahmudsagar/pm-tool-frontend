import { Users, Folder, FileText, StickyNote, FileSpreadsheet, LayoutGrid } from 'lucide-react';

const ShowIcon = ({ file, page, size = 20 }) => {
  switch (file) {
    case 'group':
      return <Users size={size} />;
    case 'folder':
      return <Folder width={size} />;
    case 'page':
      switch (page) {
        case 'document':
          return <FileText size={size} />;
        case 'sheet':
          return <FileSpreadsheet size={size} />;
        case 'whiteboard':
          return <StickyNote size={size} />;
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