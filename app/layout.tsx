import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Our Little LA Guide',
  description: 'A little plan for us',
  applicationName: 'Our Little LA Guide',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Our LA Guide' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: '#f8f3ee', width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="manifest" href="/manifest.webmanifest" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /></head><body>{children}</body></html>;
}
