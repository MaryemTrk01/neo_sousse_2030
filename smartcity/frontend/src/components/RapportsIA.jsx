import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
    FileText, 
    RefreshCw, 
    Printer, 
    Download, 
    FileSpreadsheet, 
    Lightbulb, 
    Activity 
} from 'lucide-react';

const PRIORITY_STYLES = {
    haute: { bg: 'bg-rose-500/5', border: 'border-rose-500/20', text: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400' },
    moyenne: { bg: 'bg-sand/5', border: 'border-sand/20', text: 'text-sand', badge: 'bg-sand/10 text-sand' },
    basse: { bg: 'bg-turquoise/5', border: 'border-turquoise/20', text: 'text-turquoise', badge: 'bg-turquoise/10 text-turquoise' },
}

export default function RapportsIA({ api }) {
    const [rapport, setRapport] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [loadingR, setLoadingR] = useState(false)
    const [loadingS, setLoadingS] = useState(false)

    const fetchRapport = async () => {
        setLoadingR(true)
        try { const r = await axios.get(`${api}/rapport`); setRapport(r.data.rapport || 'Aucun rapport actif') }
        catch { setRapport('Échec de la synchronisation avec le noyau analytique.') }
        finally { setLoadingR(false) }
    }

    const fetchSuggestions = async () => {
        setLoadingS(true)
        try { const r = await axios.get(`${api}/suggestions`); setSuggestions(r.data.suggestions || []) }
        catch { setSuggestions([{ priorite: 'haute', message: 'Erreur de connexion au serveur de recommandations.', type: 'error' }]) }
        finally { setLoadingS(false) }
    }

    useEffect(() => { fetchRapport(); fetchSuggestions() }, [api])

    return (
        <div className="space-y-10 animate-fade-in max-w-6xl mx-auto">
            <header className="flex items-center justify-between flex-wrap gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Rapports <span className="text-gradient">Analytiques</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-1">Intelligence décisionnelle et synthèse stratégique • Neo-Sousse 2030</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => {}} className="p-3 neo-glass rounded-2xl border border-white/5 text-text-dim hover:text-white transition-all"><Printer className="w-5 h-5" /></button>
                    <button onClick={() => {}} className="p-3 neo-glass rounded-2xl border border-white/5 text-text-dim hover:text-white transition-all"><FileSpreadsheet className="w-5 h-5" /></button>
                    <button onClick={() => {}} className="btn-primary flex items-center gap-3 px-6 shadow-turquoise/20">
                        <Download className="w-4 h-4" /> 
                        <span className="font-black uppercase tracking-widest text-[10px]">Exporter PDF</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 space-y-8">
                    <div className="neo-card p-10 relative overflow-hidden bg-black/40">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-turquoise/5 blur-3xl rounded-full" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-turquoise/10 rounded-2xl border border-turquoise/20"><FileText className="w-6 h-6 text-turquoise" /></div>
                                <h3 className="text-xl font-black text-white tracking-tight">Synthèse Opérationnelle</h3>
                            </div>
                            <button onClick={fetchRapport} disabled={loadingR}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-turquoise border border-turquoise/20 rounded-xl hover:bg-turquoise/10 transition-all disabled:opacity-50 font-black text-[10px] uppercase tracking-widest">
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingR ? 'animate-spin' : ''}`} /> 
                                Régénérer
                            </button>
                        </div>
                        
                        <div className="relative">
                            {loadingR ? (
                                <div className="space-y-4">
                                    {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-white/5 rounded-full animate-pulse" style={{ width: `${95 - i * 8}%` }} />)}
                                </div>
                            ) : (
                                <div className="bg-black/20 p-8 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <pre className="whitespace-pre-wrap text-base text-white/80 leading-relaxed font-medium font-sans">
                                        {rapport}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="neo-card p-10 bg-gradient-to-br from-sand/10 to-transparent">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-sand/10 rounded-2xl border border-sand/20"><Lightbulb className="w-6 h-6 text-sand" /></div>
                                <h3 className="text-xl font-black text-white tracking-tight">Vigilance IA</h3>
                            </div>
                            <button onClick={fetchSuggestions} disabled={loadingS} className="p-2 hover:bg-white/5 rounded-xl transition-all text-sand/60">
                                <RefreshCw className={`w-4 h-4 ${loadingS ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {loadingS ? (
                                [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)
                            ) : suggestions.map((s, i) => {
                                const style = PRIORITY_STYLES[s.priorite] || PRIORITY_STYLES.basse
                                return (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                        className={`p-6 rounded-3xl ${style.bg} border ${style.border} group hover:scale-[1.02] transition-all`}>
                                        <div className="flex items-start gap-4">
                                            <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-[0.1em] shrink-0 ${style.badge} shadow-sm`}>
                                                {s.priorite}
                                            </span>
                                            <p className={`text-sm font-bold leading-relaxed ${style.text} group-hover:text-white transition-colors`}>{s.message}</p>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="neo-card p-8 text-center border-dashed border-white/5 bg-white/[0.01]">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-8 h-8 text-turquoise opacity-40" />
                        </div>
                        <h4 className="font-black text-white mb-2 text-sm uppercase tracking-widest">Noyau Décisionnel</h4>
                        <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest leading-relaxed">Analyses propulsées par<br/>Llama 3 & TimescaleDB Core</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
