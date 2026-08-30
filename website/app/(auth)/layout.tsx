import { AppClerkProvider } from '@/components/shared/AppClerkProvider';

// /login and /signup render Clerk's <SignIn> / <SignUp>, so this group mounts the
// Clerk client. The marketing group deliberately does not.
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>;
}
