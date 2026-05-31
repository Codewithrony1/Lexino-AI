import { auth } from '@clerk/nextjs/server';
import { getWebsiteBody } from '../page';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';

export default async function PricingPage() {
  const { userId } = await auth();
  let websiteMarkup = getWebsiteBody();

  if (userId) {
    websiteMarkup = websiteMarkup
      .replaceAll('Experience Lexino AI Now 🚀', 'Go to Chat Dashboard 🚀')
      .replaceAll('Get Started', 'Go to Chat')
      .replaceAll('Get Student Plan', 'Go to Chat')
      .replaceAll('Get Pro Access', 'Go to Chat')
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
