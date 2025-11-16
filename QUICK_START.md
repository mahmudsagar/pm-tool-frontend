# 🚀 Quick Start Guide - TanStack Query

## For Developers: Start Using TanStack Query Now!

This guide gets you started with the new TanStack Query integration in under 5 minutes.

## ✅ Prerequisites

The infrastructure is already set up:
- ✅ TanStack Query installed
- ✅ QueryClient configured
- ✅ Provider wrapping the app
- ✅ All hooks created and ready to use

## 🎯 Your First Migration (5 minutes)

### Step 1: Choose a Component

Pick any component that uses `useApi` or direct `fetch` calls. Let's use a teams list as an example.

### Step 2: Before Code

```javascript
// Old way ❌
import useApi from '@/lib/dataFetcher';

export default function TeamsList() {
  const { data: teams, loading, error, callApi } = useApi();
  
  useEffect(() => {
    callApi(`${baseUrl}/v1/team`, { method: 'GET' });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {teams?.map(team => <li key={team._id}>{team.name}</li>)}
    </ul>
  );
}
```

### Step 3: After Code

```javascript
// New way ✅
import { useTeams } from '@/hooks/queries/useTeamsQueries';

export default function TeamsList() {
  const { data: teams, isLoading, error } = useTeams();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {teams?.map(team => <li key={team._id}>{team.name}</li>)}
    </ul>
  );
}
```

### Step 4: Changes Made

1. ✅ Removed `useApi` import
2. ✅ Added specific query hook import
3. ✅ Removed `callApi` and `useEffect`
4. ✅ Changed `loading` to `isLoading`
5. ✅ Done! Component now has caching!

## 📚 Available Hooks Cheat Sheet

### Queries (GET operations)

```javascript
// Auth
import { useValidateToken, useCurrentUser } from '@/hooks/queries/useAuthQueries';

// Spaces
import { useSpaces, useSpaceById, useUsers } from '@/hooks/queries/useSpacesQueries';

// Files
import { useDocument, useFiles, useFileById } from '@/hooks/queries/useFilesQueries';

// Teams
import { useTeams, useTeamById, useTeamMembers } from '@/hooks/queries/useTeamsQueries';

// Boards
import { useBoard, useBoards } from '@/hooks/queries/useBoardsQueries';
```

### Mutations (POST, PUT, DELETE)

```javascript
// Auth
import { useLogin, useLogout, useRegister } from '@/hooks/mutations/useAuthMutations';

// Files
import { 
  useCreateFile, 
  useUpdateFile, 
  useDeleteFile, 
  useUpdateDocument 
} from '@/hooks/mutations/useFilesMutations';

// Spaces
import { 
  useCreateSpace, 
  useUpdateSpace, 
  useDeleteSpace 
} from '@/hooks/mutations/useSpacesMutations';

// Teams
import { 
  useCreateTeam, 
  useUpdateTeam, 
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember
} from '@/hooks/mutations/useTeamsMutations';
```

## 🎨 Common Patterns

### Pattern 1: Simple List

```javascript
import { useTeams } from '@/hooks/queries/useTeamsQueries';

function TeamsList() {
  const { data: teams, isLoading } = useTeams();
  
  if (isLoading) return <Spinner />;
  
  return <div>{teams?.map(...)}</div>;
}
```

### Pattern 2: Detail Page

```javascript
import { useTeamById } from '@/hooks/queries/useTeamsQueries';
import { useParams } from 'react-router-dom';

function TeamDetail() {
  const { teamId } = useParams();
  const { data: team, isLoading } = useTeamById(teamId);
  
  if (isLoading) return <Spinner />;
  
  return <div>{team?.name}</div>;
}
```

### Pattern 3: Create Form

```javascript
import { useCreateTeam } from '@/hooks/mutations/useTeamsMutations';
import { useNavigate } from 'react-router-dom';

function CreateTeam() {
  const navigate = useNavigate();
  const createTeam = useCreateTeam();
  
  const handleSubmit = (formData) => {
    createTeam.mutate(formData, {
      onSuccess: () => navigate('/teams')
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createTeam.isPending}>
        {createTeam.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Pattern 4: Update Form

```javascript
import { useUpdateTeam } from '@/hooks/mutations/useTeamsMutations';

function EditTeam({ teamId }) {
  const updateTeam = useUpdateTeam();
  
  const handleSubmit = (formData) => {
    updateTeam.mutate({
      teamId,
      data: formData
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pattern 5: Delete Button

```javascript
import { useDeleteTeam } from '@/hooks/mutations/useTeamsMutations';

function DeleteButton({ teamId }) {
  const deleteTeam = useDeleteTeam();
  
  return (
    <button 
      onClick={() => deleteTeam.mutate(teamId)}
      disabled={deleteTeam.isPending}
    >
      Delete
    </button>
  );
}
```

### Pattern 6: Conditional Fetching

```javascript
// Only fetch when ID exists
const { data: team } = useTeamById(teamId, {
  enabled: !!teamId
});
```

### Pattern 7: Combining Multiple Queries

```javascript
function Dashboard() {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  
  const isLoading = teamsLoading || spacesLoading;
  
  if (isLoading) return <Spinner />;
  
  return <div>...</div>;
}
```

## 🎯 Props Reference

### Query Hook Return Values

```javascript
const {
  data,           // The query data
  isLoading,      // Initial loading state
  isFetching,     // Fetching in background
  isError,        // Error occurred
  error,          // Error object
  refetch,        // Manual refetch function
  isSuccess       // Query succeeded
} = useTeams();
```

### Mutation Hook Return Values

```javascript
const {
  mutate,         // Function to trigger mutation
  mutateAsync,    // Async version
  isPending,      // Mutation in progress (formerly isLoading)
  isError,        // Error occurred
  error,          // Error object
  isSuccess,      // Mutation succeeded
  reset           // Reset mutation state
} = useCreateTeam();
```

## 🛠️ Testing Your Migration

After migrating a component:

1. **Test Loading State**
   - Refresh the page
   - Should see loading state briefly

2. **Test Data Display**
   - Data should appear correctly
   - No errors in console

3. **Test Caching**
   - Navigate away and back
   - Data should load instantly (from cache)
   - Check Network tab - no duplicate requests

4. **Test Mutations**
   - Create/Update/Delete operations
   - Toast notifications appear
   - Lists refresh automatically

5. **Use DevTools**
   - Open React Query DevTools (bottom-left)
   - See your queries and their states
   - Verify cache is working

## 🚨 Common Mistakes

### ❌ Don't: Manual useEffect

```javascript
// Don't do this ❌
const { data } = useTeams();

useEffect(() => {
  // Queries fetch automatically!
}, []);
```

### ✅ Do: Let queries handle it

```javascript
// Do this ✅
const { data } = useTeams();
// That's it! No useEffect needed
```

### ❌ Don't: Call mutate in render

```javascript
// Don't do this ❌
const createTeam = useCreateTeam();
createTeam.mutate(data); // Called every render!
```

### ✅ Do: Call in event handler

```javascript
// Do this ✅
const createTeam = useCreateTeam();

const handleClick = () => {
  createTeam.mutate(data);
};

return <button onClick={handleClick}>Create</button>;
```

## 🎉 Benefits You'll See Immediately

1. **Less Code**: No more useEffect boilerplate
2. **Automatic Caching**: Data loads instantly on revisit
3. **No Duplicate Requests**: Multiple components = single API call
4. **Built-in Loading States**: isLoading, isFetching included
5. **Error Handling**: Consistent error states
6. **Optimistic Updates**: Instant UI feedback
7. **DevTools**: Visual debugging

## 📖 Next Steps

1. ✅ Try migrating one small component
2. ✅ Test it thoroughly
3. ✅ Open DevTools to see caching in action
4. ✅ Migrate more components
5. ✅ Read full docs: `/docs/TANSTACK_QUERY_MIGRATION.md`
6. ✅ Check examples: `/docs/COMPONENT_MIGRATION_EXAMPLES.md`

## 🆘 Need Help?

- Check examples: `/docs/COMPONENT_MIGRATION_EXAMPLES.md`
- Read full guide: `/docs/TANSTACK_QUERY_MIGRATION.md`
- TanStack Query docs: https://tanstack.com/query/latest

## ✨ Pro Tips

1. **Start small**: Migrate simple list components first
2. **Use DevTools**: Press the icon in bottom-left to debug
3. **Check Network tab**: Verify requests are being cached
4. **Test loading states**: Always handle isLoading
5. **Keep Zustand for UI state**: Use Query for server data only

---

**Ready to start?** Pick a component and follow the pattern above. It's that simple!
