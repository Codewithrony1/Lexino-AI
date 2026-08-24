import { ClerkAuthProvider } from '../../components/ClerkAuthProvider';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
