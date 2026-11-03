import React, { useState } from 'react';

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-brand-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-700'
];

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name) {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-2xl font-bold'
};

export default function UserAvatar({
  user,
  src,
  name,
  size = 'md',
  className = ''
}) {
  const [imgError, setImgError] = useState(false);

  const photoURL = src || user?.photoURL;
  const displayName = name || user?.displayName || user?.name || 'Student';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getInitials(displayName);
  const gradient = getGradient(displayName);

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-tr ${gradient} text-white font-semibold flex items-center justify-center shrink-0 shadow-sm select-none tracking-wider ${className}`}
      title={displayName}
      aria-label={displayName}
    >
      <span>{initials}</span>
    </div>
  );
}
