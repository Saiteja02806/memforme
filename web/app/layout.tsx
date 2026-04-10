import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Memforme',
  description: 'Cross-model memory — dashboard, MCP tokens, and ChatGPT connector setup',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
