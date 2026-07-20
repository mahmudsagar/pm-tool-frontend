import { useMemo } from 'react';
import { AlertTriangle, ArrowUpRight, Mail, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildAssigneeLabelMap } from '@/components/elements/dataView/scrum/taskDisplayUtils';
import {
  buildBoardTeamHealth,
  SIGNAL_WEIGHTS,
  upsertWeeklySnapshot,
} from '@/components/elements/dataView/scrum/teamHealthUtils';
import { DEFAULT_SCRUM_VIEW_BLOCK } from '@/components/elements/dataView/scrum/scrumBoardConstants';

const LEVEL_STYLES = {
  low: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  medium: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
  high: 'bg-red-500/15 text-red-800 dark:text-red-200',
};

function LevelBadge({ level }) {
  return (
    <Badge variant="outline" className={cn('border-transparent capitalize', LEVEL_STYLES[level] || '')}>
      {level}
    </Badge>
  );
}

function FactorRow({ label, factor, weight }) {
  return (
    <div className="rounded-md border bg-muted/10 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{Math.round(weight * 100)}% weight</span>
          <LevelBadge level={factor.level} />
        </div>
      </div>
      <p className="m-0 mt-1 text-[11px] text-muted-foreground">{factor.reason}</p>
    </div>
  );
}

function PersonHealthCard({ profile, name, showEscalate = false, onEscalate }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-sm font-semibold">{name}</p>
          <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
            Weighted score {profile.weightedScore}/100
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LevelBadge level={profile.overall} />
          {profile.surfaced && (
            <Badge variant="destructive" className="text-[10px]">
              Sustained 2+ wks
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <FactorRow label="Sentiment" factor={profile.factors.sentiment} weight={SIGNAL_WEIGHTS.sentiment} />
        <FactorRow label="Workload" factor={profile.factors.workload} weight={SIGNAL_WEIGHTS.workload} />
        <FactorRow label="Blocker recurrence" factor={profile.factors.blocker} weight={SIGNAL_WEIGHTS.blocker} />
      </div>

      {showEscalate && profile.userId && profile.overall !== 'low' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 h-7 text-[11px]"
          onClick={() => onEscalate?.(profile.userId)}
        >
          <ArrowUpRight className="mr-1 h-3 w-3" />
          Escalate to manager
        </Button>
      )}
    </div>
  );
}

export default function TeamHealthDashboard({
  data,
  viewState,
  patchSavedView,
  assigneeOptions = [],
  teams = [],
  workspace = null,
  currentUserId,
  compact = false,
}) {
  const stories = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );
  const scrumCfg = viewState?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
  const standups = scrumCfg.standups || [];
  const teamHealth = scrumCfg.team_health || DEFAULT_SCRUM_VIEW_BLOCK.team_health;
  const assigneeMap = useMemo(() => buildAssigneeLabelMap(assigneeOptions), [assigneeOptions]);

  const health = useMemo(() => buildBoardTeamHealth({
    stories,
    standups,
    sprintCfg: scrumCfg.sprint_management || {},
    teamHealth,
    assigneeOptions,
    viewerId: currentUserId,
    teams,
    workspace,
  }), [stories, standups, scrumCfg.sprint_management, teamHealth, assigneeOptions, currentUserId, teams, workspace]);

  const persistWeeklySnapshots = () => {
    if (!patchSavedView) return;
    const nextSnapshots = upsertWeeklySnapshot(teamHealth, health.profiles);
    patchSavedView((prev) => ({
      ...prev,
      scrum: {
        ...DEFAULT_SCRUM_VIEW_BLOCK,
        ...(prev?.scrum || {}),
        team_health: {
          ...(prev?.scrum?.team_health || teamHealth),
          weekly_snapshots: nextSnapshots,
        },
      },
    }));
  };

  const handleEscalate = (subjectId) => {
    if (!patchSavedView || !currentUserId) return;
    patchSavedView((prev) => {
      const current = prev?.scrum?.team_health || teamHealth;
      const existing = current.escalations || [];
      if (existing.some((entry) => String(entry.subject_id) === String(subjectId))) {
        return prev;
      }
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev?.scrum || {}),
          team_health: {
            ...current,
            escalations: [
              ...existing,
              {
                subject_id: String(subjectId),
                escalated_by: String(currentUserId),
                escalated_at: new Date().toISOString(),
              },
            ],
          },
        },
      };
    });
  };

  const renderProfiles = (profiles = []) => profiles.map((profile) => (
    <PersonHealthCard
      key={profile.userId}
      profile={profile}
      name={assigneeMap[profile.userId] || profile.userId}
      showEscalate={health.visibility.mode === 'team_lead' && profile.visibility === 'direct_report'}
      onEscalate={handleEscalate}
    />
  ));

  return (
    <section className={cn('space-y-4 text-left', !compact && 'rounded-xl border bg-card p-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Team health</h3>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            Transparent signals from standups and sprint workload. Flags only after 2+ consecutive weeks at Medium/High.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={persistWeeklySnapshots}>
          Record weekly snapshot
        </Button>
      </div>

      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="m-0">
          Confirm HR/legal disclosure requirements before using per-person wellbeing monitoring in your jurisdiction.
        </p>
      </div>

      {health.visibility.mode === 'manager' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="m-0 text-[11px] text-muted-foreground">Teams</p>
            <p className="m-0 mt-1 text-lg font-semibold">{health.visibility.aggregate?.teamCount || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="m-0 text-[11px] text-muted-foreground">Medium/High this week</p>
            <p className="m-0 mt-1 text-lg font-semibold">{health.visibility.aggregate?.mediumHigh || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="m-0 text-[11px] text-muted-foreground">Sustained flags</p>
            <p className="m-0 mt-1 text-lg font-semibold">{health.visibility.aggregate?.surfaced || 0}</p>
          </div>
        </div>
      )}

      {health.visibility.mode === 'manager' && (
        <div className="space-y-3">
          <p className="m-0 text-xs font-medium">Escalated individuals</p>
          {health.visibility.aggregate?.profiles?.length
            ? renderProfiles(health.visibility.aggregate.profiles)
            : (
              <p className="m-0 text-xs text-muted-foreground">
                No escalations yet. Team leads can escalate direct reports trending Medium/High.
              </p>
            )}
        </div>
      )}

      {health.visibility.mode === 'team_lead' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {renderProfiles(health.visibility.profiles)}
        </div>
      )}

      {health.visibility.mode === 'self' && (
        <div className="grid gap-3">
          {health.visibility.profiles?.length
            ? renderProfiles(health.visibility.profiles)
            : (
              <p className="m-0 text-xs text-muted-foreground">
                Log standups with mood check-ins to see your health breakdown here.
              </p>
            )}
        </div>
      )}

      {(health.visibility.mode === 'team_lead' || health.visibility.mode === 'manager') && (
        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="m-0 text-sm font-medium">Weekly digest preview</p>
          </div>
          <p className="m-0 text-xs text-muted-foreground">{health.digest.subject}</p>
          {health.digest.trending.length > 0 && (
            <div className="mt-3 space-y-2">
              {health.digest.trending.map((item) => (
                <div key={item.name} className="rounded border px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    <LevelBadge level={item.overall} />
                  </div>
                  <ul className="m-0 mt-1 list-disc pl-4 text-muted-foreground">
                    {item.why.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {/* <p className="m-0 mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            Slack/email delivery can be wired to this digest in a follow-up integration.
          </p> */}
        </div>
      )}
    </section>
  );
}
