# Entity Access & Role Management

## Overview

Entity access (who can view/interact) is now **completely separate** from role management (what permissions they have).

## Format

### Data Structure

```js
// Entity (space, board, etc.)
{
  _id: "entity-id",
  is_private: false,
  
  // ACCESS CONTROL — just IDs
  shared_members: ["user-1", "user-2"],      // User IDs only (strings)
  shared_teams: ["team-1", "team-2"],        // Team IDs only (strings)
  
  // ROLE MANAGEMENT — separate from access
  member_roles: {                            // Map of userId -> role
    "user-1": "manager",
    "user-2": "contributor"
  },
  team_roles: {                              // Map of teamId -> role
    "team-1": "manager",
    "team-2": "viewer"
  }
}
```

### Access Rules

- **Public entity** (`is_private: false` + empty `shared_members`/`shared_teams`):
  - Accessible to **all workspace members**
  - Roles are still assignable for permission management

- **Restricted entity** (has entries in `shared_members` or `shared_teams`):
  - Only those members/teams can access it
  - Each member/team has a role in `member_roles`/`team_roles`

- **Private entity** (`is_private: true`):
  - Only owner can access (unless explicitly shared)
  - Regardless of other sharing settings

## Usage in Components

### Getting User's Role

```js
import { getUserRoleInEntity } from '@/utils/entityAccessUtils';

const userRole = getUserRoleInEntity(space, userId);
// Returns: 'manager', 'contributor', 'viewer', or null
```

### Checking Access

```js
import { userHasAccessToEntity } from '@/utils/entityAccessUtils';

const hasAccess = userHasAccessToEntity(space, userId);
// Returns: boolean
```

### Updating Access & Roles

```js
import { 
  addMemberToEntity, 
  removeMemberFromEntity,
  updateMemberRoleInEntity,
  buildAccessUpdatePayload
} from '@/utils/entityAccessUtils';

// Add a new member with a role
const updated = addMemberToEntity(space, userId, 'contributor');

// Change their role
const updated2 = updateMemberRoleInEntity(updated, userId, 'manager');

// Remove them
const updated3 = removeMemberFromEntity(updated2, userId);

// Build API payload
const payload = buildAccessUpdatePayload(
  updated3.shared_members,
  updated3.member_roles,
  updated3.shared_teams,
  updated3.team_roles
);
```

### Normalizing API Data

Data from the API is automatically normalized to the new format:

```js
// In components when loading entity data
import { normalizeEntityAccess } from '@/utils/entityAccessUtils';

const entity = await api.get(`/v1/space/${id}`);
const normalized = normalizeEntityAccess(entity);
// shared_members is now always [id1, id2, ...]
// member_roles is now always { id1: role, id2: role, ... }
```

## API Endpoints

### Update Entity Access

```
PUT /v1/space/access?id={spaceId}
{
  "shared_members": ["user-1", "user-2"],     // User IDs only
  "shared_teams": ["team-1"],                 // Team IDs only
  "member_roles": {                           // Roles separated
    "user-1": "manager",
    "user-2": "contributor"
  },
  "team_roles": {
    "team-1": "manager"
  }
}
```

## Migration from Old Format

Old format (mixed):
```js
shared_members: [
  { user_id: "id1", role: "manager" },
  { user_id: "id2", role: "contributor" }
]
```

Gets automatically converted to:
```js
shared_members: ["id1", "id2"],
member_roles: { id1: "manager", id2: "contributor" }
```

Use `normalizeEntityAccess()` to handle both formats transparently.

## Best Practices

1. **Always use helper functions** — don't directly manipulate `shared_members` or `member_roles`
2. **Normalize data on load** — use `normalizeEntityAccess()` when fetching from API
3. **Build payloads properly** — use `buildAccessUpdatePayload()` when sending to API
4. **Never mix access and roles** — they are separate concerns
5. **Check access, then check role** — access first, then check what they can do
