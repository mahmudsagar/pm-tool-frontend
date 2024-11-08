// file path: /src/components/DocumentsList.jsx
import { useMemo } from "react";
import Link from "@/BetterRouter/Link";
import { FolderOpen } from "lucide-react";
import MenuItemLoading from "./MenuItemLoading";
import MenuSpaceFile from "./MenuSpaceFile";

const DocumentsList = ({ loading, documents, handleDocumentIcons, isOpen, className, dropdownOpenStates, handleDropdownToggle }) => {
  const renderedDocuments = useMemo(() => {
    if (!documents || documents.length === 0) {
      return (
        <div className="flex items-center justify-center flex-col gap-2 py-2">
          <FolderOpen />
          <p className="text-center">No Files Available.</p>
        </div>
      );
    }

    return documents.map((document) => (
      <MenuSpaceFile
        isOpen={isOpen}
        className={className}
        data={document?.pageMeta}
        dropdownOpenStates={dropdownOpenStates}
        handleDocumentIcons={handleDocumentIcons}
        handleDropdownToggle={handleDropdownToggle}
      />
    ));
  }, [documents, handleDocumentIcons]);

  if (loading) {
    return <MenuItemLoading text='Loading...' flex='col' />;
  }

  return <>{!loading && renderedDocuments}</>;
};

export default DocumentsList;