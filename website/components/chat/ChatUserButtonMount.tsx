'use client';

import { UserButton, useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ChatUserButtonMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const { signOut } = useClerk();
  const { isLoaded } = useUser();

  useEffect(() => {
    let currentTarget: HTMLElement | null = null;

    const checkSlot = () => {
      const activeEl = document.getElementById('clerkHeaderSlot');
      if (activeEl) {
        if (activeEl !== currentTarget) {
          currentTarget = activeEl;
          setTarget(activeEl);
        }
      } else {
        if (currentTarget !== null) {
          currentTarget = null;
          setTarget(null);
        }
      }
    };

    // Run check immediately and set a periodic verification loop
    checkSlot();
    const interval = setInterval(checkSlot, 150);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Expose signOut helper globally so script.js can invoke it directly
    (window as any).clerkSignOut = async () => {
      await signOut();
      const isProd = window.location.hostname.endsWith('lexinoai.in');
      if (isProd) {
        document.cookie = '__session=; Domain=.lexinoai.in; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
      }
      window.location.href = isProd ? 'https://accounts.lexinoai.in/login' : '/login';
    };
    
    return () => {
      delete (window as any).clerkSignOut;
    };
  }, [signOut]);

  if (!target) return null;

  const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('lexinoai.in');
  const logoutUrl = isProd ? 'https://accounts.lexinoai.in/login' : '/';

  return createPortal(
    <div className="clerk-header-user">
      {!isLoaded ? (
        <div className="clerk-loading-skeleton" />
      ) : (
        <UserButton
          afterSignOutUrl={logoutUrl}
          appearance={{
            elements: {
              userButtonAvatarBox: 'clerk-header-avatar',
              userButtonPopoverCard: 'clerk-header-popover',
            },
          }}
        />
      )}
    </div>,
    target
  );
}
