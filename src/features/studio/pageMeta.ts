import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { invalidateSpaceData } from '@/features/spaces/queries';

export type DocStatus = 'draft' | 'in_review' | 'approved' | 'published';

export const DOC_STATUS: Record<DocStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'info' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_review: { label: 'In review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  published: { label: 'Published', variant: 'info' },
};

/** Page fields edited outside the editor body. */
export interface PageMetaPatch {
  title?: string;
  icon?: string;
  subtitle?: string;
  doc_status?: DocStatus;
  cover_position?: number;
  locked?: boolean;
  shared_members?: string[];
  shared_teams?: string[];
}

export function usePatchPage(pageId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (patch: PageMetaPatch) => http.put('/v1/page/document', { id: pageId, ...patch }),
    onMutate: async (patch) => {
      const key = ['documents', pageId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: Record<string, unknown> | undefined) => (old ? { ...old, ...patch } : old));
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(['documents', pageId], context.previous);
      const locked = error instanceof ApiError && error.status === 423;
      toast({
        variant: 'destructive',
        title: locked ? 'This page is locked' : 'Could not save',
        description: locked ? 'Ask the person who locked it, or an admin, to unlock it.' : (error as Error).message,
      });
    },
    onSuccess: (_d, patch) => {
      if (patch.title !== undefined || patch.icon !== undefined) invalidateSpaceData(queryClient);
    },
  });
}

export interface PageStats {
  views: number;
  viewers: { _id: string; name?: string; email?: string; avatar?: string; viewed_at: string }[];
  comment_count: number;
  updatedAt?: string;
  last_updated_by?: { _id: string; name?: string; avatar?: string } | null;
}

export function usePageStats(pageId: string | undefined) {
  return useQuery({
    queryKey: ['page-stats', pageId],
    queryFn: () => http.get<PageStats>('/v1/page/stats', { query: { id: pageId } }),
    enabled: !!pageId,
    staleTime: 60 * 1000,
    retry: false,
  });
}
