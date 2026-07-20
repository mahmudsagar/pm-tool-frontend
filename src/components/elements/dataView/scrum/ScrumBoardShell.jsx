import { useMemo, useState } from "react";
import {
  ClipboardList,
  Filter,
  GitBranch,
  MessageCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";
import ScrumReportsSection from "@/components/elements/dataView/scrum/ScrumReportsSection";
import ScrumBacklogDrawer from "@/components/elements/dataView/scrum/ScrumBacklogDrawer";
import { ScrumDependenciesPanel, ScrumStandupPanel } from "@/components/elements/dataView/scrum/ScrumBoardPanels";

const DONE_KEYS = ["done", "completed", "complete", "closed"];
const norm = (v) => String(v || "").trim().toLowerCase();
const isDone = (s) => DONE_KEYS.some((k) => norm(s).includes(k));
const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumBoardShell({
  data,
  viewState,
  patchSavedView,
  boardId,
  activeSprint,
  epicFieldName,
  assigneeOptions = [],
  onNewTask,
  onSprintClosed,
  filterControls,
  boardContent,
  teams = [],
  workspace = null,
  currentUserId = null,
}) {
  const [scrumTab, setScrumTab] = useState("board");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("sprints");
  const [boardPanel, setBoardPanel] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const stories = useMemo(
    () => (data?.property_values || []).filter((t) => !t.parent_id),
    [data?.property_values]
  );

  const sprintCfg = viewState?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;

  const sprintList = useMemo(() => {
    const names = new Set((sprintCfg.sprints || []).filter(Boolean));
    stories.forEach((s) => {
      if (s.sprint) names.add(String(s.sprint));
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sprintCfg.sprints, stories]);

  const sprintStats = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const sprint = String(s.sprint || "");
      if (!sprint) return;
      const prev = map.get(sprint) || { stories: 0, committed: 0, completed: 0 };
      const pts = asPoints(s.story_points);
      prev.stories += 1;
      prev.committed += pts;
      prev.completed += isDone(s.status) ? pts : 0;
      map.set(sprint, prev);
    });
    return map;
  }, [stories]);

  const currentStats = sprintStats.get(activeSprint) || { stories: 0, committed: 0, completed: 0 };
  const sprintStatus = activeSprint ? "Active" : "Upcoming";

  const setActiveSprint = (name) => {
    patchSavedView?.((prev) => ({
      ...prev,
      scrum: {
        ...DEFAULT_SCRUM_VIEW_BLOCK,
        ...(prev?.scrum || {}),
        sprint_management: {
          ...(prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management),
          active_sprint: name,
        },
      },
    }));
    setScrumTab("board");
  };

  const togglePanel = (panel) => {
    setBoardPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="overflow-hidden rounded-[14px] border bg-card text-left">
      {/* Context bar */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-5 py-3">
        <span className="text-xs text-muted-foreground">Working in</span>
        <Select value={activeSprint || "__none__"} onValueChange={(v) => setActiveSprint(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] border-none bg-transparent px-0 text-sm font-medium shadow-none focus:ring-0">
            <SelectValue placeholder="Select sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprintList.length === 0 && <SelectItem value="__none__">No sprint</SelectItem>}
            {sprintList.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeSprint && (
          <>
            <Badge
              variant="secondary"
              className={cn(
                "text-[11px] font-normal",
                sprintStatus === "Active" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
              )}
            >
              {sprintStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {currentStats.stories} stories · {currentStats.completed}/{currentStats.committed} pts
            </span>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2">
        <div className="flex gap-1">
          {[
            { id: "board", label: "Board" },
            { id: "reports", label: "Reports" },
          ].map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={scrumTab === tab.id ? "secondary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => {
                setScrumTab(tab.id);
                setBoardPanel(null);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setDrawerOpen(true)}
          >
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Backlog
          </Button>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={onNewTask}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </div>

      {/* Content — scroll with the page main area, no nested scroll */}
      <div>
        {scrumTab === "board" ? (
          <div className="flex flex-col gap-2.5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0 text-sm text-muted-foreground">
                Board for <span className="font-semibold text-foreground">{activeSprint || "all sprints"}</span>
              </p>
              <div className="flex-1" />
              <Button
                type="button"
                size="sm"
                variant={boardPanel === "dependencies" ? "secondary" : "outline"}
                className="h-8 text-xs"
                onClick={() => togglePanel("dependencies")}
              >
                <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                Dependencies
              </Button>
              <Button
                type="button"
                size="sm"
                variant={boardPanel === "standup" ? "secondary" : "outline"}
                className="h-8 text-xs"
                onClick={() => togglePanel("standup")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Standup
              </Button>
              <Button
                type="button"
                size="sm"
                variant={showFilters ? "secondary" : "outline"}
                className="h-8 text-xs"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Filter
              </Button>
            </div>

            {boardPanel === "dependencies" && (
              <ScrumDependenciesPanel data={data} sprintLabel={activeSprint} />
            )}
            {boardPanel === "standup" && (
              <ScrumStandupPanel
                viewState={viewState}
                patchSavedView={patchSavedView}
                sprintLabel={activeSprint}
              />
            )}
            {showFilters && filterControls ? (
              <div className="rounded-xl border bg-muted/20 px-3 py-2">{filterControls}</div>
            ) : null}

            {boardContent}
          </div>
        ) : (
          <div className="p-5">
            <ScrumReportsSection
              data={data}
              viewState={viewState}
              patchSavedView={patchSavedView}
              activeSprint={activeSprint}
              epicFieldName={epicFieldName}
              assigneeOptions={assigneeOptions}
              boardId={boardId}
              teams={teams}
              workspace={workspace}
              currentUserId={currentUserId}
              compact
            />
          </div>
        )}
      </div>

      <ScrumBacklogDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawerTab={drawerTab}
        onDrawerTabChange={setDrawerTab}
        data={data}
        viewState={viewState}
        patchSavedView={patchSavedView}
        boardId={boardId}
        activeSprint={activeSprint}
        onSprintSelected={setActiveSprint}
        onSprintClosed={onSprintClosed}
      />
    </div>
  );
}
