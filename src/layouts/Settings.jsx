import { Outlet, useLocation } from 'react-router-dom';
import Link from '@/BetterRouter/Link';
import { cn } from '@/lib/utils';
import { User, Building2, Users, UsersRound } from 'lucide-react';

const settingsNav = [
  { path: '/settings', label: 'Profile', icon: User, exact: true },
  { path: '/settings/workspace', label: 'Workspace', icon: Building2 },
  { path: '/settings/members', label: 'Members', icon: Users },
  { path: '/settings/teams', label: 'Teams', icon: UsersRound },
];

const Settings = () => {
  const location = useLocation();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      {/* Tab nav */}
      <nav className="flex gap-1 border-b mb-8">
        {settingsNav.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path || location.pathname === '/settings/'
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
};

export default Settings;
