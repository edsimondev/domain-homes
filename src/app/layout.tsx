import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ChatWidget from '@/components/chat/ChatWidget'

export const metadata: Metadata = {
  title: { default: 'Domaine — Premium Real Estate', template: '%s | Domaine' },
  description: 'Domaine — Premium real estate. Curated properties, expert agents, and intelligent tools to find where you truly belong.',
  keywords: ['real estate', 'luxury homes', 'property listings', 'homes for sale', 'real estate agent'],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        {children}
        <ChatWidget />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#372308',
              color: '#F5F0E8',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '13px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
