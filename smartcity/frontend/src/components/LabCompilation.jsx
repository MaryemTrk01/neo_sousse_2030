import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FlaskConical, Search, Layers, Box, Cpu, ArrowRight, Dna, Terminal } from 'lucide-react';

export default function LabCompilation({ apiBase }) {
    const [query, setQuery] = useState('');
    const [debugData, setDebugData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalize = async () => {
        if (!query) return;
        setLoading(true);
        setDebugData(null);
        try {
            const res = await axios.post(`${apiBase}/compiler`, { query });
            setDebugData(res.data.debug);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'analyse : " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">LAB MODE</span>
                <h2 className="text-3xl font-extrabold text-white mt-4 flex items-center gap-3">
                    <FlaskConical className="text-purple-500 w-8 h-8" />
                    Laboratoire de Compilation
                </h2>
                <p className="text-gray-500 mt-1">Analyse sémantique et syntaxique étape par étape du pipeline NL→SQL</p>
            </header>

            <div className="glass-card p-8 border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Entrez une phrase pour analyser son pipeline..."
                        className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                        onClick={handleAnalize}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-8 rounded-xl font-bold flex items-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "ANALYSE..." : "LANCER L'ANALYSE"} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1: Lexer */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-blue-500/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded bg-blue-500 text-white"><Layers className="w-4 h-4" /></div>
                        <h4 className="font-bold text-white tracking-widest text-xs uppercase">1. Lexer (Tokens)</h4>
                    </div>
                    <div className="space-y-2">
                        {debugData?.tokens ? debugData.tokens.map((t, i) => (
                            <div key={i} className="p-2 bg-blue-500/5 border border-blue-500/10 rounded font-mono text-[10px] text-blue-300">
                                {t}
                            </div>
                        )) : <div className="h-40 border border-dashed border-gray-800 rounded flex items-center justify-center text-xs text-gray-700 italic">En attente d'input...</div>}
                    </div>
                </motion.div>

                {/* Step 2: Parser */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-purple-500/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded bg-purple-500 text-white"><Box className="w-4 h-4" /></div>
                        <h4 className="font-bold text-white tracking-widest text-xs uppercase">2. Parser (AST)</h4>
                    </div>
                    <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded min-h-[160px]">
                        <pre className="font-mono text-[10px] text-purple-300 whitespace-pre-wrap">
                            {debugData?.ast || "// L'arbre de syntaxe abstraite sera généré ici"}
                        </pre>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600">
                        <Dna className="w-3 h-3" /> Structure hiérarchique détectée
                    </div>
                </motion.div>

                {/* Step 3: Semantic & CodeGen */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6 border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded bg-emerald-500 text-white"><Terminal className="w-4 h-4" /></div>
                        <h4 className="font-bold text-white tracking-widest text-xs uppercase">3. Code Generation</h4>
                    </div>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded font-mono text-[10px] text-emerald-300 break-all h-full min-h-[160px]">
                        {debugData?.stages?.codegen || "-- SQL OUTPUT --"}
                    </div>
                </motion.div>
            </div>

            <div className="glass-card p-6 border-indigo-500/20">
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.2em]">Explication Théorique</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-400">
                    <p>
                        Le <b>Lexer</b> transforme la chaîne d'entrée en une suite de symboles atomiques appelés tokens (mots clés, opérateurs, littéraux).
                        Cette étape utilise des expressions régulières pour identifier les catégories lexicales.
                    </p>
                    <p>
                        Le <b>Parser</b> construit l'Arbre de Syntaxe Abstraite (AST) en appliquant les règles de grammaire.
                        Elle vérifie que la structure de la phrase respecte les dépendances sémantiques attendues par le schéma de la base de données.
                    </p>
                </div>
            </div>
        </div>
    );
}
