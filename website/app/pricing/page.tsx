import { auth } from '@clerk/nextjs/server';
import { getWebsiteBody } from '../page';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';

export default async function PricingPage() {
  const { userId } = await auth();
  let websiteMarkup = getWebsiteBody();

  if (userId) {
    websiteMarkup = websiteMarkup
      .replaceAll('Experience Lexino AI Now 🚀', 'Go to Chat Dashboard 🚀')
      .replaceAll('onclick="navigateToTry()">Get Started</button>', 'onclick="window.location.href=\'/chat\'">Go to Chat</button>')
      .replaceAll('onclick="navigateToTry()">Get Student Plan</button>', 'onclick="openCheckout(\'student\')">Upgrade to Student</button>')
      .replaceAll('onclick="navigateToTry()">Get Pro Access</button>', 'onclick="openCheckout(\'pro\')">Upgrade to Pro</button>')
      .replaceAll('navigateToTry()', "window.location.href='/chat'");
  }

  return (
    <>
      <link rel="stylesheet" href="/lexino-website/styles.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteMarkup }} />
      <ClientScriptLoader scripts={['/lexino-website/script.js']} />
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', () => {
              setTimeout(() => {
                const pricing = document.getElementById('pricing');
                if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
              }, 150);
            });
          `,
        }}
      />
    </>
  );
}
