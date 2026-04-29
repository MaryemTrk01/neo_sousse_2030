import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, Lightbulb, RefreshCw, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const PRIORITY_STYLES = {
    'haute': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'moyenne': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'basse': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'info': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function Rapports({ apiBase }) {
    const [rapport, setRapport] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState('');

    const fetchRapport = async () => {
        setLoading(true);
        try {
            const [rRes, sRes] = await Promise.all([
                axios.get(`${apiBase}/rapport`),
                axios.get(`${apiBase}/suggestions`)
            ]);
            setRapport(rRes.data.rapport);
            setDate(rRes.data.date);
            setSuggestions(sRes.data.suggestions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRapport(); }, []);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <FileText className="text-indigo-500 w-8 h-8" />
                        Rapports Strategiques IA
                    </h2>
                    <p className="text-gray-500 mt-2">Synthèse décisionnelle générée par l'intelligence urbaine</p>
                </div>
                <button
                    onClick={fetchRapport}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Régénérer le Rapport
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Rapport Content */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 min-h-[600px] leading-relaxed relative"
                    >
                        <div className="absolute top-8 right-8 text-[10px] font-mono text-gray-600 bg-gray-800/20 px-2 py-1 rounded">
                            Généré le {date}
                        </div>

                        {loading ? (
                            <div className="space-y-6 overflow-hidden">
                                <div className="h-4 bg-gray-800 w-1/4 rounded animate-pulse" />
                                <div className="h-32 bg-gray-800 w-full rounded animate-pulse" />
                                <div className="h-4 bg-gray-800 w-1/3 rounded animate-pulse" />
                                <div className="h-64 bg-gray-800 w-full rounded animate-pulse" />
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-[1.8]">
                                    {rapport || "Cliquez sur régénérer pour charger le rapport..."}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Actionable Suggestions */}
                <div className="space-y-6">
                    <div className="glass-card p-6 bg-indigo-500/5 border-indigo-500/20">
                        <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" /> Suggestions d'Actions
                        </h3>
                        <div className="space-y-4">
                            {suggestions.map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-4 rounded-xl border-l-4 ${PRIORITY_STYLES[s.priorite] || PRIORITY_STYLES.info} shadow-lg`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{s.priorite}</span>
                                        <span className="text-[9px] text-gray-500 font-mono">IA-SUGGEST-#{i + 100}</span>
                                    </div>
                                    <p className="text-xs font-semibold leading-relaxed text-gray-200">{s.message}</p>
                                    <div className="mt-3 flex gap-2">
                                        <button className="text-[9px] font-bold bg-white/5 hover:bg-white/10 px-2 py-1 rounded uppercase transition-colors">Assigner</button>
                                        <button className="text-[9px] font-bold bg-white/5 hover:bg-white/10 px-2 py-1 rounded uppercase transition-colors">Ignorer</button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Statistiques du Rapport</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Score de Sûreté</span>
                                <span className="text-emerald-400 font-bold">Excellent</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Taux de Résilience</span>
                                <span className="text-blue-400 font-bold">94.2%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
