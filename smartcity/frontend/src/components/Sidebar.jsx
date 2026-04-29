import React from 'react';
import {
    LayoutDashboard, Cpu, Wrench, Wind, Terminal,
    FlaskConical, FileText, GitBranch, Map as MapIcon,
    MessageSquare, BarChart3, Bell, Car
} from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'capteurs', label: 'État des Capteurs', icon: Cpu },
    { id: 'vehicules', label: 'Véhicules', icon: Car },
    { id: 'interventions', label: 'Interventions', icon: Wrench },
    { id: 'air', label: 'Qualité Air', icon: Wind },
    { id: 'compiler', label: 'Compilateur SQL', icon: Terminal },
    { id: 'lab', label: 'Lab Compilation', icon: FlaskConical },
    { id: 'reports', label: 'Rapports IA', icon: FileText },
    { id: 'automates', label: 'Automates', icon: GitBranch },
    { id: 'map', label: 'Carte Urbaine', icon: MapIcon },
    { id: 'chat', label: 'Chat ARIA', icon: MessageSquare },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
];

export default function Sidebar({ activePage, setActivePage, alertsCount = 0, vehiculesPanne = 0 }) {
    return (
        <div className="w-64 h-screen bg-[#11141d] border-r border-gray-800 flex flex-col fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Cpu className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">NEO-SOUSSE</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Smart City 2030</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;

                    // Badge pour alertes
                    const badge =
                        item.id === 'dashboard' && alertsCount > 0 ? alertsCount :
                            item.id === 'vehicules' && vehiculesPanne > 0 ? vehiculesPanne :
                                null;

                    const badgeColor =
                        item.id === 'vehicules' ? 'bg-amber-500' : 'bg-red-500';

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 group relative ${isActive
                                    ? 'bg-indigo-600/10 text-indigo-400 font-semibold'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full"
                                />
                            )}
                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'group-hover:text-gray-300'}`} />
                            <span className="text-sm">{item.label}</span>

                            {badge && (
                                <span className={`ml-auto w-5 h-5 flex items-center justify-center ${badgeColor} text-white text-[10px] rounded-full animate-pulse`}>
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800">
                <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-white">ARIA Assistant</p>
                        <p className="text-[10px] text-emerald-400">En ligne</p>
                    </div>
                </div>
            </div>
        </div>
    );
}