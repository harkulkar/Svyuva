import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea] text-slate-900">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
