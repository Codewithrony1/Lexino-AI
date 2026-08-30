import { AppClerkProvider } from '@/components/shared/AppClerkProvider';

// /chat, /account and /settings render Clerk components, so this group mounts the
// Clerk client. The marketing group deliberately does not.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>;
}
