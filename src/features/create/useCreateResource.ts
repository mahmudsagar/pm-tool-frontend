import { useCallback } from 'react';
import useAuthStore from '@/stores/useAuthStore';
import { useCreateBoard, useCreateDocument, useCreateFolder, useCreateGroup } from '@/hooks/mutations/useFilesMutations';
import { buildScrumBoardCustomMeta, defaultScrumSavedView } from '@/components/elements/dataView/scrum/scrumBoardConstants';
import { useInvalidateSpaceData } from '@/features/spaces/queries';
import { entityPath, type EntityKind } from '@/features/spaces/entity';

export type CreatableKind = Exclude<EntityKind, 'space'>;

export interface ContainerRef {
  type: 'space' | 'folder' | 'group';
  id: string;
}

export interface CreateResourceInput {
  kind: CreatableKind;
  title: string;
  parent: ContainerRef;
  /** Privacy of the space the item lands in; private boards always include their creator. */
  isPrivate?: boolean;
  sharedMembers?: string[];
  sharedTeams?: string[];
}

export interface CreatedResource {
  id: string;
  kind: CreatableKind;
  path: string;
}

const DATABOARD_FIELDS = [
  {
    type: 'select', initialized: true, label: 'Status', name: 'status', hasOptions: true,
    options: [
      { label: 'To Do', value: 'todo' },
      { label: 'In Progress', value: 'in-progress' },
      { label: 'Review', value: 'review' },
      { label: 'Done', value: 'done' },
    ],
  },
  { type: 'dynamic-select', initialized: true, label: 'Assignee', name: 'assignee', hasOptions: true, source: 'board-members' },
  {
    type: 'select', initialized: true, label: 'Priority', name: 'priority', hasOptions: true,
    options: [
      { label: 'Urgent', value: 'urgent' },
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
    ],
  },
  { type: 'input', initialized: true, label: 'Type', name: 'type', hasOptions: false },
  { type: 'daterange', initialized: true, label: 'Dates', name: 'dates', hasOptions: false },
];

function parentIds(parent: ContainerRef) {
  return {
    space_id: parent.type === 'space' ? parent.id : '',
    folder_id: parent.type === 'folder' ? parent.id : '',
    group_id: parent.type === 'group' ? parent.id : '',
  };
}

// The mutation hooks are untyped JS; give their mutateAsync a usable signature.
type AnyMutateAsync = (variables: Record<string, unknown>) => Promise<unknown>;
const run = (mutation: { mutateAsync: unknown }, variables: Record<string, unknown>) =>
  (mutation.mutateAsync as AnyMutateAsync)(variables);

function idOf(result: unknown): string {
  const data = (result as { data?: unknown })?.data ?? result;
  const record = Array.isArray(data) ? data[0] : data;
  return String((record as { _id?: string })?._id ?? '');
}

/** One entry point for creating any resource; used by the create dialog, hub tiles and sidebar. */
export function useCreateResource() {
  const user = useAuthStore((s) => s.user);
  const createDocument = useCreateDocument();
  const createBoard = useCreateBoard();
  const createFolder = useCreateFolder();
  const createGroup = useCreateGroup();
  const invalidateSpaceData = useInvalidateSpaceData();

  const isPending = createDocument.isPending || createBoard.isPending || createFolder.isPending || createGroup.isPending;

  const create = useCallback(
    async ({ kind, title, parent, isPrivate = false, sharedMembers = [], sharedTeams = [] }: CreateResourceInput): Promise<CreatedResource> => {
      const userId = user?._id;
      if (!userId) throw new Error('You need to be signed in.');
      const ids = parentIds(parent);
      let result: unknown;

      if (kind === 'board' || kind === 'scrum') {
        const members = isPrivate ? Array.from(new Set([...sharedMembers, userId])) : sharedMembers;
        const base = {
          name: title,
          description: `${kind === 'scrum' ? 'Scrum board' : 'Board'}: ${title}`,
          user_id: userId,
          is_private: isPrivate,
          shared_members: members,
          shared_teams: sharedTeams,
          ...ids,
        };
        result = await run(createBoard,
          kind === 'scrum'
            ? { ...base, custom_meta: buildScrumBoardCustomMeta(), saved_view: defaultScrumSavedView() }
            : { ...base, custom_meta: { fields: DATABOARD_FIELDS } },
        );
      } else if (kind === 'folder' || kind === 'group') {
        const mutation = kind === 'folder' ? createFolder : createGroup;
        result = await run(mutation, {
          user_id: userId,
          entity_type: kind,
          name: title,
          shared_members: sharedMembers,
          shared_teams: sharedTeams,
          ...ids,
        });
      } else {
        result = await run(createDocument, {
          user_id: userId,
          title,
          page_type: kind,
          entity_type: 'page',
          content: { text: '' },
          summary: '',
          last_updated_by: userId,
          custom_meta: { author: user?.name || user?.email || '' },
          attachments: [],
          shared_members: sharedMembers,
          shared_teams: sharedTeams,
          ...ids,
        });
      }

      await invalidateSpaceData();
      const id = idOf(result);
      const entityType = kind === 'board' || kind === 'scrum' ? 'board' : kind === 'folder' || kind === 'group' ? kind : 'page';
      return { id, kind, path: entityPath({ _id: id, entity_type: entityType, page_type: kind }) };
    },
    [user, createBoard, createDocument, createFolder, createGroup, invalidateSpaceData],
  );

  return { create, isPending };
}
