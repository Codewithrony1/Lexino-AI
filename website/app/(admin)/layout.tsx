import { AppClerkProvider } from '@/components/shared/AppClerkProvider';

// The owner panel renders Clerk's <UserButton> and useUser(), so this group mounts
// the Clerk client. The marketing group deliberately does not.
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>;
}
