import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TeamForm from '@/components/teams/TeamForm';
import useApi from '@/lib/dataFetcher';
import useAuthStore from "@/stores/useAuthStore";
import { baseUrl } from '@/utils/constants';

export default function CreateTeam() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get team ID from URL if present
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/') || id != null;
  
  const { callApi, loading } = useApi();
  const { user } = useAuthStore();
  const [team, setTeam] = useState(null);

  // Fetch team data if we're in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      console.log(`Fetching team data for edit mode, ID: ${id}`);
      callApi(baseUrl + `/v1/team?id=${id}`, {}, (response) => {
        if (response && response._id) {
          console.log("Team data received for editing:", response);
          setTeam(response);
        } else if (response && response.data) {
          setTeam(response.data);
        }
      });
    }
  }, [isEditMode, id, callApi]);

  const handleSubmit = async (data) => {
    // Make sure user exists before accessing _id
    if (!user?._id) {
      console.error("User not loaded");
      return;
    }
    
    // Format the request body
    const teamData = {
      user_id: user._id,
      name: data.name,
      description: data.description,
      shared_members: data.shared_members || [user._id] // At minimum, include the owner
    };
    
    if (isEditMode && id) {
      // Update existing team
      callApi(baseUrl + `/v1/team?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...teamData,
          _id: id  // Include the ID for the update
        })
      }, (response) => {
        if (response && response.status === "success") {
          navigate('/my-teams');
        }
      });
    } else {
      // Create new team
      callApi(baseUrl + '/v1/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      }, () => {
        navigate('/my-teams');
      });
    }
  };

  // Show loading state while fetching team data in edit mode
  if (isEditMode && id && loading && !team) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate('/my-teams')}
        >
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
      <Button
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate('/my-teams')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Teams
      </Button>
      
      <div className="flex justify-center">
        <TeamForm 
          team={team}
          onSubmit={handleSubmit}
          isEdit={isEditMode}
        />
      </div>
    </div>
  );
}
