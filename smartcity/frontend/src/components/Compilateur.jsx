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
        <div className="max-w-5xl mx-auto space-y-8">
            <header>
                <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                    <Terminal className="text-indigo-500 w-8 h-8" />
                    Compilateur NL → SQL
                </h2>
                <p className="text-gray-500 mt-2">Interrogez la base de données de la ville en langage naturel (Français)</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {/* Input Section */}
                    <div className="glass-card p-6 bg-[#11141d]/80 border-indigo-500/20 shadow-2xl">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCompile()}
                                    placeholder="Ex: Affiche les capteurs actifs..."
                                    className="w-full bg-[#0f111a] border-2 border-gray-800 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-700"
                                />
                                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                            </div>
                            <button
                                onClick={() => handleCompile()}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-xl font-bold flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                                Compiler
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mr-2 py-1">Exemples :</span>
                            {EXAMPLES.map(ex => (
                                <button
                                    key={ex}
                                    onClick={() => { setQuery(ex); handleCompile(ex); }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-white px-3 py-1 bg-gray-800/50 hover:bg-indigo-600/20 rounded-full transition-colors border border-gray-700/50"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results Area */}
                    <AnimatePresence mode="wait">
                        {result && (
                            <motion.div
                                key={result.nl_input}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* SQL Output */}
                                <div className="glass-card p-6 border-l-4 border-indigo-500 overflow-hidden relative group">
                                    <button className="absolute right-4 top-4 text-gray-600 hover:text-white transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Code SQL Généré</p>
                                    <pre className="font-mono text-cyan-300 text-sm overflow-x-auto p-4 bg-black/40 rounded-lg">
                                        {result.sql || "-- Erreur de génération --"}
                                    </pre>
                                    {result.errors.length > 0 && (
                                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-400">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold">Erreur de compilation</p>
                                                <ul className="text-xs list-disc list-inside mt-1 opacity-80">
                                                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Data Table */}
                                {result.success && result.rows && (
                                    <div className="glass-card overflow-hidden">
                                        <div className="p-4 border-b border-gray-800 bg-emerald-500/5 flex justify-between items-center">
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> Résultats de la Requête
                                            </p>
                                            <span className="text-[10px] text-gray-500">{result.row_count} lignes retournées</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-[#0f111a] border-b border-gray-800">
                                                    <tr>
                                                        {result.rows.length > 0 && Object.keys(result.rows[0]).map(key => (
                                                            <th key={key} className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px]">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.rows.map((row, i) => (
                                                        <tr key={i} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                                                            {Object.values(row).map((val, j) => (
                                                                <td key={j} className="px-6 py-3 text-gray-300 font-medium">{val === null ? "—" : String(val)}</td>
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

                {/* Sidebar: History */}
                <div className="space-y-6">
                    <div className="glass-card p-6 h-full min-h-[400px]">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <History className="w-3 h-3" /> Historique
                        </h4>
                        <div className="space-y-2">
                            {history.length > 0 ? history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setQuery(h); handleCompile(h); }}
                                    className="w-full text-left p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-xs text-gray-400 hover:text-white flex justify-between items-center group"
                                >
                                    <span className="truncate">{h}</span>
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all font-bold" />
                                </button>
                            )) : <p className="text-[10px] text-gray-700 italic text-center py-20">Aucune requête récente</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
