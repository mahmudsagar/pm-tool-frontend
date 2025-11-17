import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import useAuthStore from "@/stores/useAuthStore";
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import useApi from '@/lib/dataFetcher';
import { baseUrl } from '@/utils/constants';
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';

const TeamForm = ({ team, onSubmit, isEdit = false }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shared_members: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [userList, setUserList] = useState([]);
  const { loading: loadingUsers, callApi } = useApi();

  // Fetch all users
  useEffect(() => {
    callApi(baseUrl + '/v1/user', {}, (data) => {
      if (data) {
        // Convert object with numbered keys to array, filtering out the mediaAttachments property
        const users = Object.entries(data)
          .filter(([key]) => !isNaN(parseInt(key))) // Keep only numeric keys
          .map(([_, user]) => user);
        setUserList(users);
      }
    });
  }, [callApi]);

  // Initialize form data
  useEffect(() => {
    if (team) {
      console.log("TeamForm received team data:", team);
      setFormData({
        name: team.name || '',
        description: team.description || '',
        shared_members: team.shared_members || [],
      });
      
      // Log to confirm the form data has been set
      console.log("Form data initialized for editing:", {
        name: team.name,
        description: team.description,
        members: team.shared_members?.length || 0
      });
    } else if (user?._id) {
      // Only update if user exists
      setFormData(prev => ({
        ...prev,
        shared_members: [user._id]
      }));
    }
  }, [team, user]);

  // Add this for additional safety - whenever isEdit changes, recheck team data
  useEffect(() => {
    if (isEdit && team) {
      console.log("Edit mode confirmed, verifying form data");
      // Double-check that form data matches team data
      if (formData.name !== team.name || formData.description !== team.description) {
        setFormData({
          name: team.name || '',
          description: team.description || '',
          shared_members: team.shared_members || [],
        });
      }
    }
  }, [isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addMember = (userId) => {
    if (!formData.shared_members.includes(userId)) {
      setFormData(prev => ({
        ...prev,
        shared_members: [...prev.shared_members, userId]
      }));
    }
  };

  const removeMember = (memberId) => {
    // Don't allow removing the current user
    if (user && memberId === user._id) return;
    
    setFormData(prev => ({
      ...prev,
      shared_members: prev.shared_members.filter(id => id !== memberId)
    }));
  };

  const getUserById = (userId) => {
    return userList.find(u => u._id === userId);
  };

  // Log form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Submitting team form:", formData);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {loadingUsers ? "Loading users..." : "Select members..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search users by email..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {userList.length > 0 ? userList.map((userData) => (
                      <CommandItem
                        key={userData._id}
                        value={userData.email || userData._id} // Search by email
                        onSelect={() => {
                          addMember(userData._id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.shared_members.includes(userData._id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {userData.email || userData._id}
                      </CommandItem>
                    )) : (
                      <div className="py-6 text-center text-sm">No users found</div>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.shared_members.map(memberId => {
                const memberData = getUserById(memberId);
                const displayName = memberData ? 
                  (memberData.email || memberData.name || memberId) : 
                  memberId;
                
                return (
                  <Badge 
                    key={memberId} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {displayName}
                    {user && memberId === user._id ? 
                      " (you)" : 
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeMember(memberId)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    }
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Team' : 'Create Team'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TeamForm;
