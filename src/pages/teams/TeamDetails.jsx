import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useTeamById } from '@/hooks/queries/useTeamsQueries';
import { useUsers } from '@/hooks/queries/useSpacesQueries';
import { useDeleteTeam, useAddTeamMember, useUpdateTeam } from '@/hooks/mutations/useTeamsMutations';
import TeamForm from '@/components/teams/TeamForm';

export default function TeamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // More flexible edit mode detection to handle different route structures
  const isEditMode = location.pathname.includes('/edit/') || location.pathname.includes('/edit');

  // Use TanStack Query hooks - automatic caching
  const { data: team, isLoading, error } = useTeamById(id);
  const { data: availableUsers = [], isLoading: loadingUsers } = useUsers();
  const deleteTeam = useDeleteTeam();
  const addMember = useAddTeamMember();
  const updateTeam = useUpdateTeam();
  
  const [newMemberId, setNewMemberId] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  // Filter available users to exclude existing members
  const filteredAvailableUsers = availableUsers.filter(user => 
    !team?.shared_members?.includes(user._id)
  );

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      deleteTeam.mutate(id, {
        onSuccess: () => navigate('/my-teams')
      });
    }
  };

  const handleAddMember = () => {
    if (!newMemberId || newMemberId === 'loading' || newMemberId === 'no-users') {
      setAddMemberError('Please select a valid user');
      return;
    }
    
    setAddMemberError('');
    
    addMember.mutate(
      { teamId: id, userId: newMemberId },
      {
        onSuccess: () => {
          setIsAddMemberOpen(false);
          setNewMemberId('');
        },
        onError: (error) => {
          setAddMemberError(error.message || 'Failed to add member. Please try again.');
        }
      }
    );
  };

  const handleEditSubmit = (formData) => {
    console.log("Submitting updated team data:", formData);
    
    updateTeam.mutate(
      {
        teamId: id,
        data: { ...formData, _id: id }
      },
      {
        onSuccess: () => navigate(`/my-teams/${id}`)
      }
    );
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Exit edit mode - go back to view
      navigate(`/my-teams/${id}`);
    } else {
      // Enter edit mode
      navigate(`/my-teams/edit/${id}`);
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;
  }

  if (!team && id) {
    return <div className="text-center p-8">Team not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/my-teams')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Button>
        
        {team && (
          <Button 
            variant={isEditMode ? "default" : "outline"}
            onClick={toggleEditMode}
          >
            {isEditMode ? "Cancel Editing" : "Edit Team"}
          </Button>
        )}
      </div>
      
      {team && !isEditMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <CardDescription>{team.description || "No description provided"}</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/my-teams/edit/${team._id}`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium mb-4">Members</h3>
            {team.shared_members && team.shared_members.length > 0 ? (
              <ul className="space-y-2">
                {team.shared_members.map((memberId, index) => (
                  <li key={memberId} className="p-2 bg-muted rounded-md flex justify-between items-center">
                    <span>User ID: {memberId}</span>
                    {memberId === team.user_id && 
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Owner</span>
                    }
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No members yet.</p>
            )}
          </CardContent>
          <CardFooter>
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Members
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Select a user to add to this team.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="member-select" className="text-right">
                      User
                    </Label>
                    <div className="col-span-3">
                      <Select 
                        onValueChange={setNewMemberId} 
                        value={newMemberId}
                      >
                        <SelectTrigger id="member-select" className="w-full">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingUsers ? (
                            <SelectItem value="loading" disabled>Loading users...</SelectItem>
                          ) : availableUsers.length > 0 ? (
                            availableUsers.map(user => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name || user.email || user._id}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-users" disabled>No users available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {addMemberError && (
                    <p className="text-sm text-red-500 mt-1">{addMemberError}</p>
                  )}
                </div>
                
                <DialogFooter>
                  <Button
                    onClick={handleAddMember}
                    disabled={addMember.isPending || loadingUsers || availableUsers.length === 0}
                  >
                    {addMember.isPending ? "Adding..." : "Add Member"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      )}

      {team && isEditMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Edit Team</CardTitle>
              <CardDescription>Update your team details</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <TeamForm 
              key={`team-edit-${team._id}`} // Force re-render when team changes
              team={team}
              onSubmit={handleEditSubmit}
              isEdit={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
