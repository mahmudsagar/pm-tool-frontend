import { describe, expect, it } from 'vitest';
import { buildSpaceTree } from './queries';
import type { Space } from '@/types/models';

const space = (overrides: Partial<Space>): Space => ({
  _id: 'space',
  entity_type: 'space',
  name: 'Space',
  childs: [],
  ...overrides,
});

describe('buildSpaceTree', () => {
  const tree = buildSpaceTree([
    space({
      _id: 'priv',
      name: 'Mine',
      is_private: true,
      childs: [
        { _id: 'f1', entity_type: 'folder', name: 'Plans', is_private: false, updatedAt: '2026-01-01T00:00:00Z' },
        { _id: 'd1', entity_type: 'page', title: 'Notes', page_type: 'document', pinned: true, updatedAt: '2026-03-01T00:00:00Z' },
      ],
    }),
    space({ _id: 'team', name: 'Team', is_private: false, pinned: false }),
    space({ _id: 'team2', name: 'Pinned team', is_private: false, pinned: true }),
  ]);

  it('splits spaces by privacy and puts pinned spaces first', () => {
    expect(tree.privateSpaces.map((s) => s._id)).toEqual(['priv']);
    expect(tree.publicSpaces.map((s) => s._id)).toEqual(['team2', 'team']);
  });

  it('orders children pinned-first within a space', () => {
    expect(tree.privateSpaces[0].childs.map((c) => c._id)).toEqual(['d1', 'f1']);
  });

  it('makes children of a private space private', () => {
    expect(tree.privateSpaces[0].childs.every((c) => c.is_private)).toBe(true);
    expect(tree.files.find((f) => f.id === 'f1')?.sharing).toBe('Private');
  });

  it('lists every direct child as a file row, newest first, with its space name', () => {
    expect(tree.files.map((f) => f.id)).toEqual(['d1', 'f1']);
    expect(tree.files[0]).toMatchObject({ type: 'page', name: 'Notes', kind: 'document', typeLabel: 'Document', spaceName: 'Mine', path: 'Mine', href: '/document/d1', pinned: true });
    expect(tree.files[1]).toMatchObject({ type: 'folder', name: 'Plans', typeLabel: 'Folder' });
  });

  it('handles an empty workspace', () => {
    expect(buildSpaceTree([])).toMatchObject({ spaces: [], privateSpaces: [], publicSpaces: [], files: [] });
  });
});
