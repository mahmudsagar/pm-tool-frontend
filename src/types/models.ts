// Shapes returned by the API server. Fields the UI does not rely on are left open.

export type EntityId = string;

export interface User {
  _id: EntityId;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  google_id?: string;
  github_id?: string;
  workspaces_flag?: boolean;
  [key: string]: unknown;
}

export type WorkspaceRole = 'owner' | 'member';

export interface Workspace {
  _id: EntityId;
  name: string;
  owner_id: EntityId;
  members?: EntityId[];
  role?: WorkspaceRole;
  [key: string]: unknown;
}

export type EntityType = 'space' | 'folder' | 'group' | 'page' | 'board';
export type PageType = 'document' | 'sheet' | 'whiteboard' | 'board' | 'scrum';

/** A node in the space tree: folder, group, board or page. */
export interface SpaceChild {
  _id: EntityId;
  entity_type: EntityType;
  name?: string;
  title?: string;
  page_type?: PageType;
  space_id?: EntityId;
  folder_id?: EntityId | null;
  group_id?: EntityId | null;
  parent_id?: EntityId | null;
  user_id?: EntityId;
  pinned?: boolean;
  is_private?: boolean;
  createdAt?: string;
  updatedAt?: string;
  childs?: SpaceChild[];
  [key: string]: unknown;
}

export interface Space {
  _id: EntityId;
  entity_type: 'space';
  name: string;
  is_private?: boolean;
  user_id?: EntityId;
  workspace_id?: EntityId;
  pinned?: boolean;
  childs: SpaceChild[];
  [key: string]: unknown;
}

export interface AuthPayload {
  token?: string;
  user_info: User;
  workspaces?: Workspace[];
  expires_at?: string;
}
