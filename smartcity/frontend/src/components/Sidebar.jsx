import {
    LayoutDashboard, Cpu, Wrench, Wind, Terminal,
    FileText, GitBranch,
    MessageSquare, Car
} from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'capteurs', label: 'Capteurs', icon: Cpu },
    { id: 'vehicules', label: 'Véhicules', icon: Car },
    { id: 'interventions', label: 'Maintenance', icon: Wrench },
    { id: 'air', label: 'Qualité Air', icon: Wind },
    { id: 'compiler', label: 'Compilateur NL', icon: Terminal },
    { id: 'reports', label: 'Rapports IA', icon: FileText },
    { id: 'automates', label: 'Automates', icon: GitBranch },
    { id: 'chat', label: 'ARIA Chat', icon: MessageSquare },
];

export default function Sidebar({ activePage, setActivePage, alertsCount = 0, vehiculesPanne = 0 }) {
    return (
        <div className="w-64 h-screen neo-glass border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0077be] to-[#40e0d0] flex items-center justify-center shadow-lg shadow-blue-500/20 pulse-sea">
                        <Cpu className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tighter">NEO-SOUSSE</h1>
                        <p className="text-[10px] text-turquoise font-bold uppercase tracking-[0.2em]">Smart City 2030</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;

                    const badge =
                        item.id === 'dashboard' && alertsCount > 0 ? alertsCount :
                            item.id === 'vehicules' && vehiculesPanne > 0 ? vehiculesPanne :
                                null;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 transition-all duration-300 group relative ${isActive
                                    ? 'bg-blue-500/10 text-white font-bold shadow-sm'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav-indicator"
                                    className="absolute left-0 w-1.5 h-7 bg-turquoise rounded-r-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-turquoise' : 'group-hover:text-white'}`} />
                            <span className="text-[0.9rem]">{item.label}</span>

                            {badge && (
                                <span className={`ml-auto w-5 h-5 flex items-center justify-center rounded-lg text-white text-[10px] font-bold shadow-lg ${item.id === 'vehicules' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}>
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="p-6 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-4 p-4 neo-card bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-turquoise/30 flex items-center justify-center border border-white/10">
                        <MessageSquare className="w-5 h-5 text-turquoise" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">ARIA 3.2</p>
                        <div className="flex items-center gap-1.5">
                            <span className="status-dot bg-turquoise animate-pulse"></span>
                            <p className="text-[10px] text-turquoise/80 font-semibold uppercase">IA Active</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
