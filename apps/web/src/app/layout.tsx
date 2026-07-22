import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PathIQ — Multiplayer Interview Simulation',
  description:
    'Practice technical interviews with peers in a real-time, gamified simulation platform. Vote on questions, score answers, win awards.',
  keywords: ['interview preparation', 'mock interview', 'peer learning', 'technical interview'],
  openGraph: {
    title: 'PathIQ — Multiplayer Interview Simulation',
    description: 'Practice technical interviews together. Real-time. Competitive. Effective.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
