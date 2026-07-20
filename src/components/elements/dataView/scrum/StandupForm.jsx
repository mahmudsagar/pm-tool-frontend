import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { resolveCurrentUserId } from '@/components/elements/dataView/scrum/retroUtils';

const SENTIMENT_OPTIONS = [
  { value: 1, label: '1', hint: 'Rough' },
  { value: 2, label: '2', hint: 'Low' },
  { value: 3, label: '3', hint: 'OK' },
  { value: 4, label: '4', hint: 'Good' },
  { value: 5, label: '5', hint: 'Great' },
];

export default function StandupForm({
  sprintLabel = '',
  standups = [],
  onSubmit,
  compact = false,
}) {
  const [standupText, setStandupText] = useState('');
  const [blockerText, setBlockerText] = useState('');
  const [sentimentScore, setSentimentScore] = useState(null);

  const handleSubmit = () => {
    const update = standupText.trim();
    if (!update && !blockerText.trim() && sentimentScore == null) return;

    onSubmit?.({
      id: String(Date.now()),
      at: new Date().toISOString(),
      update,
      blocker: blockerText.trim(),
      notify_scrum_master: Boolean(blockerText.trim()),
      sentiment_score: sentimentScore == null ? null : Number(sentimentScore),
      user_id: resolveCurrentUserId(),
      sprint: sprintLabel || '',
    });

    setStandupText('');
    setBlockerText('');
    setSentimentScore(null);
  };

  return (
    <div className={cn('space-y-2', compact ? 'text-xs' : 'text-sm')}>
      <p className="m-0 text-muted-foreground">
        Daily standup{sprintLabel ? ` — ${sprintLabel}` : ''}
      </p>
      <Textarea
        value={standupText}
        onChange={(e) => setStandupText(e.target.value)}
        className={cn('min-h-16', compact ? 'text-xs' : 'text-sm')}
        placeholder="Yesterday / Today update"
      />
      <Input
        value={blockerText}
        onChange={(e) => setBlockerText(e.target.value)}
        className={cn('h-8', compact ? 'text-xs' : 'text-sm')}
        placeholder="Blocker (optional)"
      />
      <div>
        <p className="m-0 mb-1.5 text-[11px] text-muted-foreground">
          How are you feeling today? <span className="opacity-70">(optional 1–5)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SENTIMENT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sentimentScore === option.value ? 'default' : 'outline'}
              className="h-8 min-w-10 px-2 text-xs"
              title={option.hint}
              onClick={() => setSentimentScore(
                sentimentScore === option.value ? null : option.value
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-muted-foreground">
          {blockerText.trim()
            ? 'Blocker will count toward recurrence checks.'
            : `Entries: ${standups.length}`}
        </p>
        <Button size="sm" className="h-8 text-xs" onClick={handleSubmit}>
          Log standup
        </Button>
      </div>
    </div>
  );
}
