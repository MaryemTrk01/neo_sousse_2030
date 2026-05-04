import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { compilerApi } from '../api/api';
import GlassCard from '../components/GlassCard';
import { Terminal, Code, Database, Table, Download, Play, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const Compiler = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sql');
  const [metrics, setMetrics] = useState({ time: 0, tokens: 0 });

  const examples = [
    "Affiche les 5 zones les plus polluées",
    "Combien de capteurs sont hors service ?",
    "Quels citoyens ont un score écologique > 80 ?",
    "Montre les mesures des dernières 24 heures"
  ];

  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      setMetrics({ time: 0, tokens: 0 });
      return;
    }

    const timer = setTimeout(() => {
      handleCompile(query, true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleCompile = async (textToCompile, silent = false) => {
    const queryText = typeof textToCompile === 'string' ? textToCompile : query;

    if (!queryText.trim()) {
      if (!silent) toast.error("Please enter a query");
      return;
    }

    setLoading(true);
    const compileStart = performance.now();

    try {
      const compileRes = await compilerApi.compile(queryText);
      const sql = compileRes.data.sql;

      setResult({ ...compileRes.data, results: null, type: 'compile' });
      setActiveTab('sql');

      setMetrics({
        time: (performance.now() - compileStart).toFixed(2),
        tokens: compileRes.data.tokens?.length || 0
      });

      const execStart = performance.now();
      const execRes = await compilerApi.execute(sql);

      setResult({
        ...compileRes.data,
        results: execRes.data.results || [],
        type: 'execute'
      });

      setActiveTab('results');

      setMetrics(prev => ({
        ...prev,
        execTime: (performance.now() - execStart).toFixed(2)
      }));

      if (!silent) toast.success("Query compiled and executed successfully!");
    } catch (err) {
      console.error(err);
      if (!silent) {
        toast.error(err.response?.data?.detail || "Compilation / execution failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result?.sql) {
      toast.error("Compile first");
      return;
    }

    setLoading(true);
    const start = performance.now();

    try {
      const res = await compilerApi.execute(result.sql);

      setResult({
        ...result,
        results: res.data.results || [],
        type: 'execute'
      });

      setActiveTab('results');

      setMetrics(prev => ({
        ...prev,
        execTime: (performance.now() - start).toFixed(2)
      }));

      toast.success("Query executed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result?.results || result.results.length === 0) return;

    const keys = Object.keys(result.results[0]).join(',');
    const rows = result.results.map(row =>
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');

    const csv = `${keys}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'query_results.csv';
    a.click();

    toast.success("Exported to CSV");
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }} className="h-full flex flex-col space-y-6">

      <header className="flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-rajdhani font-bold text-white">Natural Language Compiler</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-darkNavy">AI-Powered</span>
          </div>
          <p className="text-slate-400">Translate French natural language directly into execution-ready SQL.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border-[#00d4ff]/30">
          <div className="p-4 border-b border-slate-700/50 bg-[#0a0f1e]/80 flex items-center gap-2">
            <Terminal size={18} className="text-[#00d4ff]" />
            <span className="font-mono text-sm text-[#00d4ff]">Query_Input.nl</span>
          </div>

          <div className="flex-1 p-6 flex flex-col relative group">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Affiche les 5 zones les plus polluées..."
              className="w-full h-48 bg-transparent text-[#00ff88] font-mono text-lg resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed"
            />

            <div className="mt-auto space-y-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Quick Examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(ex);
                      handleCompile(ex);
                    }}
                    className="text-xs bg-slate-800 hover:bg-[#00d4ff]/20 text-slate-300 hover:text-[#00d4ff] px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-700/50 bg-[#0a0f1e]/80 flex gap-4">
            <button
              onClick={() => handleCompile()}
              disabled={loading || !query.trim()}
              className="flex-1 flex justify-center items-center gap-2 py-3 bg-[rgba(0,212,255,0.1)] hover:bg-[rgba(0,212,255,0.2)] text-[#00d4ff] font-bold rounded-xl border border-[rgba(0,212,255,0.4)] shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all disabled:opacity-50"
            >
              <Code size={18} /> Compile + Execute ✨
            </button>

            <button
              onClick={handleExecute}
              disabled={loading || !result?.sql}
              className="flex-1 flex justify-center items-center gap-2 py-3 bg-[rgba(0,255,136,0.1)] hover:bg-[rgba(0,255,136,0.2)] text-[#00ff88] font-bold rounded-xl border border-[rgba(0,255,136,0.4)] shadow-[0_0_15px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50"
            >
              <Play size={18} /> Execute ▶
            </button>
          </div>
        </GlassCard>

        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex border-b border-slate-700/50 bg-[#0a0f1e]/80">
            {[
              { id: 'sql', label: 'SQL Generated', icon: Database },
              { id: 'ast', label: 'AST Tree', icon: Code },
              { id: 'results', label: 'Results', icon: Table }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/5' : 'border-transparent text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto bg-[#050810] p-6 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'sql' && (
                <motion.div key="sql" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full">
                  {result?.sql ? (
                    <pre className="text-[#00d4ff] font-mono whitespace-pre-wrap">{result.sql}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                      Waiting for compilation...
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'ast' && (
                <motion.div key="ast" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full">
                  {result?.ast ? (
                    <pre className="text-[#a855f7] font-mono whitespace-pre-wrap">{result.ast}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                      AST not available...
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'results' && (
                <motion.div key="results" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col">
                  {result?.results ? (
                    result.results.length > 0 ? (
                      <>
                        <div className="flex justify-end mb-4">
                          <button onClick={exportCSV} className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600">
                            <Download size={14} /> Export CSV
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded border border-slate-800">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                              <tr>
                                {Object.keys(result.results[0]).map(k => (
                                  <th key={k} className="px-4 py-3">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.results.map((row, i) => (
                                <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                                  {Object.values(row).map((v, j) => (
                                    <td key={j} className="px-4 py-3">{String(v)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-yellow-400 font-mono text-sm">
                        Query executed, but returned 0 rows.
                      </div>
                    )
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                      Execute a query to see results...
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-slate-700/50 bg-[#0a0f1e] flex justify-between items-center text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#00ff88]" />
                Status: {loading ? "Processing..." : "Ready"}
              </span>
              <span>Tokens: {metrics.tokens}</span>
            </div>
            <span>
              Time: {metrics.time}ms {metrics.execTime ? `| Exec: ${metrics.execTime}ms` : ''}
            </span>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default Compiler;