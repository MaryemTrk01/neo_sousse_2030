import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, History, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Copy } from 'lucide-react';

const EXAMPLES = [
    "Affiche tous les capteurs actifs",
    "Combien d'interventions sont en cours ?",
    "Quels sont les citoyens avec un score > 80 ?",
    "Montre les mesures de température de la zone nord",
    "Liste les véhicules en panne",
];

export default function Compilateur({ apiBase }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const handleCompile = async (q = query) => {
        if (!q) return;
        setLoading(true);
        try {
            const res = await axios.post(`${apiBase}/compiler`, { query: q });
            setResult(res.data);
            if (res.data.success) {
                setHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 10));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Compilateur <span className="text-gradient">NL-SQL</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-1">Abstraction sémantique et exécution de requêtes relationnelles • Neo-Sousse Core</p>
                </div>
                <div className="p-4 neo-glass rounded-2xl border border-white/5">
                    <Terminal className="w-8 h-8 text-turquoise" />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {/* Futuristic Search Section */}
                    <div className="neo-card p-1 bg-gradient-to-r from-turquoise/20 to-sand/10">
                        <div className="bg-bg-deep rounded-[1.4rem] p-8">
                            <div className="flex gap-4 relative">
                                <div className="flex-1 relative group">
                                    <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-turquoise w-6 h-6 group-focus-within:animate-pulse" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCompile()}
                                        placeholder="Décrivez votre requête en français (ex: liste les capteurs de la zone corniche)..."
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl pl-16 pr-6 py-5 text-lg text-white focus:outline-none focus:border-turquoise/50 transition-all placeholder-white/20 font-medium"
                                    />
                                </div>
                                <button
                                    onClick={() => handleCompile()}
                                    disabled={loading}
                                    className="btn-primary flex items-center gap-3 px-10 shadow-turquoise/20"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                                    <span className="font-black uppercase tracking-widest text-xs">Exécuter</span>
                                </button>
                            </div>

                            <div className="mt-8">
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-white/5"></span> Requêtes suggérées
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {EXAMPLES.map(ex => (
                                        <button
                                            key={ex}
                                            onClick={() => { setQuery(ex); handleCompile(ex); }}
                                            className="px-4 py-2 bg-white/5 hover:bg-turquoise hover:text-black border border-white/5 rounded-xl text-[10px] font-black text-text-muted transition-all uppercase tracking-widest"
                                        >
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {result && (
                            <motion.div key={result.nl_input} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                                {/* SQL Panel */}
                                <div className="neo-card p-8 border-sand/20 bg-sand/5 relative group">
                                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-sand/5 blur-3xl rounded-full" />
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-[10px] font-black text-sand uppercase tracking-[0.3em] flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-sand animate-pulse" />
                                            Génération SQL Optimisée
                                        </p>
                                        <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-sand/60">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <pre className="font-mono text-sand text-base overflow-x-auto p-6 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
                                            {result.sql || "-- Synthèse impossible --"}
                                        </pre>
                                    </div>
                                    
                                    {result.errors.length > 0 && (
                                        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-4 text-rose-400 animate-shake">
                                            <AlertCircle className="w-6 h-6 shrink-0" />
                                            <div className="text-sm">
                                                <p className="font-black uppercase tracking-widest text-[10px] mb-1">Violation de contrainte sémantique</p>
                                                <ul className="opacity-80 font-medium">
                                                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Results Grid */}
                                {result.success && result.rows && (
                                    <div className="neo-card overflow-hidden">
                                        <div className="p-6 border-b border-white/5 bg-turquoise/5 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-turquoise/20 rounded-lg"><CheckCircle2 className="w-4 h-4 text-turquoise" /></div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Ensemble de Résultats</span>
                                            </div>
                                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-turquoise uppercase tracking-widest">{result.row_count} Entités</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-black/20 border-b border-white/5">
                                                        {result.rows.length > 0 && Object.keys(result.rows[0]).map(key => (
                                                            <th key={key} className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-widest">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {result.rows.map((row, i) => (
                                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                            {Object.values(row).map((val, j) => (
                                                                <td key={j} className="px-8 py-4 text-sm font-bold text-white/90">{val === null ? "—" : String(val)}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Historical Log */}
                <div className="space-y-6">
                    <div className="neo-card p-8 min-h-[500px] flex flex-col">
                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                            <History className="w-4 h-4 text-turquoise" /> Log d'Audit
                        </h4>
                        <div className="space-y-3 flex-1">
                            {history.length > 0 ? history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setQuery(h); handleCompile(h); }}
                                    className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-turquoise/10 border border-transparent hover:border-turquoise/30 transition-all group relative overflow-hidden"
                                >
                                    <span className="text-[11px] font-bold text-text-muted group-hover:text-white transition-colors line-clamp-2 pr-6 uppercase tracking-tight">{h}</span>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-turquoise opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-20">
                                    <Terminal className="w-12 h-12 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">En attente de commandes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
