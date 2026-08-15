import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Implementing Inter font per the Core Design.jpg specification
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewsLens | AI News Analysis",
  description: "A real-time news application that provides AI summaries, key points, weak points and bias analysis for every article.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}