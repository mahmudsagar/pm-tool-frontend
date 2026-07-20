import { useEffect, useMemo, useState } from 'react';
import { Flag, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DEFAULT_SCRUM_VIEW_BLOCK } from '@/components/elements/dataView/scrum/scrumBoardConstants';
import EpicBadge from '@/components/elements/dataView/scrum/EpicBadge';
import {
  collectEpicsFromTasks,
  ensureEpicInRegistry,
  listRegistryEpics,
  normalizeEpicKey,
  parseEpicValue,
} from '@/components/elements/dataView/scrum/epicUtils';

const DONE_KEYS = ['done', 'completed', 'complete', 'closed'];
const norm = (v) => String(v || '').trim().toLowerCase();
const isDone = (s) => DONE_KEYS.some((k) => norm(s).includes(k));
const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumEpicHub({ data, viewState, patchSavedView, compact = false }) {
  const { toast } = useToast();
  const [newEpicName, setNewEpicName] = useState('');
  const [newEpicGoal, setNewEpicGoal] = useState('');
  const [optimisticEpics, setOptimisticEpics] = useState([]);

  const stories = useMemo(
    () => (data?.property_values || []).filter((t) => !t.parent_id),
    [data?.property_values]
  );

  const epicRegistry = viewState?.scrum?.epic_registry || DEFAULT_SCRUM_VIEW_BLOCK.epic_registry || {};

  const epicStats = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const epic = parseEpicValue(s.epic);
      const key = epic ? normalizeEpicKey(epic) : '__none__';
      const label = epic || 'No epic';
      const prev = map.get(key) || {
        key,
        name: label,
        stories: 0,
        backlog: 0,
        committed: 0,
        completed: 0,
      };
      const pts = asPoints(s.story_points);
      const inBacklog = !String(s.sprint || '').trim();
      prev.stories += 1;
      prev.committed += pts;
      prev.completed += isDone(s.status) ? pts : 0;
      if (inBacklog) prev.backlog += 1;
      map.set(key, prev);
    });
    return map;
  }, [stories]);

  const persistedEpicsKey = listRegistryEpics(epicRegistry)
    .map((e) => e.name)
    .join('\0');
  useEffect(() => {
    setOptimisticEpics([]);
  }, [persistedEpicsKey]);

  const epicList = useMemo(() => {
    const keys = new Set(listRegistryEpics(epicRegistry).map((e) => normalizeEpicKey(e.name)));
    optimisticEpics.forEach((name) => keys.add(normalizeEpicKey(name)));
    collectEpicsFromTasks(stories).forEach((name) => keys.add(normalizeEpicKey(name)));
    return [...keys]
      .filter((k) => k !== '__none__')
      .map((key) => {
        const reg = epicRegistry[key];
        const stats = epicStats.get(key);
        return {
          key,
          name: reg?.name || stats?.name || key,
          goal: reg?.goal || '',
          color: reg?.color,
          stats: stats || { stories: 0, backlog: 0, committed: 0, completed: 0 },
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [epicRegistry, epicStats, optimisticEpics, stories]);

  const persistEpicRegistry = (updater) => {
    if (!patchSavedView) {
      toast({
        title: 'Cannot save epic',
        description: 'Board settings are not available yet.',
        variant: 'destructive',
      });
      return false;
    }
    patchSavedView((prev) => {
      const current = prev?.scrum?.epic_registry || {};
      const nextRegistry = typeof updater === 'function' ? updater(current) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev?.scrum || {}),
          epic_registry: nextRegistry,
        },
      };
    });
    return true;
  };

  const addEpic = () => {
    const name = newEpicName.trim();
    if (!name) {
      toast({
        title: 'Epic name required',
        description: 'Enter a name before adding an epic.',
        variant: 'destructive',
      });
      return;
    }
    const key = normalizeEpicKey(name);
    setOptimisticEpics((prev) => (prev.includes(name) ? prev : [...prev, name]));
    if (
      !persistEpicRegistry((current) =>
        ensureEpicInRegistry(current, name, { goal: newEpicGoal.trim() })
      )
    ) {
      return;
    }
    setNewEpicName('');
    setNewEpicGoal('');
  };

  const removeEpic = (key) => {
    persistEpicRegistry((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  return (
    <section className={cn(
      "space-y-3 text-left",
      !compact && "mb-4 rounded-lg border bg-card p-3"
    )}>
      <div className={cn("flex flex-wrap items-end gap-2", compact && "flex-col items-stretch")}>
        <div className={cn("min-w-[200px] flex-1", compact && "min-w-0 w-full")}>
          {!compact && <p className="mb-1 text-xs text-muted-foreground">Epic name</p>}
          <Input
            className="h-8 text-xs"
            value={newEpicName}
            onChange={(e) => setNewEpicName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEpic();
              }
            }}
            placeholder="Checkout v2"
          />
        </div>
        <div className={cn("min-w-[240px] flex-[2]", compact && "min-w-0 w-full")}>
          {!compact && <p className="mb-1 text-xs text-muted-foreground">Goal (optional)</p>}
          <Input
            className="h-8 text-xs"
            value={newEpicGoal}
            onChange={(e) => setNewEpicGoal(e.target.value)}
            placeholder="Reduce checkout drop-off by 20%"
          />
        </div>
        <Button type="button" className="h-8 shrink-0" size="sm" onClick={addEpic}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {compact ? 'New epic' : 'Add Epic'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {epicList.length === 0 && (
          <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
            No epics yet. Create one to group stories across sprints.
          </div>
        )}
        {epicList.map((epic) => (
          <div
            key={epic.key}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left",
              compact && "bg-muted/20"
            )}
          >
            <div className="min-w-0 flex-1">
              {compact ? (
                <>
                  <p className="text-sm font-medium">{epic.name}</p>
                  {epic.goal ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{epic.goal}</p>
                  ) : null}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${epic.stats.committed ? Math.round((epic.stats.completed / epic.stats.committed) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <EpicBadge name={epic.name} colorKey={epic.color} />
                  </div>
                  {epic.goal ? (
                    <p className="mb-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <Target className="mt-0.5 h-3 w-3 shrink-0" />
                      {epic.goal}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Flag className="h-3 w-3 shrink-0" />
                      {epic.stats.stories} stories
                    </span>
                    <span>{epic.stats.backlog} in backlog</span>
                    <span>{epic.stats.committed} pts committed</span>
                    <span>{epic.stats.completed} pts done</span>
                  </div>
                </>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 shrink-0 px-2 text-[10px]"
              onClick={() => removeEpic(epic.key)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
