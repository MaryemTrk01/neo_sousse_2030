import {
    LayoutDashboard,
    Cpu,
    Wrench,
    Wind,
    Terminal,
    FileText,
    GitBranch,
    MessageSquare,
    Car,
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

export default function Sidebar({
    activePage,
    setActivePage,
    alertsCount = 0,
    vehiculesPanne = 0,
}) {
    return (
        <div className="w-64 h-screen bg-[#0d1324] border-r border-white/10 flex flex-col fixed left-0 top-0 z-50 shadow-[20px_0_60px_rgba(0,0,0,0.35)]">
            {/* Logo */}
            <div className="p-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center shadow-lg shadow-purple-500/30 pulse-sea">
                        <Cpu className="text-white w-7 h-7" />
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-white tracking-tighter">
                            NEO-SOUSSE
                        </h1>

                        <p className="text-[10px] text-purple-300 font-black uppercase tracking-[0.2em]">
                            Smart City 2030
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;

                    const badge =
                        item.id === 'dashboard' && alertsCount > 0
                            ? alertsCount
                            : item.id === 'vehicules' && vehiculesPanne > 0
                            ? vehiculesPanne
                            : null;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 transition-all duration-300 group relative ${
                                isActive
                                    ? 'bg-gradient-to-r from-purple-500/25 to-pink-500/10 text-white font-bold shadow-[0_0_24px_rgba(168,85,247,0.18)] border border-purple-500/20'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav-indicator"
                                    className="absolute left-0 w-1.5 h-7 bg-gradient-to-b from-purple-400 to-pink-500 rounded-r-full"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                />
                            )}

                            <Icon
                                className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                                    isActive
                                        ? 'text-purple-300'
                                        : 'group-hover:text-white'
                                }`}
                            />

                            <span className="text-[0.9rem]">
                                {item.label}
                            </span>

                            {badge && (
                                <span
                                    className={`ml-auto w-5 h-5 flex items-center justify-center rounded-lg text-white text-[10px] font-bold shadow-lg ${
                                        item.id === 'vehicules'
                                            ? 'bg-gradient-to-br from-orange-400 to-pink-500'
                                            : 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse'
                                    }`}
                                >
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}