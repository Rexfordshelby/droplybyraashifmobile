import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      {showFooter && <Footer />}
      <MobileBottomNav />
    </div>
  );
}
