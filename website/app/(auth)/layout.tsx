import { AppClerkProvider } from '@/components/shared/AppClerkProvider';
import './futuristic-auth.css';

// /login and /signup render Clerk's <SignIn> / <SignUp>, so this group mounts the
// Clerk client. The marketing group deliberately does not.
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppClerkProvider>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&family=Reenie+Beanie&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      {children}
    </AppClerkProvider>
  );
}
