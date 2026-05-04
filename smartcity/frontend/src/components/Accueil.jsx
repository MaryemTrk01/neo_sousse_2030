import React from 'react';
import { motion } from 'framer-motion';
import {
    Cpu,
    Wrench,
    Car,
    AlertTriangle,
    ArrowUpRight,
    ShieldCheck,
    BarChart3,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import { useSocket } from '../SocketContext';

const StatCard = ({ label, value, icon: Icon, color, subValue, trend }) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        className="neo-card p-6 flex flex-col gap-4 relative overflow-hidden group"
    >
        <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${color}-500/10 blur-3xl rounded-full`} />

        <div className="flex justify-between items-start z-10">
            <div className={`p-3.5 rounded-2xl bg-${color}-500/10 border border-${color}-500/20`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>

            {trend !== undefined && (
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? 'rotate-90' : ''}`} />
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div className="z-10">
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-white tracking-tighter">{value ?? 0}</h3>
                {subValue && <span className="text-xs text-gray-500 font-medium">{subValue}</span>}
            </div>
        </div>
    </motion.div>
);

export default function Accueil({ globalStats }) {
    const { connected } = useSocket();
    const liveStats = globalStats;

    if (!liveStats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="neo-card h-40 animate-pulse bg-white/5" />
                ))}
            </div>
        );
    }

    const chartData = liveStats.measure_chart_data || [];
    const mesuresByType = liveStats.mesures_by_type || [];
    const anomalies = (liveStats.capteurs_hs || 0) + (liveStats.capteurs_signales || 0);

    const stats = [
        {
            label: 'Capteurs Actifs',
            value: liveStats.capteurs_actifs,
            subValue: `/ ${liveStats.total_capteurs || 0}`,
            icon: Cpu,
            color: 'blue',
            trend: 8,
        },
        {
            label: 'Anomalies',
            value: anomalies,
            subValue: 'signalés + HS',
            icon: AlertTriangle,
            color: 'rose',
            trend: -12,
        },
        {
            label: 'Capteurs Maintenance',
            value: liveStats.capteurs_maintenance,
            subValue: 'capteurs',
            icon: Wrench,
            color: 'amber',
            trend: 4,
        },
        {
            label: 'Mobilité Live',
            value: liveStats.vehicules_en_route,
            subValue: 'véhicules',
            icon: Car,
            color: 'cyan',
            trend: 22,
        },
    ];

    return (
        <div className="space-y-10 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
                        Neo-Sousse <span className="text-gradient">2030</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-turquoise uppercase tracking-widest">
                            Hyper-connectée
                        </span>
                        <span className="text-sm text-gray-400">
                            Session Live • {liveStats.date}
                        </span>
                    </div>
                </div>

                <div className="px-6 py-3 neo-glass rounded-2xl border border-white/5 text-[10px] font-black text-white uppercase tracking-widest">
                    {connected ? 'Socket connecte' : 'Sync 60s'}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 neo-card p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">
                                Flux Énergétique & Données
                            </h3>
                            <p className="text-sm text-gray-400">
                                Activité réelle des mesures depuis la base PostgreSQL/TimescaleDB
                            </p>
                        </div>
                    </div>

                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#40e0d0" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#40e0d0" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0d1117',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#40e0d0"
                                    strokeWidth={3}
                                    fill="url(#colorVal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="neo-card p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    Eco-Score
                                </h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    Sousse durable
                                </p>
                            </div>
                        </div>

                        <h4 className="text-4xl font-black text-white mb-4">0%</h4>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-turquoise rounded-full" style={{ width: '0%' }} />
                        </div>
                    </div>

                    <div className="neo-card p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                                <BarChart3 className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    Mesures par Type
                                </h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    Moyenne 24h
                                </p>
                            </div>
                        </div>

                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mesuresByType}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="type_mesure" stroke="#64748b" fontSize={10} />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0d1117',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 12,
                                        }}
                                    />
                                    <Bar dataKey="moyenne" fill="#40e0d0" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
