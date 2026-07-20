import React, { useCallback, useState } from 'react';
import {
  ChevronDown,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  ArrowDownZA,
  CircleX,
  Plus,
  Globe,
  Lock,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import AddMyFilesDialog from '@/layouts/elements/components/AddMyFilesDialog';
import { useMatches } from 'react-router-dom';
import useDialog from '@/hooks/useDialog';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';
import { useToast } from '@/components/ui/use-toast';
import { getDeleteEntityType } from './tableRowUtils';

const DataTableColumnHeader = ({ title, table, containerId, containerType, onBulkDeleteSuccess }) => {
  const matches = useMatches();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm } = useDialog();
  const { mutateAsync: deleteEntity } = useDeleteEntity();
  const { toast } = useToast();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const effectiveId = containerId || matches[matches.length - 1]?.params?.id;
  const effectiveType = containerType || matches[matches.length - 1]?.params?.type;

  const handleBulkDelete = useCallback(() => {
    if (!selectedCount) return;

    confirm({
      title: 'Delete selected items?',
      description: `Are you sure you want to delete ${selectedCount} selected item${selectedCount === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        setIsDeleting(true);
        const failures = [];

        for (const row of selectedRows) {
          const entityId = row.original?.id;
          const entityType = getDeleteEntityType(row);
          if (!entityId) continue;

          try {
            await deleteEntity({ entityId, entityType, silent: true });
            if (typeof onBulkDeleteSuccess === 'function') {
              onBulkDeleteSuccess(entityId, entityType);
            }
          } catch (error) {
            failures.push(row.original?.name || entityId);
          }
        }

        table.resetRowSelection();

        if (failures.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Some items could not be deleted',
            description: failures.join(', '),
          });
        } else {
          toast({
            title: `${selectedCount} item${selectedCount === 1 ? '' : 's'} deleted`,
          });
        }

        setIsDeleting(false);
      },
    });
  }, [confirm, deleteEntity, onBulkDeleteSuccess, selectedCount, selectedRows, table, toast]);

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-medium">{title}</h3>
        <Button variant="outline" className="flex items-center justify-center text-base gap-2 bg-none border-none focus:outline-none">
          <Plus onClick={() => setIsOpen((current) => !current)} className="w-4 h-4" />
        </Button>
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            disabled={isDeleting}
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete selected ({selectedCount})
          </Button>
        )}
      </div>
      <div className="menu-buttons flex items-center gap-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="font-medium flex items-center justify-center text-base gap-2 bg-none border-none focus:outline-none">
              <ArrowDownWideNarrow className="w-4 h-4" />
              Sort
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(true)}>
              <ArrowUpAZ className="w-4 h-4" />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(false)}>
              <ArrowDownZA className="w-4 h-4" />
              Desc
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.resetSorting()}>
              <CircleX className="w-4 h-4" />
              Unsorted
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("sharing")?.setFilterValue("Public")}>
              <Globe className="w-4 h-4" />
              Public
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("sharing")?.setFilterValue("Private")}>
              <Lock className="w-4 h-4" />
              Private
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("sharing")?.setFilterValue(undefined)}>
              <CircleX className="w-4 h-4" />
              All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isOpen ? (
        <AddMyFilesDialog
          id={effectiveId}
          type={effectiveType}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      ) : null}
    </div>
  );
};

export default DataTableColumnHeader;
