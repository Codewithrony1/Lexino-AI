import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '../../../components/AuthShell';
import { lexinoClerkAppearance } from '../../../lib/clerkAppearance';

export default function SignUpPage() {
  return (
    <AuthShell mode="signup">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/chat"
        appearance={lexinoClerkAppearance}
      />
    </AuthShell>
  );
}
