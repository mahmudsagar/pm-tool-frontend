import { useEffect, useState } from 'react';
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
import useApi from '@/lib/dataFetcher';
import { baseUrl } from '@/utils/constants';
import TeamForm from '@/components/teams/TeamForm';

export default function TeamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // More flexible edit mode detection to handle different route structures
  const isEditMode = location.pathname.includes('/edit/') || location.pathname.includes('/edit');
  console.log("Current path:", location.pathname, "Edit mode:", isEditMode);

  const [team, setTeam] = useState(null);
  const { loading: isLoading, error, callApi } = useApi();
  const [apiResponse, setApiResponse] = useState(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTeam();
      console.log("Component mode:", isEditMode ? "EDIT" : "VIEW");
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (isAddMemberOpen) {
      fetchAvailableUsers();
    }
  }, [isAddMemberOpen]);

  const fetchTeam = () => {
    callApi(baseUrl + `/v1/team?id=${id}`, {}, (response) => {
      console.log("API Response:", response);
      setApiResponse(response);
      
      if (response && response._id) {
        console.log("Setting team data:", response);
        setTeam(response);
        
        // Log extra info when in edit mode to confirm team data is ready
        if (isEditMode) {
          console.log("Team data available for edit form:", {
            name: response.name,
            description: response.description,
            members: response.shared_members
          });
        }
      } else if (response && response.data) {
        console.log("Setting team data from response.data:", response.data);
        setTeam(response.data);
      } else {
        console.log("No team data found in response");
        setTeam(null);
      }
    });
  };

  useEffect(() => {
    if (isEditMode && !team) {
      console.log("In edit mode, waiting for team data...");
    }
  }, [isEditMode, team]);

  const fetchAvailableUsers = () => {
    setLoadingUsers(true);
    callApi(baseUrl + '/v1/user', {}, (response) => {
      setLoadingUsers(false);
      
      if (response && Array.isArray(response)) {
        const existingMemberIds = team?.shared_members || [];
        const filteredUsers = response.filter(user => 
          !existingMemberIds.includes(user._id)
        );
        setAvailableUsers(filteredUsers);
      } else {
        console.error("Failed to fetch users or invalid response format");
        setAvailableUsers([]);
      }
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoadingUsers(false);
      setAvailableUsers([]);
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      callApi(baseUrl + `/v1/team?id=${id}`, { method: 'DELETE' }, () => {
        navigate('/my-teams');
      });
    }
  };

  const handleAddMember = () => {
    if (!newMemberId || newMemberId === 'loading' || newMemberId === 'no-users') {
      setAddMemberError('Please select a valid user');
      return;
    }
    
    setAddingMember(true);
    setAddMemberError('');
    
    callApi(baseUrl + `/v1/team/member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: id,
        member_id: newMemberId
      })
    }, (response) => {
      setAddingMember(false);
      if (response && response.status === "success") {
        setIsAddMemberOpen(false);
        setNewMemberId('');
        fetchTeam();
      } else {
        setAddMemberError(response?.message || 'Failed to add member. Please try again.');
      }
    }, (error) => {
      setAddingMember(false);
      setAddMemberError(error || 'An error occurred. Please try again.');
    });
  };

  const handleEditSubmit = async (formData) => {
    console.log("Submitting updated team data:", formData);
    callApi(baseUrl + `/v1/team?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        _id: id  // Ensure the ID is included
      })
    }, (response) => {
      if (response && response.status === "success") {
        navigate(`/my-teams/${id}`);
      }
    });
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
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!team && apiResponse) {
    return (
      <div className="text-center p-8">
        <div>Team not found in expected format</div>
        <div className="mt-4 text-left bg-gray-100 p-4 rounded overflow-auto max-h-96">
          <pre className="text-xs">Response: {JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      </div>
    );
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
                    disabled={addingMember || loadingUsers || availableUsers.length === 0}
                  >
                    {addingMember ? "Adding..." : "Add Member"}
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
