import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import Link from '@/BetterRouter/Link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DEFAULT_SCRUM_VIEW_BLOCK } from '@/components/elements/dataView/scrum/scrumBoardConstants';
import { normalizeSprintKey, resolveCurrentUserId } from '@/components/elements/dataView/scrum/retroUtils';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

export default function SprintRetroButton({
  boardId,
  sprint,
  retroBoards = {},
  patchSavedView,
  compact = false,
}) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const sprintKey = normalizeSprintKey(sprint);
  const pageId = retroBoards?.[sprintKey];
  const sprintLabel = String(sprint || '').trim() || 'this sprint';

  const patchScrum = (updater) => {
    if (!patchSavedView) return false;
    patchSavedView((prev) => {
      const current = prev?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...current,
          ...next,
        },
      };
    });
    return true;
  };

  const createRetroBoard = async (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    if (!boardId) {
      toast({ title: 'Cannot create retro', description: 'Board ID not available.', variant: 'destructive' });
      return;
    }
    if (!sprint) {
      toast({ title: 'Cannot create retro', description: 'Select a sprint first.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const userId = resolveCurrentUserId();
      if (!userId) {
        toast({
          title: 'Cannot create retro',
          description: 'User session not found. Please sign in again.',
          variant: 'destructive',
        });
        return;
      }

      const result = await api.post(`${baseUrl}/v1/page/document`, {
        user_id: userId,
        last_updated_by: userId,
        title: `Retro — ${sprintLabel}`,
        page_type: 'whiteboard',
        entity_type: 'page',
        content: { elements: [], settings: {} },
        summary: '',
        board_id: boardId,
      });

      const newId = result?.data?._id || result?.data?.id;
      if (!newId) throw new Error('No page ID returned');

      patchScrum((current) => ({
        ...current,
        retro_boards: {
          ...(current.retro_boards || {}),
          [sprintKey]: newId,
        },
      }));

      toast({ title: 'Retro whiteboard created', description: `Created for ${sprintLabel}.` });
    } catch (err) {
      console.error('Failed to create retro board:', err);
      toast({
        title: 'Failed to create retro',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (pageId) {
    return (
      <Button asChild size="sm" variant="outline" className={compact ? 'h-7 text-[11px]' : 'h-8 text-xs'}>
        <Link to={`/whiteboard/${pageId}`} target="_sidebar" onClick={(e) => e.stopPropagation()}>
          Open retro
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={compact ? 'h-7 gap-1 text-[11px]' : 'h-8 gap-1.5 text-xs'}
      onClick={createRetroBoard}
      disabled={creating}
    >
      {creating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      {creating ? 'Creating…' : compact ? 'Create retro' : 'Create retro whiteboard'}
    </Button>
  );
}
