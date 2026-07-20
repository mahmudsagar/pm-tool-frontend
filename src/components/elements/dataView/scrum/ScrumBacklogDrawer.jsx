import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ScrumSprintHub from "@/components/elements/dataView/scrum/ScrumSprintHub";
import ScrumEpicHub from "@/components/elements/dataView/scrum/ScrumEpicHub";
import ScrumMilestonesPanel from "@/components/elements/dataView/scrum/ScrumMilestonesPanel";

const DRAWER_TABS = [
  { id: "sprints", label: "Sprints" },
  { id: "epics", label: "Epics" },
  { id: "milestones", label: "Milestones" },
];

export default function ScrumBacklogDrawer({
  open,
  onOpenChange,
  drawerTab,
  onDrawerTabChange,
  data,
  viewState,
  patchSavedView,
  boardId,
  activeSprint,
  onSprintSelected,
  onSprintClosed,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeBtn={false}
        className="flex w-[340px] max-w-[85vw] flex-col gap-0 p-0 sm:max-w-[340px]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3.5 text-left">
          <SheetTitle className="text-sm font-medium">Backlog</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex gap-1.5 border-b px-4 py-2.5">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onDrawerTabChange(tab.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                drawerTab === tab.id
                  ? "bg-foreground text-background"
                  : "border text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {drawerTab === "sprints" && (
            <ScrumSprintHub
              compact
              data={data}
              viewState={viewState}
              patchSavedView={patchSavedView}
              boardId={boardId}
              onSprintSelected={(name) => {
                onSprintSelected?.(name);
                onOpenChange(false);
              }}
              onSprintClosed={onSprintClosed}
            />
          )}
          {drawerTab === "epics" && (
            <ScrumEpicHub
              compact
              data={data}
              viewState={viewState}
              patchSavedView={patchSavedView}
            />
          )}
          {drawerTab === "milestones" && (
            <ScrumMilestonesPanel
              compact
              data={data}
              viewState={viewState}
              patchSavedView={patchSavedView}
              activeSprint={activeSprint}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
