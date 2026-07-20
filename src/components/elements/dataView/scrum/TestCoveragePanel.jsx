import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import TestCoverageIntegrationPanel from '@/components/elements/dataView/scrum/TestCoverageIntegrationPanel';

const trendMeta = {
  up: { label: 'Up', icon: ArrowUpRight, className: 'text-emerald-600' },
  down: { label: 'Down', icon: ArrowDownRight, className: 'text-red-600' },
  flat: { label: 'Flat', icon: ArrowRight, className: 'text-muted-foreground' },
};

export function formatCoveragePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 10) / 10}%`;
}

export function getSprintCoverageEntry(bySprint, sprintName) {
  if (!sprintName || !bySprint) return null;
  return bySprint[sprintName] || null;
}

function TrendBadge({ trend }) {
  const meta = trendMeta[trend] || trendMeta.flat;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium', meta.className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function SprintCoverageRow({ sprintName, entry }) {
  const current = Number(entry?.current ?? 0);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-muted-foreground">{sprintName}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
        <div
          className="h-full rounded bg-emerald-500/80"
          style={{ width: `${Math.min(100, current)}%` }}
        />
      </div>
      <span className="w-10 text-right font-medium">{formatCoveragePercent(current)}</span>
      {entry?.trend ? <TrendBadge trend={entry.trend} /> : null}
    </div>
  );
}

export function CoverageRegressionList({ regressions = [] }) {
  if (!regressions.length) {
    return (
      <p className="m-0 text-xs text-muted-foreground">
        No linked coverage regressions detected.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {regressions.map((item) => (
        <div key={`${item.story_id}-${item.branch}`} className="rounded border p-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{item.story_title}</span>
            <Badge variant="destructive" className="text-[10px]">
              {formatCoveragePercent(item.previous_coverage_percent)} → {formatCoveragePercent(item.current_coverage_percent)}
            </Badge>
          </div>
          <p className="m-0 mt-1 text-muted-foreground">{item.branch}</p>
          {item.dropped_files?.length > 0 && (
            <p className="m-0 mt-1 text-muted-foreground">
              {item.dropped_files.length} file{item.dropped_files.length === 1 ? '' : 's'} dropped
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TestCoveragePanel({
  bySprint = {},
  regressions = [],
  sprintList = [],
  activeSprint = '',
  loading = false,
  compact = false,
  boardId,
}) {
  const orderedSprints = sprintList.length
    ? sprintList
    : Object.keys(bySprint).sort((a, b) => a.localeCompare(b));

  const activeEntry = getSprintCoverageEntry(bySprint, activeSprint);

  if (loading) {
    return <p className="m-0 text-xs text-muted-foreground">Loading coverage snapshots…</p>;
  }

  if (!orderedSprints.length && !regressions.length) {
    return (
      <div className="space-y-3">
        <TestCoverageIntegrationPanel boardId={boardId} />
        <p className="m-0 text-xs text-muted-foreground">
          After CI is connected, coverage reports will appear here. Link each story with its <code className="text-[11px]">test_coverage_ref</code> branch or PR.
        </p>
      </div>
    );
  }

  const coverageBody = compact && activeSprint ? (
      <div className="space-y-3">
        {activeEntry ? (
          <div className="space-y-2">
            <SprintCoverageRow sprintName={activeSprint} entry={activeEntry} />
            <p className="m-0 text-[11px] text-muted-foreground">
              Sprint start: {formatCoveragePercent(activeEntry.first)} · {activeEntry.snapshot_count} snapshot{activeEntry.snapshot_count === 1 ? '' : 's'}
            </p>
          </div>
        ) : (
          <p className="m-0 text-xs text-muted-foreground">No coverage snapshots for this sprint yet.</p>
        )}
        {regressions.length > 0 && (
          <div>
            <p className="m-0 mb-1 text-[11px] font-medium text-foreground">Linked regressions</p>
            <CoverageRegressionList regressions={regressions} />
          </div>
        )}
      </div>
    )
    : (
    <div className="space-y-3">
      {orderedSprints.length > 0 && (
        <div className="space-y-2">
          {orderedSprints.map((sprintName) => {
            const entry = getSprintCoverageEntry(bySprint, sprintName);
            if (!entry) return null;
            return <SprintCoverageRow key={sprintName} sprintName={sprintName} entry={entry} />;
          })}
        </div>
      )}
      <div>
        <p className="m-0 mb-1 text-[11px] font-medium text-foreground">Linked regressions</p>
        <CoverageRegressionList regressions={regressions} />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <TestCoverageIntegrationPanel boardId={boardId} />
      {coverageBody}
    </div>
  );
}
