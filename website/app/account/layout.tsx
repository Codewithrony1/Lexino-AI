import { ClerkAuthProvider } from '../../components/ClerkAuthProvider';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
