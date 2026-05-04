import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    FileText,
    Lightbulb,
    RefreshCw,
    ShieldCheck,
    Activity,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';

const PRIORITY_STYLES = {
    haute: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    moyenne: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    basse: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const cleanLine = (line) => line
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/, '')
    .replace(/^---+$/, '')
    .trim();

const getSectionStyle = (index) => {
    const styles = [
        'border-turquoise/30 bg-turquoise/[0.04] text-turquoise',
        'border-blue-500/30 bg-blue-500/[0.04] text-blue-300',
        'border-amber-500/30 bg-amber-500/[0.04] text-amber-300',
        'border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-300',
        'border-rose-500/30 bg-rose-500/[0.04] text-rose-300',
    ];
    return styles[index % styles.length];
};

const ReportDocument = ({ text, date }) => {
    const lines = (text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !/^---+$/.test(line));

    if (!lines.length) {
        return (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <FileText className="mx-auto mb-4 h-10 w-10 text-text-dim" />
                <p className="text-sm font-bold text-text-muted">Cliquez sur regenerer pour charger le rapport.</p>
            </div>
        );
    }

    let sectionIndex = -1;

    return (
        <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#f8fafc] text-slate-900 shadow-2xl">
            <div className="border-b border-slate-200 bg-white px-10 py-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                            Intelligence decisionnelle
                        </p>
                        <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-950">
                            Rapport Strategique IA - Neo-Sousse 2030
                        </h1>
                        <p className="mt-3 text-sm font-semibold text-slate-500">
                            Genere le {date || new Date().toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Statut</p>
                        <p className="mt-1 text-lg font-black text-emerald-800">Analyse active</p>
                    </div>
                </div>
            </div>

            <div className="space-y-5 px-10 py-8">
                {lines.map((rawLine, index) => {
                    const line = cleanLine(rawLine);
                    if (!line) return null;

                    const isMainTitle = /rapport journalier|rapport strategique|neo-sousse 2030/i.test(line) && index < 3;
                    const isDate = /^date\s*:/i.test(line);
                    const isSection = /^(\d+[\.\)]\s+|resume executif|analyse|gestion|perspectives|recommandations|conclusion|mobilite|experience)/i.test(line);
                    const isBullet = /^[-•]\s+/.test(line);

                    if (isMainTitle || isDate) return null;

                    if (isSection) {
                        sectionIndex += 1;
                        const style = getSectionStyle(sectionIndex);
                        return (
                            <section key={`${line}-${index}`} className={`rounded-2xl border p-5 ${style}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sm font-black text-slate-900 shadow-sm">
                                        {sectionIndex + 1}
                                    </div>
                                    <h2 className="text-base font-black tracking-tight">{line.replace(/^\d+[\.\)]\s*/, '')}</h2>
                                </div>
                            </section>
                        );
                    }

                    if (isBullet) {
                        return (
                            <div key={`${line}-${index}`} className="ml-4 flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <p className="text-sm font-semibold leading-7 text-slate-700">{line.replace(/^[-•]\s+/, '')}</p>
                            </div>
                        );
                    }

                    return (
                        <p key={`${line}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium leading-8 text-slate-700 shadow-sm">
                            {line}
                        </p>
                    );
                })}
            </div>
        </article>
    );
};

export default function Rapports({ apiBase }) {
    const [rapport, setRapport] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState('');

    const fetchRapport = async () => {
        setLoading(true);
        try {
            const [rRes, sRes, statsRes] = await Promise.all([
                axios.get(`${apiBase}/rapport`),
                axios.get(`${apiBase}/suggestions`),
                axios.get(`${apiBase}/dashboard`),
            ]);
            setRapport(rRes.data.rapport || '');
            setDate(rRes.data.date || '');
            setSuggestions(sRes.data.suggestions || []);
            setStats(statsRes.data || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRapport(); }, []);

    const statCards = [
        { label: 'Capteurs actifs', value: stats?.capteurs_actifs, icon: ShieldCheck, color: 'text-cyan-300' },
        { label: 'Anomalies', value: (stats?.capteurs_hs || 0) + (stats?.capteurs_signales || 0), icon: AlertTriangle, color: 'text-rose-300' },
        { label: 'Vehicules en route', value: stats?.vehicules_en_route, icon: Activity, color: 'text-blue-300' },
        { label: 'Interventions ouvertes', value: stats?.interventions_en_cours, icon: FileText, color: 'text-amber-300' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-wrap justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        <FileText className="text-turquoise w-8 h-8" />
                        Rapports Strategiques IA
                    </h2>
                    <p className="text-text-muted mt-2 font-medium">Synthese decisionnelle structuree pour le pilotage urbain</p>
                </div>
                <button
                    onClick={fetchRapport}
                    disabled={loading}
                    className="btn-primary flex items-center gap-3 px-6 py-3 disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Regenerer le rapport
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {statCards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="neo-card p-5">
                            <Icon className={`mb-4 h-5 w-5 ${item.color}`} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">{item.label}</p>
                            <p className="mt-2 text-3xl font-black text-white">{item.value ?? '--'}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="neo-card p-3 min-h-[600px] leading-relaxed relative bg-black/40"
                    >
                        {loading ? (
                            <div className="space-y-5 p-8 overflow-hidden">
                                <div className="h-8 bg-white/10 w-2/3 rounded-xl animate-pulse" />
                                <div className="h-24 bg-white/10 w-full rounded-2xl animate-pulse" />
                                <div className="h-24 bg-white/10 w-full rounded-2xl animate-pulse" />
                                <div className="h-40 bg-white/10 w-full rounded-2xl animate-pulse" />
                            </div>
                        ) : (
                            <ReportDocument text={rapport} date={date} />
                        )}
                    </motion.div>
                </div>

                <div className="space-y-6">
                    <div className="neo-card p-6 bg-turquoise/5 border-turquoise/20">
                        <h3 className="text-xs font-extrabold text-turquoise uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
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

                    <div className="neo-card p-6">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Qualite du rapport</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Structure</span>
                                <span className="text-emerald-400 font-bold">Professionnelle</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Source</span>
                                <span className="text-blue-400 font-bold">Base + IA</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Longueur</span>
                                <span className="text-turquoise font-bold">{rapport.length} caracteres</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
