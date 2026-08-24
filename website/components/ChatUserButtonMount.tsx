'use client';

import { UserButton, useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ChatUserButtonMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const { signOut } = useClerk();
  const { isLoaded } = useUser();

  useEffect(() => {
    const SLOT_ID = 'clerkHeaderSlot';

    // The slot is part of the server-rendered chat markup, so it is normally found
    // on the first synchronous check. A MutationObserver covers the case where the
    // chat script swaps the header out later. This replaces a 150ms setInterval
    // that previously ran for the entire lifetime of the page.
    let slotObserver: MutationObserver | null = null;
    let parentObserver: MutationObserver | null = null;

    const disconnectAll = () => {
      slotObserver?.disconnect();
      slotObserver = null;
      parentObserver?.disconnect();
      parentObserver = null;
    };

    const attach = (slot: HTMLElement) => {
      setTarget(slot);
      disconnectAll();

      // Watch only the slot's direct siblings (no subtree) so streaming message
      // updates elsewhere in the DOM never trigger this callback.
      const parent = slot.parentElement;
      if (!parent) return;

      parentObserver = new MutationObserver(() => {
        if (!document.getElementById(SLOT_ID)) {
          setTarget(null);
          disconnectAll();
          waitForSlot();
        }
      });
      parentObserver.observe(parent, { childList: true });
    };

    function waitForSlot() {
      const existing = document.getElementById(SLOT_ID);
      if (existing) {
        attach(existing);
        return;
      }

      slotObserver = new MutationObserver(() => {
        const slot = document.getElementById(SLOT_ID);
        if (slot) attach(slot);
      });
      slotObserver.observe(document.body, { childList: true, subtree: true });
    }

    waitForSlot();

    return disconnectAll;
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
