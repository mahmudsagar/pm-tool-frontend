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
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
import { useCreateConversation } from '@/hooks/mutations/useChatMutations';
import { useToast } from '@/components/ui/use-toast';

export default function CreateGroupDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const { data: members = [] } = useWorkspaceMembers();
  const createConversation = useCreateConversation();
  const { toast } = useToast();

  const toggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Group name is required' });
      return;
    }

    try {
      const conversation = await createConversation.mutateAsync({
        type: 'group',
        name: name.trim(),
        members: selectedMembers,
      });
      setName('');
      setSelectedMembers([]);
      onOpenChange(false);
      onCreated?.(conversation._id);
      toast({ variant: 'success', title: 'Group created!' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to create group', description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team"
            />
          </div>
          <div>
            <Label>Add Members</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 mt-1 space-y-2">
              {members.map((member) => (
                <label key={member._id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedMembers.includes(member._id)}
                    onCheckedChange={() => toggleMember(member._id)}
                  />
                  <span className="text-sm">{member.name || member.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createConversation.isPending}>
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
