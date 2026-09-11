import { NavLink } from 'react-router-dom';
import type { BottomNavItem } from '../../data/portalNav';

export function BottomNav({ items, label }: { items: BottomNavItem[]; label: string }) {
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <ul className="grid grid-cols-6">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center px-1 text-center text-[11px] font-semibold ${isActive ? 'bg-navy text-white' : 'text-navy'}`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
