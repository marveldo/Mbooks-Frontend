import type { Metadata } from "next";
import { Inter, Zilla_Slab } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeScript } from "@/lib/theme";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const zilla = Zilla_Slab({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-zilla" });

export const metadata: Metadata = {
  title: { default: "Mbooks", template: "%s · Mbooks" },
  description: "An independent bookshop online. Browse the catalog, keep every book you buy in your library, and publish your own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by themeScript before React loads, hence suppressHydrationWarning
    <html lang="en" className={`${inter.variable} ${zilla.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <Nav />
              <main className="flex-1">{children}</main>
              <Footer />
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
