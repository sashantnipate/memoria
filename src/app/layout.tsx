import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from "@/components/ui/tooltip" 
import './globals.css'

import { ThemeProvider as NextThemesProvider } from "@/components/theme-provider"
import { ThemeProvider as ThemeConfigProvider } from "@/components/theme/theme-provider"

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Memoria',
  description: 'Memoria - AI Powered Memory App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          
          <NextThemesProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            <ThemeConfigProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </ThemeConfigProvider>
          </NextThemesProvider>
          
        </body>
      </html>
    </ClerkProvider>
  )
}