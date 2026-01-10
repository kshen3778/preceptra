import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "./components/LayoutWrapper";
import { authClient } from '@/lib/auth/client';
import { NeonAuthUIProvider, UserButton } from '@neondatabase/auth/react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Preceptra by MLink",
  description: "Task-based video transcription, SOP consolidation, and RAG-driven question answering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/"
          emailOTP
        >
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
