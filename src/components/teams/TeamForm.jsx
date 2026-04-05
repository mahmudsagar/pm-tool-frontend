import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import useAuthStore from "@/stores/useAuthStore";
import { Check, XIcon } from 'lucide-react';
import { baseUrl } from '@/utils/constants';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { useSearchWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';

const TeamForm = ({ team, onSubmit, isEdit = false }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shared_members: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberMap, setMemberMap] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const { data: memberResults = [], isFetching: fetchingMembers } = useSearchWorkspaceMembers(debouncedMemberSearch);

  // Initialize form data
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        shared_members: team.shared_members || [],
      });
    } else if (user?._id) {
      setFormData(prev => ({ ...prev, shared_members: [user._id] }));
    }
    // Seed the map with the current user so their badge shows email, not raw ID
    if (user?._id) {
      setMemberMap(prev => ({ ...prev, [user._id]: user }));
    }
  }, [team, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleMember = (u) => {
    setMemberMap((prev) => ({ ...prev, [u._id]: u }));
    setFormData(prev => ({
      ...prev,
      shared_members: prev.shared_members.includes(u._id)
        ? prev.shared_members.filter(id => id !== u._id)
        : [...prev.shared_members, u._id],
    }));
  };

  const removeMember = (memberId) => {
    if (user && memberId === user._id) return;
    setFormData(prev => ({
      ...prev,
      shared_members: prev.shared_members.filter(id => id !== memberId),
    }));
  };

  const getMemberById = (id) => memberMap[id];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMemberDropdown = memberDropdownOpen && debouncedMemberSearch.length > 0;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Team' : 'Create New Team'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Team Members</Label>
            <div className="relative">
              <Input
                placeholder="Search workspace members..."
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdownOpen(true); }}
                onFocus={() => setMemberDropdownOpen(true)}
                onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                autoComplete="off"
              />
              {showMemberDropdown && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                  {fetchingMembers ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                  ) : memberResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No members found.</div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {memberResults.map((u) => (
                        <li
                          key={u._id}
                          onMouseDown={(e) => { e.preventDefault(); toggleMember(u); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              formData.shared_members.includes(u._id) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{u.email}</span>
                            {u.name && (
                              <span className="text-xs text-muted-foreground truncate">{u.name}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {formData.shared_members.map(memberId => {
                const memberData = getMemberById(memberId);
                const displayName = memberData ? (memberData.email || memberData.name || memberId) : memberId;
                return (
                  <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                    {displayName}
                    {user && memberId === user._id ? (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    ) : (
                      <button type="button" onClick={() => removeMember(memberId)}>
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Team' : 'Create Team'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TeamForm;
