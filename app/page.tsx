import type { Metadata } from 'next';

import HomeClient from '@/components/features/home-client';

import { resolveSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_NAME,
    url: '/',
  },
  twitter: {
    title: SITE_NAME,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: resolveSiteUrl().toString(),
  applicationCategory: 'Utility',
  operatingSystem: 'All',
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\u003c'),
        }}
      />
      <HomeClient />
    </>
  );
}
