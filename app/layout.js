import './globals.css';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-dm-sans'
});

export const metadata = {
  title: 'VirtualTrade — Paper Trading',
  description: 'Practice stock trading with virtual money. Real market data, zero risk.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#00b386',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
