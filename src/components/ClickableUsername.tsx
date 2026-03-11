import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

interface Props {
  userId: string;
  username: string;
  className?: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
}

export function ClickableUsername({ userId, username, className, avatarUrl, showAvatar }: Props) {
  const { user } = useAuthStore();
  const isOwnProfile = user?.id === userId;

  return (
    <Link
      to={isOwnProfile ? '/profile' : `/profile/${userId}`}
      className={cn(
        "font-black hover:underline transition-colors hover:text-blue-500",
        className
      )}
      onClick={e => e.stopPropagation()}
    >
      {showAvatar && (
        <span className="inline-flex items-center gap-2">
          {avatarUrl
            ? <img src={avatarUrl} className="w-5 h-5 rounded-full inline" />
            : <span className="w-5 h-5 rounded-full bg-blue-400 inline-flex items-center justify-center text-[10px] font-black text-white">{username?.[0]?.toUpperCase()}</span>
          }
          {username}
        </span>
      )}
      {!showAvatar && username}
    </Link>
  );
}
