import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GW ZBT Treasury',
  description: 'GW ZBT Chapter budget and dues management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zbt-navy-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
