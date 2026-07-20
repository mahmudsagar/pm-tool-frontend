import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";
import StandupForm from "@/components/elements/dataView/scrum/StandupForm";
import {
  buildTaskRefLookup,
  formatTaskLabel,
} from "@/components/elements/dataView/scrum/taskDisplayUtils";

const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function ScrumDependenciesPanel({ data, sprintLabel }) {
  const stories = useMemo(
    () => (data?.property_values || []).filter((t) => !t.parent_id),
    [data?.property_values]
  );
  const taskLookup = useMemo(
    () => buildTaskRefLookup(data?.property_values || []),
    [data?.property_values]
  );

  const dependencies = useMemo(() => {
    const edges = [];
    stories.forEach((s) => {
      const dep = s.depends_on || s.blocked_by || "";
      if (!dep) return;
      edges.push({
        source: formatTaskLabel(s),
        target: taskLookup.labelForRef(dep),
        critical: asPoints(s.story_points) >= 8,
      });
    });
    return edges.slice(0, 12);
  }, [stories, taskLookup]);

  return (
    <div className="rounded-xl border bg-card p-3 text-xs">
      <p className="mb-2 text-muted-foreground">
        Blocked-by / blocks{sprintLabel ? ` — ${sprintLabel}` : ""}
      </p>
      {dependencies.length === 0 ? (
        <p className="text-muted-foreground">No dependency links yet.</p>
      ) : (
        <div className="space-y-2">
          {dependencies.map((edge, idx) => (
            <div key={`${edge.source}-${idx}`} className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-orange-900 dark:text-orange-200">
                {edge.source}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-orange-900 dark:text-orange-200">
                {edge.target}
              </span>
              {edge.critical && <Badge variant="destructive">Critical path</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScrumStandupPanel({ viewState, patchSavedView, sprintLabel }) {
  const scrumCfg = viewState?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
  const standups = scrumCfg.standups || [];

  const patchScrum = (updater) => {
    patchSavedView?.((prev) => {
      const nextScrum = typeof updater === "function" ? updater(prev?.scrum || DEFAULT_SCRUM_VIEW_BLOCK) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev?.scrum || {}),
          ...nextScrum,
        },
      };
    });
  };

  const addStandup = (entry) => {
    patchScrum((current) => ({
      ...current,
      standups: [...(current.standups || []), entry],
    }));
  };

  return (
    <div className="rounded-xl border bg-card p-3 text-xs">
      <StandupForm
        sprintLabel={sprintLabel}
        standups={standups}
        onSubmit={addStandup}
        compact
      />
    </div>
  );
}
