import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'Arogya — AI-Powered Personal Health Platform',
    template: '%s | Arogya',
  },
  description:
    'Arogya is India\'s AI-powered personal health platform. Track vitals, manage medicines, analyse health documents, and get personalised Ayurvedic insights powered by Nemotron AI.',
  keywords: [
    'health tracking',
    'AI health',
    'India health app',
    'vitals tracker',
    'Ayurveda',
    'medicine reminder',
    'health journal',
    'Arogya',
  ],
  authors: [{ name: 'Arogya Health' }],
  openGraph: {
    title: 'Arogya — AI-Powered Personal Health Platform',
    description: 'Track. Analyse. Heal. Your AI health companion built for India.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arogya — AI Health Platform for India',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
