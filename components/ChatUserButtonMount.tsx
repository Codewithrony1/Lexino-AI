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
      window.location.href = '/login';
    };
    
    return () => {
      delete (window as any).clerkSignOut;
    };
  }, [signOut]);

  if (!target) return null;

  return createPortal(
    <div className="clerk-header-user">
      {!isLoaded ? (
        <div className="clerk-loading-skeleton" />
      ) : (
        <UserButton
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
