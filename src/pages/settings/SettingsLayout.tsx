import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/settings', label: 'Profile', end: true },
  { to: '/settings/workspace', label: 'Workspace' },
  { to: '/settings/spaces', label: 'Spaces' },
  { to: '/settings/members', label: 'Members & roles' },
  { to: '/settings/teams', label: 'Teams' },
];

/** Settings sub-layout: underline tab bar inside the main shell. */
export default function SettingsLayout() {
  return (
    <div className="min-h-full">
      <nav
        aria-label="Settings"
        className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-[1360px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                  isActive ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </div>
    </div>
  );
}
