import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Wrench,
    Clock,
    CheckCircle,
    AlertCircle,
    User,
    Calendar,
    Filter,
    Search
} from 'lucide-react';
import { useSocket } from '../SocketContext';

const STATUS_COLORS = {
    'DEMANDE': { class: 'bg-slate-500/10 text-slate-400', icon: Clock },
    'TECH1_ASSIGNE': { class: 'bg-blue-500/10 text-blue-400', icon: User },
    'TECH2_VALIDE': { class: 'bg-purple-500/10 text-purple-400', icon: User },
    'IA_VALIDE': { class: 'bg-cyan-500/10 text-cyan-400', icon: AlertCircle },
    'TERMINE': { class: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
};

export default function Interventions({ apiBase }) {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const { socket } = useSocket();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${apiBase}/interventions`);
                setInterventions(res.data.interventions);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();

        if (socket) {
            socket.on('status_change', (data) => {
                if (data.type === 'intervention') fetch();
            });
            socket.on('metrics_update', fetch);
        }
        return () => {
            if (socket) {
                socket.off('status_change');
                socket.off('metrics_update');
            }
        };
    }, [apiBase, socket]);

    const filtered = interventions.filter(i => statusFilter === 'ALL' || i.statut === statusFilter);

    const stats = {
        total: interventions.length,
        terminees: interventions.filter(i => i.statut === 'TERMINE').length,
        enCours: interventions.filter(i => i.statut !== 'TERMINE').length,
    };

    const percentFinished = stats.total > 0 ? Math.round((stats.terminees / stats.total) * 100) : 0;

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-3xl font-bold text-white">Gestion des Interventions</h2>
                <p className="text-gray-500">Planification et suivi des maintenances techniques</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Taux de Résolution</p>
                        <h3 className="text-3xl font-bold text-emerald-400">{percentFinished}%</h3>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-gray-800 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                </div>
                <div className="glass-card p-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">En Cours</p>
                    <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-bold text-amber-400">{stats.enCours}</h3>
                        <Clock className="w-8 h-8 text-amber-500/20" />
                    </div>
                </div>
                <div className="glass-card p-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Terminées</p>
                    <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-bold text-blue-400">{stats.terminees}</h3>
                        <CheckCircle className="w-8 h-8 text-blue-500/20" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="xl:col-span-2 glass-card">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-indigo-400" />
                            Historique des Missions
                        </h3>
                        <div className="flex gap-2">
                            <select
                                className="bg-[#0f111a] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Tout</option>
                                {Object.keys(STATUS_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Capteur</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Techniciens</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Statut</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => {
                                    const SIcon = STATUS_COLORS[item.statut]?.icon || AlertCircle;
                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="border-b border-gray-800/30 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono text-indigo-400 font-bold text-sm">#{item.id}</td>
                                            <td className="px-6 py-4 text-white font-semibold text-sm">Capteur {item.capteur_id}</td>
                                            <td className="px-6 py-4 flex flex-col">
                                                <span className="text-xs text-gray-300 flex items-center gap-1"><User className="w-3 h-3" /> T1: {item.technicien1_id || '—'}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> T2: {item.technicien2_id || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border border-current w-fit ${STATUS_COLORS[item.statut]?.class}`}>
                                                    <SIcon className="w-3 h-3" />
                                                    {item.statut}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] text-gray-500">
                                                {item.date}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timeline Visual */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-6 uppercase text-xs tracking-widest flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Activités Récentes
                    </h3>
                    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-800">
                        {interventions.slice(0, 5).map((item, idx) => (
                            <div key={item.id} className="relative pl-10">
                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-[#11141d] flex items-center justify-center z-10 ${STATUS_COLORS[item.statut]?.class.replace('bg-', 'bg-').split(' ')[0].replace('/10', '')}`}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                </div>
                                <p className="text-xs font-bold text-white">Mise à jour Intervention #{item.id}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Nouveau statut : <span className="font-bold text-indigo-400">{item.statut}</span></p>
                                <p className="text-[9px] text-gray-600 mt-2 italic">{item.date}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
