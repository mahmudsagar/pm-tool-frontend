import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import ParallelRoute from '@/BetterRouter/ParallelRoute';
import { useRealtimeConnection } from '@/lib/realtime/socket';
import { useInitAuth } from '@/hooks/queries/useAuthQueries';
import { CommandPalette } from '@/features/search/CommandPalette';
import { CreateResourceDialog } from '@/features/create/CreateResourceDialog';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TopBar, type TopMenu } from './TopBar';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useGlobalShortcuts } from './shortcuts';
import { useAppearanceSync } from '@/features/settings/appearance';
import { useShellState } from './treeState';

/**
 * App layout from the "workspace landing hub" design: fixed sidebar on desktop,
 * drawer below lg, sticky top bar, and page content. Pages add top-bar actions
 * through the outlet context: const [topMenu, setTopMenu] = useOutletContext().
 */
export default function AppShell() {
  // Validate the stored session and refresh user/workspaces from the server.
  useInitAuth();
  useRealtimeConnection();
  useGlobalShortcuts();
  useAppearanceSync();
  const [topMenu, setTopMenu] = useState<TopMenu>({ inlineContent: null, dropdownContent: null });
  const { sidebarOpen, mobileNavOpen, setMobileNavOpen } = useShellState();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>

        <div className={cn('hidden shrink-0 lg:block', !sidebarOpen && 'lg:hidden')}>
          <Sidebar />
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0 [&>.sheet-close-btn]:hidden" closeBtn={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar className="w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar topMenu={topMenu} />
          <main id="main-content" className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet context={[topMenu, setTopMenu]} />
            <ParallelRoute />
          </main>
        </div>

        <CommandPalette />
        <CreateResourceDialog />
        <ShortcutsDialog />
      </div>
    </TooltipProvider>
  );
}
