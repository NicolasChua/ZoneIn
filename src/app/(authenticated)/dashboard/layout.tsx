/**
 * @description
 * This is the root layout for the entire Next.js application. It sets up the global HTML structure,
 * Clerk authentication provider, theme provider, and all necessary context providers.
 *
 * @dependencies
 * - next/font: For font optimization with Geist Sans and Geist Mono.
 * - next-themes: For handling light/dark mode.
 * - @clerk/nextjs: For authentication context.
 * - sonner: For displaying toast notifications (Sonner style).
 * - @/components/ui/toaster: For displaying toast notifications (classic shadcn/ui style).
 * - @/components/ui/tooltip: For tooltip context.
 * - @/providers/OpenAIProvider: Context for OpenAI API interactions.
 * - @/providers/ChicagoCityProvider: Context for Chicago City API interactions.
 * - @/features/billing/components/checkout-redirect: A client component to handle post-auth redirects to Stripe.
 * - @/components/utility/tailwind-indicator: A development utility to show the current breakpoint.
 *
 * @notes
 * - It includes both `Sonner` and `Toaster` to support both notification styles used in the merged codebase.
 * - The main application content (`children`) is wrapped in all necessary providers here.
 */
import { CheckoutRedirect } from "@/features/billing/components/checkout-redirect";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TailwindIndicator } from "@/components/utility/tailwind-indicator";
import { ChicagoCityProvider } from "@/app/providers/ChicagoCityProvider"; // Corrected path
import { OpenAIProvider } from "@/app/providers/OpenAIProvider"; // Corrected path
import { ClerkProvider } from "@clerk/nextjs";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";
import "./globals.css";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Zone In - Chicago Zoning Reports",
  description: "Get instant, easy-to-understand zoning reports for any property in Chicago.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <TooltipProvider>
              <ChicagoCityProvider>
                <OpenAIProvider>
                  {children}
                  <CheckoutRedirect />
                  <TailwindIndicator />
                  <SonnerToaster />
                  <ShadcnToaster />
                </OpenAIProvider>
              </ChicagoCityProvider>
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
