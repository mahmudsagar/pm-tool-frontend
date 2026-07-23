import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
import { useCreateConversation } from '@/hooks/mutations/useChatMutations';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function StartDMDialog({ open, onOpenChange, onCreated }) {
  const [search, setSearch] = useState('');
  const { data: members = [] } = useWorkspaceMembers();
  const createConversation = useCreateConversation();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const filtered = members.filter(m =>
    m._id !== user?._id &&
    (m.name?.toLowerCase().includes(search.toLowerCase()) ||
     m.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = async (memberId) => {
    try {
      const conversation = await createConversation.mutateAsync({
        type: 'dm',
        target_user_id: memberId,
      });
      setSearch('');
      onOpenChange(false);
      onCreated?.(conversation._id);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to start conversation', description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="member-search">Search members</Label>
            <Input
              id="member-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filtered.map((member) => (
              <button
                key={member._id}
                onClick={() => handleSelect(member._id)}
                disabled={createConversation.isPending}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>{member.name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
