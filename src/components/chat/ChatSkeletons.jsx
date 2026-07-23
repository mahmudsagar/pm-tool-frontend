import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-2 py-1.5">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 pt-0.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3.5 w-3/5" />
      </div>
    </div>
  );
}

export default function MessageThreadSkeleton() {
  return (
    <ScrollArea className="flex-1 px-2 py-3">
      <div className="space-y-1">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </div>
    </ScrollArea>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
