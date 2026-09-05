import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { lexinoClerkAppearance } from '@/lib/clerkAppearance';

export default function SignInPage() {
  return (
    <AuthShell mode="signin">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        fallbackRedirectUrl="/chat"
        appearance={lexinoClerkAppearance}
      />
    </AuthShell>
  );
}
