import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isContainerKind, type EntityKind } from '@/features/spaces/entity';
import { withTabActive } from './peekUrl';

type OpenEvent = { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } | undefined;

/**
 * Opening items from the main content area: pages open in the side peek over
 * the current page; folders, groups and spaces navigate. Cmd/Ctrl/Shift-click
 * opens the full page instead.
 */
export function useOpenEntity() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (href: string, kind: EntityKind, event?: OpenEvent) => {
      if (isContainerKind(kind) || event?.metaKey || event?.ctrlKey || event?.shiftKey) return navigate(href);
      navigate({ pathname: location.pathname, search: withTabActive(location.search, href) });
    },
    [navigate, location.pathname, location.search],
  );
}
