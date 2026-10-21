import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "Realtime chat: Next.js client and a self-hosted Express, Socket.io and MongoDB API with idempotent sends and replay on reconnect.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ping.tahsiniftekhar.com"),
  title: {
    default: "Ping — Realtime chat",
    template: "%s — Ping",
  },
  description,
  applicationName: "Ping",
  openGraph: {
    title: "Ping — Realtime chat",
    description,
    url: "/",
    siteName: "Ping",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ping — Realtime chat",
    description,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>{children}</SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
