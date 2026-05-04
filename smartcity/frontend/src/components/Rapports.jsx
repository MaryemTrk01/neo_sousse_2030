import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, RefreshCw } from 'lucide-react';

const cleanLine = (line) => line
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/, '')
    .replace(/^---+$/, '')
    .trim();

const getSectionStyle = (index) => {
    const styles = [
        'border-turquoise/30 bg-turquoise/[0.06] text-turquoise',
        'border-blue-500/30 bg-blue-500/[0.06] text-blue-300',
        'border-amber-500/30 bg-amber-500/[0.06] text-amber-300',
        'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300',
        'border-rose-500/30 bg-rose-500/[0.06] text-rose-300',
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
        <article className="overflow-hidden rounded-[1.5rem] border border-turquoise/20 bg-[#111823] text-white shadow-2xl shadow-turquoise/5">
            <div className="border-b border-white/10 bg-white/[0.03] px-10 py-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <p className="mb-3 inline-flex rounded-full border border-turquoise/20 bg-turquoise/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-turquoise">
                            Intelligence decisionnelle
                        </p>
                        <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white">
                            Rapport Strategique IA - Neo-Sousse 2030
                        </h1>
                        <p className="mt-3 text-sm font-semibold text-text-muted">
                            Genere le {date || new Date().toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Statut</p>
                        <p className="mt-1 text-lg font-black text-emerald-300">Analyse active</p>
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
                    const isBullet = /^[-]\s+/.test(line);

                    if (isMainTitle || isDate) return null;

                    if (isSection) {
                        sectionIndex += 1;
                        const style = getSectionStyle(sectionIndex);
                        return (
                            <section key={`${line}-${index}`} className={`rounded-2xl border p-5 ${style}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-sm font-black text-white shadow-sm">
                                        {sectionIndex + 1}
                                    </div>
                                    <h2 className="text-base font-black tracking-tight">{line.replace(/^\d+[\.\)]\s*/, '')}</h2>
                                </div>
                            </section>
                        );
                    }

                    if (isBullet) {
                        return (
                            <div key={`${line}-${index}`} className="ml-4 flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 shadow-sm">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                                <p className="text-sm font-semibold leading-7 text-white/75">{line.replace(/^[-]\s+/, '')}</p>
                            </div>
                        );
                    }

                    return (
                        <p key={`${line}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-6 py-5 text-sm font-medium leading-8 text-white/75 shadow-sm">
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
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState('');

    const fetchRapport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiBase}/rapport`);
            setRapport(res.data.rapport || '');
            setDate(res.data.date || '');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRapport(); }, []);

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
    );
}
