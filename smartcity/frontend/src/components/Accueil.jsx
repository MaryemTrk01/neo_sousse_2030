import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Cpu,
    Wrench,
    Users,
    TrendingUp,
    Car,
    AlertTriangle,
    ArrowUpRight,
    ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: '00h', val: 40 }, { name: '04h', val: 30 }, { name: '08h', val: 70 },
    { name: '12h', val: 85 }, { name: '16h', val: 60 }, { name: '20h', val: 45 }, { name: '23h', val: 50 },
];

const StatCard = ({ label, value, icon: Icon, color, subValue, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 rounded-full bg-${color}-500 blur-2xl`} />
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-lg bg-${color}-500/10 text-${color}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className={`flex items-center text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}% <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </span>
            )}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white">{value ?? 0}</h3>
                {subValue && <span className="text-xs text-gray-600">{subValue}</span>}
            </div>
        </div>
    </motion.div>
);

export default function Accueil({ globalStats }) {
    if (!globalStats) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse bg-gray-800/20" />)}
        </div>
    );

    const stats = [
        { label: 'Capteurs Actifs', value: globalStats.capteurs_actifs, subValue: `/ ${globalStats.total_capteurs || 0}`, icon: Cpu, color: 'blue', trend: 12 },
        { label: 'Capteurs HS', value: globalStats.capteurs_hs, icon: AlertTriangle, color: 'rose', trend: -5 },
        { label: 'Interventions', value: globalStats.interventions_en_cours, subValue: 'en cours', icon: Wrench, color: 'amber', trend: 8 },
        { label: 'Véhicules', value: globalStats.vehicules_en_route, subValue: 'actifs', icon: Car, color: 'indigo', trend: 15 },
    ];

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Tableau de Bord</h1>
                    <p className="text-gray-500 mt-2">Vue d'ensemble de la métropole • {globalStats.date || '—'}</p>
                </div>
                <div className="flex gap-4 text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/20">
                    <Activity className="w-4 h-4 animate-pulse" />
                    Mise à jour en direct
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Activité du Réseau</h3>
                            <p className="text-xs text-gray-500">Moyenne journalière des mesures</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/20">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-lg bg-indigo-500 text-white">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-white">Score Écologique</h4>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${globalStats.score_moyen_citoyens || 0}%` }} />
                            </div>
                            <span className="text-2xl font-bold text-emerald-400">{globalStats.score_moyen_citoyens || 0}%</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-3 uppercase tracking-wider">Objectif 2030 : 85%</p>
                    </div>

                    <div className="glass-card p-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Indicateurs de Santé
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Moyenne Mesures</span>
                                <span className="text-sm font-bold text-blue-400">{globalStats.moyenne_mesures || 0} ppm</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Point Culminant</span>
                                <span className="text-sm font-bold text-rose-400">{globalStats.max_mesure || 0} ppm</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Citoyens Engagés</span>
                                <span className="text-sm font-bold text-indigo-400">{globalStats.total_citoyens || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
