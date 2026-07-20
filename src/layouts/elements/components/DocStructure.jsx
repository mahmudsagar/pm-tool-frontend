import { cn } from '@/lib/utils';
// eslint-disable-next-line no-restricted-imports
import { Link } from 'react-router-dom';
import FolderMenu from './DropdownMenuItems/FolderMenu';
import EllipsisTooltip from '@/components/common/EllipsisTooltip';
import ShowIcon from '@/components/common/ShowIcon';

function DocStructure({ 
  docId, 
  docName, 
  docType,
  fileType,
  openItem,
  hasChild,
  isOpen, 
  // showIcon,
  className, 
  dropdownOpenStates, 
  handleDropdownToggle 
}) {
  const getLinkPath = () => {
    switch (docType) {
      case 'page':
        // Check if it's a board page type
        if (fileType === 'scrum') {
          return `/scrum/${docId}`;
        }
        if (fileType === 'board') {
          return `/board/${docId}`;
        }
        return `/document/${docId}`;
      case 'board':
        return fileType === 'scrum' ? `/scrum/${docId}` : `/board/${docId}`;
      case 'folder':
        return `/folder/${docId}`;
      default:
        return `/document/${docId}`;
    }
  };

  return (
    <div className={`group relative flex h-9 justify-between ${hasChild && 'ml-3'} mr-1 px-2 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline`}>
      <div className="flex justify-between items-center gap-2 overflow-hidden">
        {/* <span className="inline">{showIcon(docType, fileType)} </span> */}
         <span className="inline">
          <ShowIcon file={docType} page={fileType} />
         </span>
        <Link
          to={getLinkPath()}
          className={cn('text-sm duration-200 overflow-hidden', !isOpen && className)}
        >
          <EllipsisTooltip HtmlTag='h5' title={docName}>
            {docName}
          </EllipsisTooltip>
        </Link>
        {/* <Link 
          to={getLinkPath()} 
          className={cn('text-sm duration-200 w-[140px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
        >
          { docName }
        </Link> */}
      </div>
      <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === docId || dropdownOpenStates[docId] ? 'opacity-100' : ''}`}>
        <div className="flex gap-1">
          <FolderMenu
            isOpen={dropdownOpenStates}
            onToggle={(id) => handleDropdownToggle(id)}
            id={docId}
            type={docType}
            fileName={docName}
          />
        </div>
      </div>
    </div>
  )
}

export default DocStructure