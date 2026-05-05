import React, { useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clipboard,
    Code2,
    Database,
    History,
    Loader2,
    Play,
    Rows3,
    Search,
    ShieldCheck,
    Sparkles,
    Terminal,
} from 'lucide-react';

const EXAMPLES = [
    'Affiche tous les capteurs actifs',
    "Combien d'interventions sont en cours ?",
    'Quels sont les citoyens avec un score > 80 ?',
    'Montre les mesures de temperature de la zone nord',
    'Liste les vehicules en panne',
];

const compilerStats = [
    { label: 'Entree', value: 'Francais', icon: Sparkles, tone: 'text-purple-300 bg-purple-400/10 border-purple-400/20' },
    { label: 'Sortie', value: 'SQL', icon: Code2, tone: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
    { label: 'Execution', value: 'Live DB', icon: Database, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
];

export default function Compilateur({ apiBase }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [copied, setCopied] = useState(false);

    const handleCompile = async (q = query) => {
        const cleanQuery = q.trim();
        if (!cleanQuery || loading) return;

        setLoading(true);
        setCopied(false);

        try {
            const res = await axios.post(`${apiBase}/compiler`, { query: cleanQuery });
            setResult(res.data);

            if (res.data.success) {
                setHistory((prev) => [cleanQuery, ...prev.filter((h) => h !== cleanQuery)].slice(0, 10));
            }
        } catch (err) {
            console.error(err);
            setResult({
                success: false,
                sql: '',
                rows: [],
                row_count: 0,
                errors: ['Impossible de joindre le service de compilation.'],
            });
        } finally {
            setLoading(false);
        }
    };

    const copySql = async () => {
        if (!result?.sql) return;

        await navigator.clipboard.writeText(result.sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    const runExample = (example) => {
        setQuery(example);
        handleCompile(example);
    };

    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const hasRows = result?.success && rows.length > 0;

    return (
        <section className="mx-auto max-w-7xl animate-fade-in space-y-5 pb-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-[#080d1b]/90 shadow-[0_20px_60px_rgba(0,0,0,0.38)]">
                <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_520px]">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-300/25 bg-gradient-to-br from-purple-500/25 to-pink-500/15 shadow-[0_0_28px_rgba(168,85,247,0.22)]">
                            <Terminal className="h-7 w-7 text-purple-100" />
                        </div>

                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200/70">
                                Module de compilation
                            </p>
                            <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
                                Compilateur <span className="text-gradient">NL-SQL</span>
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
                                Transformez une demande en francais en requete SQL executable sur la base Neo-Sousse.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {compilerStats.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className={`rounded-2xl border p-3 ${item.tone}`}>
                                    <Icon className="h-4 w-4" />
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                <main className="min-w-0 space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-[#0c1324]/90 p-5 shadow-[0_16px_42px_rgba(0,0,0,0.30)]">
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                <Search className="h-4 w-4 text-purple-300" />
                                Requete naturelle
                            </label>

                            <div className="relative">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleCompile();
                                        }
                                    }}
                                    rows={3}
                                    placeholder="Exemple: liste les capteurs actifs dans la zone nord..."
                                    className="w-full min-h-[118px] resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 pr-16 text-base font-medium leading-7 text-white shadow-inner transition placeholder:text-slate-500 focus:bg-white/[0.075]"
                                />

                                <button
                                    onClick={() => handleCompile()}
                                    disabled={!query.trim() || loading}
                                    className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-[0_12px_28px_rgba(168,85,247,0.34)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Executer"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {EXAMPLES.map((example) => (
                                <button
                                    key={example}
                                    onClick={() => runExample(example)}
                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.06em] text-slate-300 transition hover:border-purple-300/30 hover:bg-purple-400/10 hover:text-white"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div
                                key={result.sql || result.errors?.join('-') || 'result'}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                className="space-y-6"
                            >
                                <div className="rounded-[2rem] border border-white/10 bg-[#0c1324]/90 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${result.success ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                                                {result.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white">
                                                    {result.success ? 'Compilation reussie' : 'Compilation bloquee'}
                                                </p>
                                                <p className="text-xs font-semibold text-slate-400">
                                                    SQL genere par le moteur semantique
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={copySql}
                                            disabled={!result.sql}
                                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-purple-300/30 hover:bg-purple-400/10 disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <Clipboard className="h-4 w-4" />
                                            {copied ? 'Copie' : 'Copier'}
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <pre className="min-h-[120px] overflow-x-auto rounded-2xl border border-white/10 bg-[#050816] p-5 font-mono text-sm leading-7 text-purple-100 shadow-inner">
                                            {result.sql || '-- Requete SQL indisponible --'}
                                        </pre>

                                        {Array.isArray(result.errors) && result.errors.length > 0 && (
                                            <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-100">
                                                <div className="flex gap-3">
                                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">
                                                            Erreurs detectees
                                                        </p>
                                                        <ul className="mt-2 space-y-1 text-sm font-medium leading-6 text-rose-100/85">
                                                            {result.errors.map((error, index) => (
                                                                <li key={index}>{error}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {result.success && (
                                    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1324]/90 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                                                    <Rows3 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">Resultats</p>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Donnees retournees par la base
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-sky-200">
                                                {result.row_count ?? rows.length} lignes
                                            </span>
                                        </div>

                                        {hasRows ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/10 bg-white/[0.03]">
                                                            {Object.keys(rows[0]).map((key) => (
                                                                <th key={key} className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                                    {key}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/10">
                                                        {rows.map((row, rowIndex) => (
                                                            <tr key={rowIndex} className="transition hover:bg-white/[0.025]">
                                                                {Object.values(row).map((value, valueIndex) => (
                                                                    <td key={valueIndex} className="px-6 py-4 text-sm font-semibold text-slate-100">
                                                                        {value === null ? '-' : String(value)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="px-6 py-12 text-center">
                                                <p className="text-sm font-semibold text-slate-400">
                                                    La requete est valide, mais aucune ligne ne correspond.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-8 py-10 text-center"
                            >
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-200">
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                                <h3 className="mt-4 text-lg font-black text-white">Pret a compiler</h3>
                                <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-400">
                                    Saisissez une demande en langage naturel ou utilisez une question rapide pour generer la requete SQL.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                <aside className="space-y-6">
                    <div className="rounded-[2rem] border border-white/10 bg-[#0c1324]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white">Pipeline verifie</p>
                                <p className="text-xs font-semibold text-slate-400">NL vers SQL puis execution</p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                <span className="text-slate-400">Statut</span>
                                <span className={loading ? 'font-black text-amber-300' : 'font-black text-emerald-300'}>
                                    {loading ? 'Compilation' : 'Disponible'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Historique</span>
                                <span className="font-black text-white">{history.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/10 bg-[#0c1324]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                        <div className="mb-4 flex items-center gap-2">
                            <History className="h-4 w-4 text-purple-300" />
                            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                Historique
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {history.length > 0 ? (
                                history.map((item, index) => (
                                    <button
                                        key={`${item}-${index}`}
                                        onClick={() => runExample(item)}
                                        className="group relative w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-purple-300/30 hover:bg-purple-400/10"
                                    >
                                        <span className="block pr-6 text-sm font-semibold leading-6 text-slate-200">
                                            {item}
                                        </span>
                                        <ArrowRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300 opacity-0 transition group-hover:opacity-100" />
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                                    <Terminal className="mx-auto h-9 w-9 text-slate-600" />
                                    <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                        Aucune requete
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
