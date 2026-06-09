import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans, DM_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: { default: 'PrintFlow — Smart Print Order Management', template: '%s | PrintFlow' },
  description:
    'The modern way for university print shops to manage orders. Students submit with all details, owners print without chaos.',
  keywords: ['print shop', 'order management', 'university printing', 'print queue'],
  openGraph: {
    title: 'PrintFlow',
    description: 'Smart print order management for university shops',
    type: 'website',
    url: 'https://printflow.app',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="font-sans bg-stone-50 text-stone-900 antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 40px rgba(27,58,92,0.12)',
            },
            success: { iconTheme: { primary: '#27AE60', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#E74C3C', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
