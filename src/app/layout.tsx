import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Briefly - Sleek URL Shortener',
  description: 'Shorten your links. Track your clicks. Beautifully simple.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
