import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-105' 
        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800'
    }`}
  >
    <Icon size={24} />
    <span className="text-[10px] mt-1 font-medium uppercase tracking-wider">{label}</span>
  </button>
);

export default NavButton;
