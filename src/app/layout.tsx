import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Party Arena – Multiplayer Bingo, Dots & Boxes, Paper Gun Battle',
  description:
    'Real-time multiplayer party game platform with Bingo 25, Dots & Boxes, and Paper Gun Battle.',
  openGraph: {
    title: 'Party Arena – Multiplayer Party Games',
    description:
      'Real-time multiplayer party game platform with Bingo 25, Dots & Boxes, and Paper Gun Battle.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
