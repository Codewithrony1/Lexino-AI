import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '../../../components/AuthShell';
import { lexinoClerkAppearance } from '../../../lib/clerkAppearance';

export default function SignInPage() {
  return (
    <AuthShell mode="signin">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/chat"
        appearance={lexinoClerkAppearance}
      />
    </AuthShell>
  );
}
