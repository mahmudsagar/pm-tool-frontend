import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import Link from '@/BetterRouter/Link';
import { useTeams } from '@/hooks/queries/useTeamsQueries';
import { useDeleteTeam } from '@/hooks/mutations/useTeamsMutations';

export default function Teams() {
  const navigate = useNavigate();
  
  // Use TanStack Query - automatic caching and refetching
  const { data: teams = [], isLoading } = useTeams();
  const deleteTeam = useDeleteTeam();

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      deleteTeam.mutate(id);
    }
  };

  const renderEmptyState = () => (
    <div className="text-center py-8">
      <p className="text-muted-foreground mb-4">No teams found. Create your first team to get started.</p>
      <Button onClick={() => navigate('/teams/create')}>
        <PlusIcon className="mr-2 h-4 w-4" />
        Create Team
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Teams</CardTitle>
            <CardDescription>Manage your organization's teams</CardDescription>
          </div>
          <Button onClick={() => navigate('/teams/create')}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Team
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading teams...
                  </TableCell>
                </TableRow>) : <>
                {teams?.map((team) => (
                  <TableRow key={team?._id}>
                    <TableCell className="font-medium">
                      <Link href={`/my-teams/${team?._id}`} className="hover:underline">
                        {team?.name}
                      </Link>
                    </TableCell>
                    <TableCell>{team?.description}</TableCell>
                    <TableCell>{team?.shared_members?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/my-teams/edit/${team?._id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(team?._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}</>}
            </TableBody>
          </Table>
          {(!isLoading && teams?.length == 0) && renderEmptyState()}
        </CardContent>
      </Card>
    </div>
  );
}
