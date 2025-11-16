# TanStack Query Migration Guide

## 🎯 Overview

This project has been migrated from custom `useApi` hooks and direct `fetch` calls to **TanStack Query (React Query)** for better API caching, request deduplication, and state management.

## 📦 What's New

### New Dependencies
- `@tanstack/react-query` - Main query library
- `@tanstack/react-query-devtools` - Development tools for debugging queries

### New Files Created

#### Configuration
- `/src/lib/queryClient.js` - Query client with caching configuration
- `/src/stores/useAuthStore.js` - Zustand store for authentication state

#### Query Hooks (for fetching data)
- `/src/hooks/queries/useAuthQueries.js` - Auth validation and user queries
- `/src/hooks/queries/useSpacesQueries.js` - Spaces and users queries
- `/src/hooks/queries/useFilesQueries.js` - Files and documents queries
- `/src/hooks/queries/useTeamsQueries.js` - Teams and members queries
- `/src/hooks/queries/useBoardsQueries.js` - Boards queries

#### Mutation Hooks (for modifying data)
- `/src/hooks/mutations/useAuthMutations.js` - Login, logout, register
- `/src/hooks/mutations/useFilesMutations.js` - Create, update, delete files
- `/src/hooks/mutations/useSpacesMutations.js` - Create, update, delete spaces
- `/src/hooks/mutations/useTeamsMutations.js` - Team management mutations

## 🔄 Migration Patterns

### Before (Old Pattern with useApi)
```javascript
import useApi from '@/lib/dataFetcher';

function MyComponent() {
  const { data, loading, error, callApi } = useApi();
  
  useEffect(() => {
    callApi('/api/endpoint', { method: 'GET' });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{data}</div>;
}
```

### After (New Pattern with TanStack Query)
```javascript
import { useSpaces } from '@/hooks/queries/useSpacesQueries';

function MyComponent() {
  const { data, isLoading, error } = useSpaces();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data}</div>;
}
```

## 📋 Common Use Cases

### 1. Fetching Data with Queries

#### Fetch Spaces
```javascript
import { useSpaces, useSpaceById } from '@/hooks/queries/useSpacesQueries';

// Get all spaces
const { data: spaces, isLoading } = useSpaces();

// Get specific space
const { data: space } = useSpaceById(spaceId);
```

#### Fetch Teams
```javascript
import { useTeams, useTeamById } from '@/hooks/queries/useTeamsQueries';

// Get all teams
const { data: teams } = useTeams();

// Get specific team
const { data: team } = useTeamById(teamId);
```

#### Fetch Documents
```javascript
import { useDocument } from '@/hooks/queries/useFilesQueries';

const { data: document, isLoading } = useDocument(documentId);
```

### 2. Creating/Updating Data with Mutations

#### Create a File
```javascript
import { useCreateFile } from '@/hooks/mutations/useFilesMutations';

function CreateFileButton() {
  const createFile = useCreateFile();
  
  const handleCreate = () => {
    createFile.mutate({
      name: 'New Document',
      type: 'document',
      space_id: spaceId
    });
  };
  
  return (
    <button 
      onClick={handleCreate}
      disabled={createFile.isPending}
    >
      {createFile.isPending ? 'Creating...' : 'Create File'}
    </button>
  );
}
```

#### Update a Team
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

#### Delete with Optimistic Updates
```javascript
import { useDeleteFile } from '@/hooks/mutations/useFilesMutations';

function DeleteButton({ fileId }) {
  const deleteFile = useDeleteFile();
  
  return (
    <button onClick={() => deleteFile.mutate(fileId)}>
      Delete
    </button>
  );
}
```

### 3. Authentication

```javascript
import { useLogin, useLogout, useRegister } from '@/hooks/mutations/useAuthMutations';

function LoginForm() {
  const login = useLogin();
  const logout = useLogout();
  const register = useRegister();
  
  const handleLogin = (email, password) => {
    login.mutate({ email, password }, {
      onSuccess: () => {
        // Navigate or show success
      }
    });
  };
  
  return ...;
}
```

### 4. Conditional Fetching
```javascript
// Only fetch when userId is available
const { data: team } = useTeamById(userId, {
  enabled: !!userId
});
```

### 5. Background Refetching
```javascript
// Refetch every 30 seconds
const { data: board } = useBoard(boardId, {
  refetchInterval: 30000
});
```

## 🎨 Benefits

### 1. Automatic Caching
```javascript
// First component
const { data } = useSpaces(); // Makes API call

// Second component (anywhere in the app)
const { data } = useSpaces(); // Uses cached data, no API call!
```

### 2. Request Deduplication
If multiple components request the same data simultaneously, only one request is made.

### 3. Automatic Refetching
Data automatically refetches when:
- Component mounts (if stale)
- Window regains focus (configurable)
- Network reconnects
- At specified intervals

### 4. Optimistic Updates
Updates happen instantly in the UI, with automatic rollback on error:
```javascript
const deleteFile = useDeleteFile();
// UI updates immediately, rolls back if server request fails
```

### 5. Built-in Loading & Error States
```javascript
const { data, isLoading, error, isFetching } = useSpaces();

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;
return <div>{data}</div>;
```

### 6. Cache Invalidation
Mutations automatically invalidate related queries:
```javascript
// After creating a file
queryClient.invalidateQueries({ queryKey: ['files'] });
queryClient.invalidateQueries({ queryKey: ['spaces'] });
```

## 🛠️ Developer Tools

The React Query DevTools are available in development mode. Press the React Query icon in the bottom-left corner to:
- View all queries and their states
- See cached data
- Manually refetch or invalidate queries
- Debug query timing and lifecycle

## 🔧 Advanced Patterns

### Manual Query Invalidation
```javascript
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();
  
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['spaces'] });
  };
}
```

### Prefetching
```javascript
const queryClient = useQueryClient();

const prefetchTeam = (teamId) => {
  queryClient.prefetchQuery({
    queryKey: ['teams', teamId],
    queryFn: () => fetchTeamById(teamId),
  });
};

// Use on hover for better UX
<Link onMouseEnter={() => prefetchTeam(team.id)}>
  {team.name}
</Link>
```

### Custom Hooks with Query Composition
```javascript
function useTeamWithMembers(teamId) {
  const { data: team } = useTeamById(teamId);
  const { data: members } = useTeamMembers(teamId);
  
  return {
    team,
    members,
    isLoading: !team || !members
  };
}
```

## 📝 Migration Checklist for Components

When migrating a component:

1. ✅ Replace `import useApi from '@/lib/dataFetcher'` with specific query hooks
2. ✅ Replace `const { data, loading, error, callApi } = useApi()` with `const { data, isLoading, error } = useQueryHook()`
3. ✅ Remove `useEffect` with `callApi` - queries fetch automatically
4. ✅ Replace `loading` with `isLoading`
5. ✅ For mutations, use mutation hooks instead of `callApi` with POST/PUT/DELETE
6. ✅ Remove manual state management for API data (it's handled by TanStack Query)
7. ✅ Test loading states, error handling, and data refetching

## 🎯 Zustand Integration

### Server State vs Client State

- **Server State** (TanStack Query): API data, cached responses
- **Client State** (Zustand): UI preferences, selected items, filters

```javascript
// Good: Use TanStack Query for server data
const { data: spaces } = useSpaces();

// Good: Use Zustand for UI state
const { selectedSpaceId, setSelectedSpaceId } = useFileManagerStore();

// Combine both
useEffect(() => {
  if (spaces && spaces.length > 0) {
    setSelectedSpaceId(spaces[0]._id);
  }
}, [spaces]);
```

## 🚀 Performance Tips

1. **Use `staleTime` wisely**: Set longer for data that doesn't change often
2. **Enable prefetching**: Prefetch on hover for better UX
3. **Use pagination**: For large datasets, implement paginated queries
4. **Optimize re-renders**: Use `select` option to subscribe to specific data slices
5. **Disable refetch on focus**: For data that doesn't need real-time updates

## 📚 Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Mutations Guide](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

## ❓ Common Issues

### Issue: "data is undefined"
**Solution**: Use optional chaining or check `isLoading` first
```javascript
const { data, isLoading } = useSpaces();
if (isLoading) return <Spinner />;
return <div>{data?.map(...)}</div>;
```

### Issue: "Data not updating after mutation"
**Solution**: Ensure query invalidation in mutation's `onSuccess`:
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['relevant-key'] });
}
```

### Issue: "Too many re-renders"
**Solution**: Don't call queries in render without proper conditions. Use `enabled` option:
```javascript
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  enabled: shouldFetch, // Boolean condition
});
```
