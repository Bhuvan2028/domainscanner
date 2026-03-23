import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/context/SidebarContext';
import { MainLayout } from '@/components/MainLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ShieldStat - Professional Security Analysis',
  description: 'Real-time threat monitoring and professional risk analysis by ShieldStat',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-[#fcfcfc] text-slate-900 antialiased`} suppressHydrationWarning>
        <SidebarProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </SidebarProvider>
      </body>
    </html>
  );
}
