import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TeamForm from '@/components/teams/TeamForm';
import useAuthStore from "@/stores/useAuthStore";
import { useTeamById } from '@/hooks/queries/useTeamsQueries';
import { useCreateTeam, useUpdateTeam } from '@/hooks/mutations/useTeamsMutations';

export default function CreateTeam() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/') || id != null;
  
  const { user } = useAuthStore();
  const { data: team, isLoading } = useTeamById(isEditMode ? id : null);
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();

  const handleSubmit = async (data) => {
    if (!user?._id) {
      console.error("User not loaded");
      return;
    }
    
    const teamData = {
      user_id: user._id,
      name: data.name,
      description: data.description,
      shared_members: data.shared_members || [user._id],
    };
    
    if (isEditMode && id) {
      await updateTeamMutation.mutateAsync({ teamId: id, data: { ...teamData, _id: id } });
      navigate('/users');
    } else {
      await createTeamMutation.mutateAsync(teamData);
      navigate('/users');
    }
  };

  const isPending = createTeamMutation.isPending || updateTeamMutation.isPending;

  if (isEditMode && id && isLoading && !team) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Button>
        <div className="flex justify-center">
          <div className="text-center p-8">Loading team data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/users')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Teams
      </Button>
      
      <div className="flex justify-center">
        <TeamForm 
          team={team}
          onSubmit={handleSubmit}
          isEdit={isEditMode}
          isLoading={isPending}
        />
      </div>
    </div>
  );
}
