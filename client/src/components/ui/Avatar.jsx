import { cn, initials } from '@/utils';

/** Avatar with image fallback to gradient initials */
export function Avatar({ user, size = 'md', className }) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-lg' };
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className={cn('rounded-full object-cover ring-2 ring-white/20', sizes[size], className)} />;
  }
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white font-semibold flex items-center justify-center ring-2 ring-white/20',
      sizes[size], className
    )}>
      {initials(user?.name)}
    </div>
  );
}

/** Stack of overlapping avatars */
export function AvatarGroup({ users = [], max = 4 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => <Avatar key={u._id || u.id} user={u} size="sm" />)}
      {extra > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-xs flex items-center justify-center font-medium ring-2 ring-white/20">
          +{extra}
        </div>
      )}
    </div>
  );
}
