import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { lexinoClerkAppearance } from '@/lib/clerkAppearance';

export default function SignUpPage() {
  return (
    <AuthShell mode="signup">
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl="/chat"
        fallbackRedirectUrl="/chat"
        appearance={lexinoClerkAppearance}
      />
    </AuthShell>
  );
}
