import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NovaNotes — Collaborative Workspace & Knowledge Platform',
  description:
    'An independent, production-grade productivity platform with hierarchical block editing, multi-view relational databases, and offline-first persistence.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
