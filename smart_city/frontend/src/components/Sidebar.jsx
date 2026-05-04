import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Terminal, GitMerge, FileText, Database, Radio, Wind, Binary } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const links = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/compiler', label: 'NL Compiler', icon: Terminal },
    { to: '/automata', label: 'Automata', icon: GitMerge },
    { to: '/reports', label: 'AI Reports', icon: FileText },
    { to: '/data', label: 'Explorer', icon: Database },
    { to: '/vehicles', label: 'Vehicles', icon: Radio },
    { to: '/air-quality', label: 'Air Quality', icon: Wind },
    { to: '/lab', label: 'Compiler Lab', icon: Binary },
  ];

  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[80px] hover:w-[240px] h-screen glass-panel border-r border-white/5 flex flex-col z-50 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group overflow-hidden"
    >
      <div className="p-6 flex items-center gap-4 overflow-hidden min-w-[240px]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h1 className="text-xl font-rajdhani font-bold text-white whitespace-nowrap">
            Neo-Sousse
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Smart City</p>
        </div>
      </div>

      <div className="flex-1 px-3 mt-8 space-y-2 overflow-y-auto min-w-[240px]">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-4 px-3.5 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 mt-auto min-w-[240px]">
        <div className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="relative shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Node Active</span>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
