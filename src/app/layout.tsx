import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// Static title on purpose: page titles must never contain patient data.
export const metadata: Metadata = {
  title: "HMS",
  description: "Hospital Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${publicSans.variable}`}>
      <body className="bg-background font-body text-ink antialiased">
        <ToastProvider>
          <NavigationProgress>
            <main>{children}</main>
          </NavigationProgress>
        </ToastProvider>
      </body>
    </html>
  );
}
