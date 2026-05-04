import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { compilerApi } from '../api/api';
import { Terminal, Cpu, Database, Binary, Code, Layout, Play, RefreshCcw } from 'lucide-react';

const LabCompilation = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tokens'); // tokens, ast, sql

  const handleCompile = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await compilerApi.compile(query);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Erreur de compilation : " + (err.response?.data?.detail || err.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col space-y-6">
      <header>
        <h1 className="text-3xl font-rajdhani font-bold text-white mb-2">Laboratoire de Compilation</h1>
        <p className="text-slate-400 text-sm italic">"Analyser, Décomposer, Traduire." - Système de traduction NL vers SQL.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Input Section */}
        <div className="flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-4 border-indigo-500/30">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal size={20} className="text-indigo-400" /> Source (Natural Language)
            </h3>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: 'Donne moi les capteurs d'air actifs à Sousse Médina'..."
              className="w-full flex-1 min-h-[150px] bg-black/40 border border-white/5 rounded-2xl p-4 text-slate-200 font-medium focus:border-indigo-500/50 outline-none transition-all resize-none"
            />
            <button 
              onClick={handleCompile}
              disabled={loading}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? <RefreshCcw size={20} className="animate-spin" /> : <Play size={20} />}
              LANCER LA COMPILATION
            </button>
          </GlassCard>

          <GlassCard className="flex-1 flex flex-col border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu size={20} className="text-indigo-400" /> Statut de l'Analyseur
            </h3>
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase">Lexer Status</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">Operational</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase">Parser Logic</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 uppercase">AI-Augmented</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase">Target Dialect</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 uppercase">PostgreSQL</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Debug Output Section */}
        <GlassCard className="flex flex-col p-0 overflow-hidden border-indigo-500/20">
          <div className="flex border-b border-white/5">
            {[
              { id: 'tokens', label: 'Table de Lexèmes', icon: Binary },
              { id: 'ast',    label: 'Arbre Syntaxique (AST)', icon: Layout },
              { id: 'sql',    label: 'Code Cible (SQL)', icon: Database }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-black/20">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                <Code size={48} />
                <p className="text-sm font-medium">Attente d'une compilation...</p>
              </div>
            ) : result.error ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono leading-relaxed">
                {result.error}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-mono text-xs leading-relaxed"
                >
                  {activeTab === 'tokens' && (
                    <div className="grid grid-cols-2 gap-2">
                      {(result.tokens || []).map((t, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between">
                          <span className="text-slate-500">[{i}]</span>
                          <span className="text-indigo-400 font-bold">{t}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'ast' && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <pre className="text-emerald-400 whitespace-pre-wrap">
                        {JSON.stringify({ type: 'Query', body: result.ast, source: result.source }, null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeTab === 'sql' && (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 text-[10px] font-bold text-indigo-500/50 uppercase">Target Code</div>
                        {result.sql}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        -- Cette requête a été optimisée pour PostgreSQL/TimescaleDB.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </GlassCard>

      </div>
    </motion.div>
  );
};

export default LabCompilation;
