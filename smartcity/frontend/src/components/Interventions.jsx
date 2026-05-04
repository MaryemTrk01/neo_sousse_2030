import React, { useState, useEffect, useCallback } from 'react';
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
    Search,
    Activity
} from 'lucide-react';
import { useSocket } from '../SocketContext';

const STATUS_CONFIG = {
    'DEMANDE': { class: 'bg-slate-500/10 text-slate-400', icon: Clock, next: 'assigner_tech1', nextLabel: 'Assigner Tech 1' },
    'TECH1_ASSIGNE': { class: 'bg-blue-500/10 text-blue-400', icon: User, next: 'valider_tech2', nextLabel: 'Valider Tech 2' },
    'TECH2_VALIDE': { class: 'bg-purple-500/10 text-purple-400', icon: User, next: 'valider_ia', nextLabel: 'Contrôle IA' },
    'IA_VALIDE': { class: 'bg-turquoise/10 text-turquoise', icon: Activity, next: 'terminer', nextLabel: 'Clôturer' },
    'TERMINE': { class: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle, next: null, nextLabel: null },
};

export default function Interventions({ apiBase }) {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const { socket } = useSocket();

    const fetch = useCallback(async () => {
        try {
            const res = await axios.get(`${apiBase}/interventions`);
            setInterventions(res.data.interventions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetch();
        const timer = setInterval(fetch, 60000);

        const onInterventionUpdate = (data) => {
            if (Array.isArray(data)) {
                setInterventions(data);
                setLoading(false);
            } else {
                fetch();
            }
        };

        if (socket) {
            socket.on('intervention_update', onInterventionUpdate);
        }

        return () => {
            clearInterval(timer);
            if (socket) {
                socket.off('intervention_update', onInterventionUpdate);
            }
        };
    }, [socket, fetch]);

    const handleTransition = async (id, event) => {
        try {
            await axios.post(`${apiBase}/interventions/${id}/transition`, { event });
        } catch (err) {
            alert(err.response?.data?.error || "Erreur transition");
        }
    };

    const filtered = interventions.filter(i => statusFilter === 'ALL' || i.statut === statusFilter);

    const stats = {
        total: interventions.length,
        terminees: interventions.filter(i => i.statut === 'TERMINE').length,
        enCours: interventions.filter(i => i.statut !== 'TERMINE').length,
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Centre de <span className="text-gradient">Maintenance</span>
                    </h2>
                    <p className="text-text-muted font-medium">Flux d'interventions techniques certifiées IA • Sousse</p>
                </div>
                <div className="neo-glass px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-deep bg-turquoise/20 flex items-center justify-center text-[10px] font-bold text-turquoise shadow-lg">T{i}</div>)}
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Équipes Actives</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="neo-card p-8 flex items-center justify-between group overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-turquoise/5 blur-2xl rounded-full" />
                    <div>
                        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Efficacité Flotte</p>
                        <h3 className="text-4xl font-black text-turquoise">{stats.total > 0 ? Math.round((stats.terminees / stats.total) * 100) : 100}%</h3>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:rotate-12 transition-transform">
                        <CheckCircle className="w-8 h-8 text-turquoise" />
                    </div>
                </div>
                <div className="neo-card p-8 flex items-center justify-between group overflow-hidden border-amber-500/10">
                    <div>
                        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Missions en cours</p>
                        <h3 className="text-4xl font-black text-amber-400">{stats.enCours}</h3>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                        <Clock className="w-8 h-8 text-amber-400" />
                    </div>
                </div>
                <div className="neo-card p-8 flex items-center justify-between group overflow-hidden border-blue-500/10">
                    <div>
                        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Certifications IA</p>
                        <h3 className="text-4xl font-black text-blue-400">{interventions.filter(i => i.statut === 'IA_VALIDE').length}</h3>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:-rotate-12 transition-transform">
                        <Activity className="w-8 h-8 text-blue-400" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 neo-card overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/10">
                        <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-3">
                            <Wrench className="w-5 h-5 text-turquoise" />
                            Log d'Interventions
                        </h3>
                        <select
                            className="bg-black/40 border border-white/5 rounded-2xl px-6 py-2.5 text-xs font-black text-white focus:outline-none focus:border-turquoise/50 uppercase tracking-widest"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Tous les statuts</option>
                            {Object.keys(STATUS_CONFIG).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Réf. Mission</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Cible</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Expertise</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Statut</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map((item, idx) => {
                                    const config = STATUS_CONFIG[item.statut] || { icon: AlertCircle, class: '' };
                                    const SIcon = config.icon;
                                    return (
                                        <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6 font-black text-turquoise tracking-tighter text-base">#INT-{item.id}</td>
                                            <td className="px-8 py-6">
                                                <div className="text-white font-bold text-sm">Capteur {item.capteur_id}</div>
                                                <div className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-1">Secteur Sousse-{item.capteur_id % 5}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-white/80"><User className="w-3 h-3 text-turquoise" /> {item.technicien1_id || '---'}</div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-text-dim"><User className="w-3 h-3" /> {item.technicien2_id || '---'}</div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black border border-current shadow-inner ${config.class}`}>
                                                    <SIcon className="w-3.5 h-3.5" />
                                                    {item.statut}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                {config.next && (
                                                    <button onClick={() => handleTransition(item.id, config.next)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-turquoise hover:text-black hover:border-turquoise transition-all uppercase tracking-widest">
                                                        {config.nextLabel}
                                                    </button>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="neo-card p-8 bg-gradient-to-br from-turquoise/5 to-transparent">
                        <h3 className="font-black text-white mb-8 uppercase text-[10px] tracking-[0.2em] flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-turquoise" />
                            Timeline Système
                        </h3>
                        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-white/5">
                            {interventions.slice(0, 5).map((item, idx) => (
                                <div key={item.id} className="relative pl-10 group">
                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-bg-dark flex items-center justify-center z-10 bg-turquoise/20 group-hover:scale-125 transition-transform">
                                        <div className="w-2 h-2 rounded-full bg-turquoise shadow-[0_0_10px_rgba(64,224,208,0.8)]" />
                                    </div>
                                    <p className="text-xs font-black text-white tracking-tight">Intervention #{item.id} mise à jour</p>
                                    <p className="text-[10px] text-text-dim font-bold uppercase mt-1 tracking-widest">Nouveau statut : <span className="text-turquoise">{item.statut}</span></p>
                                    <div className="mt-3 inline-block px-3 py-1 bg-white/5 rounded-lg text-[9px] text-text-dim font-black border border-white/5">{item.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="neo-card p-8 text-center border-dashed border-turquoise/20 bg-turquoise/[0.02]">
                        <div className="w-16 h-16 bg-turquoise/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-8 h-8 text-turquoise" />
                        </div>
                        <h4 className="font-black text-white mb-2">Automate de Validation</h4>
                        <p className="text-xs text-text-dim leading-relaxed mb-6">Chaque transition est vérifiée par le noyau IA de Neo-Sousse pour garantir l'intégrité opérationnelle.</p>
                        <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-[10px] font-black text-turquoise/60"><span>SÉCURITÉ</span><span>100%</span></div>
                           <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-turquoise w-full" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
