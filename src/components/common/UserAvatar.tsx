import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface AvatarUser {
  _id?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

function initials(user?: AvatarUser | null) {
  const source = (user?.name || user?.email || '?').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-2xs',
  md: 'size-7 text-2xs',
  lg: 'size-9 text-xs',
  xl: 'size-24 text-2xl',
} as const;

interface UserAvatarProps {
  user?: AvatarUser | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || user.email || 'User'} />}
      <AvatarFallback className="text-[length:inherit]">{initials(user)}</AvatarFallback>
    </Avatar>
  );
}

interface AvatarStackProps {
  users: AvatarUser[];
  max?: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Overlapping avatars with a "+N" overflow chip. */
export function AvatarStack({ users, max = 3, size = 'sm', className }: AvatarStackProps) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className={cn('flex items-center -space-x-1.5', className)}>
      {shown.map((user, i) => (
        <UserAvatar key={user._id ?? i} user={user} size={size} className="ring-2 ring-card" />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            SIZES[size],
            'relative flex items-center justify-center rounded-full bg-muted font-mono text-muted-foreground ring-2 ring-card',
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
