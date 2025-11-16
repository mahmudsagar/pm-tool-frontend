# Example Component Migrations

This document shows specific examples of migrating components from the old `useApi` pattern to TanStack Query.

## Example 1: Sidebar Component

### Before (using useApi)
```javascript
import useApi from "@/lib/dataFetcher";

export default function Sidebar() {
  const { data: users, callApi: userCallApi } = useApi();
  const { data: spaces, callApi: spaceCallApi } = useApi();
  
  useEffect(() => {
    userCallApi(baseUrl + '/v1/user', { method: 'GET' });
    spaceCallApi(baseUrl + '/v1/space', { method: 'GET' });
  }, []);
  
  // Rest of component...
}
```

### After (using TanStack Query)
```javascript
import { useSpaces, useUsers } from '@/hooks/queries/useSpacesQueries';

export default function Sidebar() {
  const { data: spaces, isLoading: isSpacesLoading } = useSpaces();
  const { data: users, isLoading: isUsersLoading } = useUsers();
  
  // No useEffect needed - queries fetch automatically!
  // Data is cached and shared across components
  
  if (isSpacesLoading || isUsersLoading) {
    return <Spinner />;
  }
  
  // Rest of component...
}
```

## Example 2: Team Details Page

### Before
```javascript
import useApi from '@/lib/dataFetcher';

export default function TeamDetails() {
  const { teamId } = useParams();
  const { data: team, loading, callApi } = useApi();
  
  useEffect(() => {
    if (teamId) {
      callApi(`${baseUrl}/v1/team/${teamId}`, { method: 'GET' });
    }
  }, [teamId]);
  
  if (loading) return <div>Loading...</div>;
  
  return <div>{team?.name}</div>;
}
```

### After
```javascript
import { useTeamById } from '@/hooks/queries/useTeamsQueries';

export default function TeamDetails() {
  const { teamId } = useParams();
  const { data: team, isLoading } = useTeamById(teamId);
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>{team?.name}</div>;
}
```

## Example 3: Create Team Form

### Before
```javascript
import useApi from '@/lib/dataFetcher';

export default function CreateTeam() {
  const { callApi, loading } = useApi();
  const navigate = useNavigate();
  
  const handleSubmit = async (formData) => {
    await callApi(
      `${baseUrl}/v1/team`,
      {
        method: 'POST',
        body: JSON.stringify(formData)
      },
      (data) => {
        toast({ title: 'Team created' });
        navigate('/teams');
      }
    );
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### After
```javascript
import { useCreateTeam } from '@/hooks/mutations/useTeamsMutations';

export default function CreateTeam() {
  const navigate = useNavigate();
  const createTeam = useCreateTeam();
  
  const handleSubmit = (formData) => {
    createTeam.mutate(formData, {
      onSuccess: () => {
        navigate('/teams');
        // Toast is handled in the mutation hook
        // Cache is automatically invalidated
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createTeam.isPending}>
        {createTeam.isPending ? 'Creating...' : 'Create Team'}
      </button>
    </form>
  );
}
```

## Example 4: Document Page with Real-time Updates

### Before
```javascript
import useApi from '@/lib/dataFetcher';

export default function DocumentPage() {
  const { documentId } = useParams();
  const { data: document, callApi } = useApi();
  
  useEffect(() => {
    callApi(`${documentBaseUrl}?id=${documentId}`);
    
    // Manual polling
    const interval = setInterval(() => {
      callApi(`${documentBaseUrl}?id=${documentId}`);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [documentId]);
  
  return <div>{document?.content}</div>;
}
```

### After
```javascript
import { useDocument } from '@/hooks/queries/useFilesQueries';

export default function DocumentPage() {
  const { documentId } = useParams();
  const { data: document } = useDocument(documentId, {
    refetchInterval: 30000 // Automatic polling every 30 seconds
  });
  
  return <div>{document?.content}</div>;
}
```

## Example 5: File Delete with Optimistic UI

### Before
```javascript
import useApi from '@/lib/dataFetcher';

export default function DeleteButton({ fileId, onDelete }) {
  const { callApi, loading } = useApi();
  
  const handleDelete = async () => {
    // Manually update UI
    onDelete(fileId);
    
    try {
      await callApi(`${baseUrl}/v1/files/${fileId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      // Manually rollback on error
      toast({ title: 'Failed', variant: 'destructive' });
      // Need to reload data
    }
  };
  
  return <button onClick={handleDelete}>Delete</button>;
}
```

### After
```javascript
import { useDeleteFile } from '@/hooks/mutations/useFilesMutations';

export default function DeleteButton({ fileId }) {
  const deleteFile = useDeleteFile();
  
  // Optimistic update and auto-rollback handled in mutation hook
  const handleDelete = () => {
    deleteFile.mutate(fileId);
  };
  
  return (
    <button onClick={handleDelete} disabled={deleteFile.isPending}>
      {deleteFile.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

## Example 6: AuthContext Integration

### Before
```javascript
const login = async (email, password) => {
  setLoading(true);
  try {
    const response = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    toast({ title: 'Login successful' });
    return true;
  } catch (error) {
    toast({ title: 'Login failed', variant: 'destructive' });
    return false;
  } finally {
    setLoading(false);
  }
};
```

### After
```javascript
import { useLogin } from '@/hooks/mutations/useAuthMutations';

// In component
const login = useLogin();

const handleLogin = async (email, password) => {
  return new Promise((resolve) => {
    login.mutate(
      { email, password },
      {
        onSuccess: () => resolve(true),
        onError: () => resolve(false)
      }
    );
  });
};
```

## Example 7: Protected Route with Token Validation

### Before
```javascript
export function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  
  useEffect(() => {
    if (token) {
      fetch(`${authBaseUrl}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Invalid token');
          setIsValidating(false);
        })
        .catch(() => {
          logout();
          setIsValidating(false);
        });
    }
  }, [token]);
  
  if (isValidating) return <div>Validating...</div>;
  return children;
}
```

### After
```javascript
import { useValidateToken } from '@/hooks/queries/useAuthQueries';

export function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  const { isLoading, error } = useValidateToken(!!token);
  
  if (isLoading) return <div>Validating...</div>;
  if (error) return <Navigate to="/login" />;
  
  return children;
}
```

## Example 8: Data Table with Filters

### Before
```javascript
export default function DataTable() {
  const [searchParams] = useSearchParams();
  const { data: files, callApi, loading } = useApi();
  
  useEffect(() => {
    const filter = searchParams.get('filter');
    const spaceId = searchParams.get('spaceId');
    
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (spaceId) params.append('spaceId', spaceId);
    
    callApi(`${baseUrl}/v1/files?${params.toString()}`);
  }, [searchParams]);
  
  if (loading) return <Spinner />;
  return <Table data={files} />;
}
```

### After
```javascript
import { useFiles } from '@/hooks/queries/useFilesQueries';

export default function DataTable() {
  const [searchParams] = useSearchParams();
  
  const filters = {
    filter: searchParams.get('filter'),
    spaceId: searchParams.get('spaceId')
  };
  
  const { data: files, isLoading } = useFiles(filters);
  
  // Automatically refetches when filters change
  // Previous queries are cached by filter combination
  
  if (isLoading) return <Spinner />;
  return <Table data={files} />;
}
```

## Example 9: Combining Multiple Queries

### Before
```javascript
export default function Dashboard() {
  const { data: teams, callApi: teamsApi } = useApi();
  const { data: spaces, callApi: spacesApi } = useApi();
  const { data: files, callApi: filesApi } = useApi();
  
  useEffect(() => {
    teamsApi(`${baseUrl}/v1/team`);
    spacesApi(`${baseUrl}/v1/space`);
    filesApi(`${baseUrl}/v1/files`);
  }, []);
  
  return <div>...</div>;
}
```

### After
```javascript
import { useTeams } from '@/hooks/queries/useTeamsQueries';
import { useSpaces } from '@/hooks/queries/useSpacesQueries';
import { useFiles } from '@/hooks/queries/useFilesQueries';

export default function Dashboard() {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: files, isLoading: filesLoading } = useFiles();
  
  const isLoading = teamsLoading || spacesLoading || filesLoading;
  
  if (isLoading) return <Spinner />;
  
  return <div>...</div>;
}
```

## Example 10: Update with Optimistic UI

### Before
```javascript
const handleUpdate = async (newData) => {
  // Update local state optimistically
  setLocalData(newData);
  
  try {
    await callApi(`${baseUrl}/v1/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(newData)
    });
  } catch (error) {
    // Rollback
    setLocalData(oldData);
  }
};
```

### After
```javascript
import { useUpdateFile } from '@/hooks/mutations/useFilesMutations';

const updateFile = useUpdateFile();

const handleUpdate = (newData) => {
  updateFile.mutate(
    { fileId, data: newData },
    {
      // Automatic optimistic update and rollback
      // Query cache is automatically updated
    }
  );
};
```

## Key Takeaways

1. **No more useEffect for data fetching** - Queries fetch automatically
2. **Automatic caching** - Same query = same cached data
3. **Built-in loading/error states** - No manual state management
4. **Optimistic updates** - UI updates instantly with auto-rollback
5. **Query invalidation** - Mutations auto-refresh related data
6. **Request deduplication** - Multiple identical requests = single API call
7. **DevTools included** - Debug queries visually

## Migration Priority

Migrate in this order:
1. ✅ Auth-related components (highest impact)
2. ✅ Sidebar and navigation (frequently rendered)
3. ✅ Data tables and lists (most benefit from caching)
4. ✅ Forms with create/update operations
5. ✅ Detail pages (benefit from prefetching)
6. ✅ Less frequently used components

## Testing After Migration

After migrating each component:
- ✅ Test loading states
- ✅ Test error scenarios
- ✅ Verify data updates after mutations
- ✅ Check network tab for request deduplication
- ✅ Test cache persistence (refresh page)
- ✅ Verify no unnecessary re-renders
- ✅ Test with React Query DevTools
