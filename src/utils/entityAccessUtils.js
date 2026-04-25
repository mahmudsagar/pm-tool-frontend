/**
 * Utility functions for managing entity access and roles
 * Keeps access (shared_members) and roles (member_roles) completely separate
 */

/**
 * Get a user's role in an entity
 * @param {Object} entity - The entity (space, board, etc.)
 * @param {string} userId - The user ID
 * @returns {string|null} Role ('manager', 'contributor', 'viewer') or null
 */
export const getUserRoleInEntity = (entity, userId) => {
  if (!entity) return null;
  
  // Owner always has implicit manager role
  if (entity.user_id === userId) return 'manager';
  
  // Check member_roles field (new format) — roles are stored separately
  if (entity.member_roles && typeof entity.member_roles === 'object') {
    return entity.member_roles[userId] || null;
  }
  
  return null;
};

/**
 * Check if a user has access to an entity
 * @param {Object} entity - The entity (space, board, etc.)
 * @param {string} userId - The user ID
 * @returns {boolean} True if user has access
 */
export const userHasAccessToEntity = (entity, userId) => {
  if (!entity) return false;
  
  // Owner always has access
  if (entity.user_id === userId) return true;
  
  // Check if user is in shared_members (simple array of IDs)
  if (Array.isArray(entity.shared_members)) {
    // shared_members should ONLY contain user IDs (strings), never objects
    return entity.shared_members.includes(userId);
  }
  
  return false;
};

/**
 * Get all members with their roles in an entity
 * @param {Object} entity - The entity (space, board, etc.)
 * @returns {Array} Array of { userId, role } objects
 */
export const getEntityMembersWithRoles = (entity) => {
  if (!entity || !Array.isArray(entity.shared_members)) return [];
  
  return entity.shared_members.map(userId => ({
    userId,
    role: entity.member_roles?.[userId] || 'viewer'
  }));
};

/**
 * Normalize old format (objects with user_id/role) to new format (separate arrays)
 * @param {Object} entity - The entity to normalize
 * @returns {Object} Normalized entity
 */
export const normalizeEntityAccess = (entity) => {
  if (!entity) return entity;
  
  const normalized = { ...entity };
  
  // Handle shared_members: convert old format to new
  if (Array.isArray(normalized.shared_members)) {
    const memberIds = [];
    const memberRoles = { ...normalized.member_roles } || {};
    
    for (const member of normalized.shared_members) {
      if (typeof member === 'string') {
        // Already new format (just ID)
        memberIds.push(member);
      } else if (typeof member === 'object' && member.user_id) {
        // Old format: { user_id, role }
        memberIds.push(member.user_id);
        if (member.role) {
          memberRoles[member.user_id] = member.role;
        }
      }
    }
    
    normalized.shared_members = memberIds;
    normalized.member_roles = memberRoles;
  }
  
  // Handle shared_teams: convert old format to new
  if (Array.isArray(normalized.shared_teams)) {
    const teamIds = [];
    const teamRoles = { ...normalized.team_roles } || {};
    
    for (const team of normalized.shared_teams) {
      if (typeof team === 'string') {
        // Already new format (just ID)
        teamIds.push(team);
      } else if (typeof team === 'object' && team.team_id) {
        // Old format: { team_id, role }
        teamIds.push(team.team_id);
        if (team.role) {
          teamRoles[team.team_id] = team.role;
        }
      }
    }
    
    normalized.shared_teams = teamIds;
    normalized.team_roles = teamRoles;
  }
  
  return normalized;
};

/**
 * Build a proper access update payload
 * @param {string[]} memberIds - Array of user IDs to share with
 * @param {Object} memberRoles - Map of userId -> role
 * @param {string[]} teamIds - Array of team IDs to share with
 * @param {Object} teamRoles - Map of teamId -> role
 * @returns {Object} Properly formatted payload for API
 */
export const buildAccessUpdatePayload = (memberIds = [], memberRoles = {}, teamIds = [], teamRoles = {}) => {
  return {
    shared_members: Array.isArray(memberIds) ? memberIds : [],
    member_roles: memberRoles || {},
    shared_teams: Array.isArray(teamIds) ? teamIds : [],
    team_roles: teamRoles || {}
  };
};

/**
 * Add a member to an entity's shared access with a role
 * @param {Object} entity - Current entity
 * @param {string} userId - User ID to add
 * @param {string} role - Role to assign ('manager', 'contributor', 'viewer')
 * @returns {Object} Updated entity
 */
export const addMemberToEntity = (entity, userId, role = 'contributor') => {
  if (!entity) return entity;
  
  const updated = { ...entity };
  const sharedMembers = Array.isArray(updated.shared_members) ? [...updated.shared_members] : [];
  const memberRoles = updated.member_roles ? { ...updated.member_roles } : {};
  
  // Add member if not already there
  if (!sharedMembers.includes(userId)) {
    sharedMembers.push(userId);
  }
  
  // Set role (separates from access)
  memberRoles[userId] = role;
  
  updated.shared_members = sharedMembers;
  updated.member_roles = memberRoles;
  
  return updated;
};

/**
 * Remove a member from an entity's shared access
 * @param {Object} entity - Current entity
 * @param {string} userId - User ID to remove
 * @returns {Object} Updated entity
 */
export const removeMemberFromEntity = (entity, userId) => {
  if (!entity) return entity;
  
  const updated = { ...entity };
  const sharedMembers = Array.isArray(updated.shared_members)
    ? updated.shared_members.filter(id => id !== userId)
    : [];
  const memberRoles = { ...updated.member_roles };
  
  // Remove role
  delete memberRoles[userId];
  
  updated.shared_members = sharedMembers;
  updated.member_roles = memberRoles;
  
  return updated;
};

/**
 * Update a member's role in an entity
 * @param {Object} entity - Current entity
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Object} Updated entity
 */
export const updateMemberRoleInEntity = (entity, userId, role) => {
  if (!entity) return entity;
  
  const updated = { ...entity };
  const memberRoles = updated.member_roles ? { ...updated.member_roles } : {};
  
  // Only update role if user has access
  if (Array.isArray(updated.shared_members) && updated.shared_members.includes(userId)) {
    memberRoles[userId] = role;
  }
  
  updated.member_roles = memberRoles;
  
  return updated;
};
