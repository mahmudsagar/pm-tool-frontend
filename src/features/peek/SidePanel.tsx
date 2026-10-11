import { cloneElement, useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { matchRoutes, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, Link2, Maximize2, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeStatus } from '@/lib/realtime/socket';
import { KIND_META, type EntityKind } from '@/features/spaces/entity';
import { routes } from '@/BetterRouter/routes';
import { readPeekTabs, withAllTabsClosed, withTabActive, withTabClosed, type PeekTab } from './peekUrl';
import { useEntityTitle } from './useEntityTitle';

interface TopMenu {
  inlineContent?: ReactNode;
  dropdownContent?: ReactNode;
}

const WIDTH_KEY = 'side-panel-width';
const MIN_WIDTH = 380;
const DEFAULT_WIDTH = 640;

const KIND_TONE: Partial<Record<EntityKind, string>> = {
  sheet: 'text-success-foreground',
  whiteboard: 'text-warning-foreground',
  board: 'text-brand',
  scrum: 'text-brand',
};

const PEEK_LABEL: Partial<Record<EntityKind, string>> = {
  document: 'Doc peek',
  sheet: 'Sheet peek',
  whiteboard: 'Canvas peek',
  folder: 'Folder',
  group: 'Group',
  space: 'Space',
  board: 'Board peek',
  scrum: 'Sprint peek',
};

function readWidth() {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(value) && value >= MIN_WIDTH ? value : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function maxWidth() {
  return Math.max(MIN_WIDTH, Math.min(1100, window.innerWidth - 320));
}

/** Drag the left edge to resize; the width is remembered. */
function useResizableWidth() {
  const [width, setWidth] = useState(readWidth);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setWidth(Math.min(maxWidth(), Math.max(MIN_WIDTH, window.innerWidth - e.clientX)));
  }, []);
  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.userSelect = '';
    setWidth((w) => {
      try {
        localStorage.setItem(WIDTH_KEY, String(w));
      } catch {
        // Not critical.
      }
      return w;
    });
  }, []);

  return { width, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}

function TabButton({ tab, active, onSelect, onClose }: { tab: PeekTab; active: boolean; onSelect: () => void; onClose: () => void }) {
  const { title, kind } = useEntityTitle(tab.section, tab.id);
  const Icon = KIND_META[kind].icon;
  return (
    <div
      role="tab"
      aria-selected={active}
      className={cn(
        'group/tab flex h-9 max-w-[13rem] shrink-0 items-center gap-1.5 border-b-2 pl-2.5 pr-1 text-xs transition-colors',
        active ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-1.5 focus-visible:outline-none">
        <Icon className={cn('size-3.5 shrink-0', KIND_TONE[kind])} />
        <span className="truncate">{title}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title}`}
        className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/tab:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function PanelHeader({ tab, topMenu, onOpenFull, onCloseAll }: { tab: PeekTab; topMenu?: TopMenu; onOpenFull: () => void; onCloseAll: () => void }) {
  const { title, kind } = useEntityTitle(tab.section, tab.id);
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tab.path}`);
      toast({ variant: 'success', title: 'Link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 px-3">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="shrink-0 font-mono text-2xs uppercase tracking-wider text-subtle">{PEEK_LABEL[kind] ?? 'Peek'}</span>
        <span className="text-subtle">/</span>
        <span className="truncate font-medium text-foreground">{title}</span>
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        {topMenu?.inlineContent}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open full page" onClick={onOpenFull}>
              <Maximize2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open full page</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => void copy()}>
              <Link2 /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.open(tab.path, '_blank', 'noopener')}>
              <ExternalLink /> Open in new tab
            </DropdownMenuItem>
            {topMenu?.dropdownContent && (
              <>
                <DropdownMenuSeparator />
                {topMenu.dropdownContent}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={onCloseAll}>
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close panel</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function PanelBody({ tab, onTopMenu }: { tab: PeekTab; onTopMenu: (menu: TopMenu) => void }) {
  const match = matchRoutes(routes as never, tab.path)?.pop();
  const element = (match?.route as { element?: ReactElement } | undefined)?.element;
  const setTopMenu = useCallback((menu: TopMenu) => {
    if (menu && typeof menu === 'object') onTopMenu(menu);
  }, [onTopMenu]);

  if (!element) {
    return <p className="p-6 text-sm text-muted-foreground">This item can&apos;t be shown in the side panel.</p>;
  }
  // Route elements read { id, setTopMenu, peek, peekPath } as props when rendered here.
  return cloneElement(element, { ...(match?.params ?? {}), setTopMenu, peek: true, peekPath: tab.path });
}

/**
 * Right-hand peek panel ("parallel routes"). Every `?<path>=_sidebar` param is a tab;
 * the last one is active. Opening a link with target="_sidebar" adds or activates a tab.
 */
export function SidePanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = readPeekTabs(location.search);
  const active = tabs[tabs.length - 1];
  const { width, handlers } = useResizableWidth();
  const realtime = useRealtimeStatus();
  const [menus, setMenus] = useState<Record<string, TopMenu>>({});

  const go = (search: string) => navigate({ pathname: location.pathname, search }, { replace: true });

  // Forget menus of closed tabs.
  const openPaths = tabs.map((t) => t.path).join('|');
  useEffect(() => {
    setMenus((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => openPaths.split('|').includes(path))));
  }, [openPaths]);

  const setMenuFor = useCallback((path: string) => (menu: TopMenu) => setMenus((prev) => ({ ...prev, [path]: menu })), []);
  const activeMenuSetter = useCallback((menu: TopMenu) => active && setMenuFor(active.path)(menu), [active, setMenuFor]);

  if (!active) return null;

  const openFull = () => {
    // Going full page dismisses the panel; other tabs would cover the page.
    const params = new URLSearchParams(withAllTabsClosed(location.search));
    navigate({ pathname: active.path, search: params.toString() ? `?${params}` : '' });
  };

  return (
    <aside
      aria-label="Side panel"
      className="fixed inset-0 z-40 flex flex-col border-l border-border bg-surface shadow-overlay animate-in slide-in-from-right-8 fade-in-0 duration-200 lg:inset-y-0 lg:left-auto lg:top-14 lg:w-[min(var(--panel-w),calc(100vw-320px))]"
      style={{ '--panel-w': `${width}px` } as React.CSSProperties}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        className="absolute inset-y-0 -left-1 hidden w-2 cursor-col-resize lg:block [&:hover>span]:bg-brand/50"
        {...handlers}
      >
        <span className="absolute inset-y-0 left-1 w-px bg-transparent transition-colors" />
      </div>

      <PanelHeader tab={active} topMenu={menus[active.path]} onOpenFull={openFull} onCloseAll={() => go(withAllTabsClosed(location.search))} />

      <div role="tablist" aria-label="Open items" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-1 [scrollbar-width:none]">
        {tabs.map((tab) => (
          <TabButton
            key={tab.path}
            tab={tab}
            active={tab.path === active.path}
            onSelect={() => go(withTabActive(location.search, tab.path))}
            onClose={() => go(withTabClosed(location.search, tab.path))}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" key={active.path}>
        <PanelBody tab={active} onTopMenu={activeMenuSetter} />
      </div>

      <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border px-3">
        <Button variant="ghost" size="xs" onClick={openFull}>
          <Maximize2 /> Open full page
        </Button>
        <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className={cn('size-1.5 rounded-full', realtime === 'connected' ? 'bg-success' : 'bg-warning')} />
          {realtime === 'connected' ? 'Synced' : 'Reconnecting…'}
        </span>
      </footer>
    </aside>
  );
}
