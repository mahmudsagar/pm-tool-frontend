import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/stores/store";
import { ChevronRight, ChevronDownIcon } from 'lucide-react';
import AddFileDialog from "./AddFileDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";
import ButtonLoading from "./ButtonLoading";
import MenuEmpty from "./MenuEmpty";
import FolderMenu from "./DropdownMenuItems/FolderMenu";
import DocStructure from "./DocStructure";
import EllipsisTooltip from "@/components/common/EllipsisTooltip";
import ShowIcon from "@/components/common/ShowIcon";
import { resolveBoardListPageType } from "@/components/elements/dataView/scrum/scrumBoardConstants";
import { formatEntityDisplayName, getEntityRawName } from "@/utils/fileDisplayUtils";
import { useContainerContents } from "@/features/spaces/queries";

const isContainer = (item) => item?.entity_type === 'folder' || item?.entity_type === 'group';

const MenuItemFolder = ({ folder, className }) => {
  if (!folder) return null;
  return isContainer(folder)
    ? <ContainerItem folder={folder} className={className} />
    : <LeafItem item={folder} className={className} />;
};

const LeafItem = ({ item, className, openItem = "" }) => {
  const { isOpen } = useSidebar();
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const handleDropdownToggle = (id) =>
    setDropdownOpenStates((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <DocStructure
      docId={item._id}
      docName={formatEntityDisplayName(item)}
      rawName={getEntityRawName(item)}
      docType={item.entity_type}
      fileType={resolveBoardListPageType(item) || item.page_type}
      hasChild={!!openItem}
      openItem={openItem}
      isOpen={isOpen}
      className={className}
      dropdownOpenStates={dropdownOpenStates}
      handleDropdownToggle={handleDropdownToggle}
    />
  );
};

const ContainerItem = ({ folder, className }) => {
  const { isOpen } = useSidebar();
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const expanded = openItem === folder._id;
  const { data: contents = [], isPending, isError } = useContainerContents(folder.entity_type, folder._id, expanded);

  // Collapse while the sidebar is collapsed and restore when it reopens.
  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the sidebar toggling
  }, [isOpen]);

  const handleDropdownToggle = (id) =>
    setDropdownOpenStates((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleFolderNavigation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/${folder.entity_type}/${folder._id}`);
  };

  const children = contents.flatMap((doc) => doc?.childs ?? []);

  return (
    <Accordion
      type="single"
      collapsible
      className="space-y-2"
      value={openItem}
      onValueChange={setOpenItem}
    >
      <AccordionItem value={folder._id} className="border-none mr-0">
        <AccordionTrigger
          className="group relative flex h-9 justify-between pl-2 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center gap-2 overflow-hidden">
            <span className="inline group-hover:hidden group-data-[state=open]:hidden">
              <ShowIcon
                file={folder.entity_type}
                page={resolveBoardListPageType(folder) || folder.page_type}
                item={folder}
              />
            </span>
            <ChevronRight
              strokeWidth={2.5}
              size={20}
              className="hidden group-hover:inline-block group-data-[state=open]:hidden"
            />
            {expanded && (
              <ChevronDownIcon strokeWidth={2.5} size={20} className="shrink-0 transition-transform duration-200" />
            )}
            <EllipsisTooltip
              title={folder.name}
              onClick={handleFolderNavigation}
              className={cn('text-sm duration-200 text-start cursor-pointer hover:text-purple-600 transition-colors flex-1', !isOpen && className)}
            >
              {folder.name}
            </EllipsisTooltip>
          </div>
          <div className={cn('opacity-0 group-hover:opacity-100 transition-opacity duration-200', (expanded || dropdownOpenStates[folder._id]) && 'opacity-100')}>
            <div className="flex gap-1">
              <AddFileDialog
                id={folder._id}
                type={folder.entity_type}
                isOpen={isAddModalOpen}
                setIsOpen={setIsAddModalOpen}
              />
              <FolderMenu
                isOpen={dropdownOpenStates}
                onToggle={handleDropdownToggle}
                id={folder._id}
                type={folder.entity_type}
                fileName={getEntityRawName(folder)}
              />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 py-3">
          {isPending ? (
            <ButtonLoading text="Loading..." flex="col" />
          ) : isError ? (
            <p className="px-2 text-xs text-destructive">Couldn&apos;t load contents.</p>
          ) : children.length === 0 ? (
            <MenuEmpty />
          ) : (
            children.map((item) =>
              isContainer(item) ? (
                <div key={item._id} className="ml-2.5">
                  <ContainerItem folder={item} className={className} />
                </div>
              ) : (
                <LeafItem key={item._id} item={item} className={className} openItem={openItem} />
              ),
            )
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default MenuItemFolder;
