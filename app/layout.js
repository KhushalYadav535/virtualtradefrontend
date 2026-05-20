import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'VirtualTrade - Paper Trading Platform',
  description: 'Practice stock trading with virtual money. Real market data, zero risk.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}