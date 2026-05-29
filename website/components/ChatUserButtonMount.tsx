'use client';

import { UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ChatUserButtonMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('clerkHeaderSlot'));
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="clerk-header-user">
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            userButtonAvatarBox: 'clerk-header-avatar',
            userButtonPopoverCard: 'clerk-header-popover',
          },
        }}
      />
    </div>,
    target
  );
}
