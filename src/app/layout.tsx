import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from "@/components/ui/tooltip" 
import './globals.css'

import { ThemeProvider as NextThemesProvider } from "@/components/theme-provider"
import { ThemeProvider as ThemeConfigProvider } from "@/components/theme/theme-provider"
import { THEMES } from "@/lib/registry/theme"

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
  icons: {
    // favicon.svg: white logo on dark background — always readable in browser tabs
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    // Apple touch / share sheet icon uses the full-color logo
    apple: '/logo.svg',
    shortcut: '/favicon.svg',
  },
}

// Serialise theme data at build-time so the inline script has it without a fetch
const THEMES_JSON = JSON.stringify(
  THEMES.map((t) => ({ id: t.id, light: t.light, dark: t.dark }))
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/*
            Inline blocking script — executes synchronously before the first paint.
            Reads the saved theme from localStorage and applies all CSS variables
            immediately to <html>, so there is zero flash-of-wrong-styles after reload.
            This is what fixes Amethyst dark-mode navbar text colors persisting on reload.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){
  try {
    var themes = ${THEMES_JSON};
    var savedId = localStorage.getItem('user-custom-theme');
    if (!savedId) return;
    var theme = themes.find(function(t){ return t.id === savedId; });
    if (!theme) return;
    // next-themes stores 'light'|'dark'|'system' under the key 'theme'
    var nextPref = localStorage.getItem('theme');
    var isDark = nextPref === 'dark'
      || (nextPref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var vars = isDark ? theme.dark : theme.light;
    var root = document.documentElement;
    Object.keys(vars).forEach(function(key){
      root.style.setProperty('--' + key, vars[key]);
    });
  } catch(e) {}
})();`
            }}
          />
        </head>
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