import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Activity,
    Bot,
    BrainCircuit,
    ClipboardList,
    Database,
    Gauge,
    Send,
    ShieldCheck,
    Sparkles,
    Trash2,
    User,
    Zap,
} from 'lucide-react';

const suggestedPrompts = [
    'Resume les alertes critiques du reseau',
    'Analyse les capteurs hors service',
    'Quelles interventions sont prioritaires ?',
    'Prepare un rapport operationnel rapide',
];

const systemCards = [
    { label: 'Disponibilite', value: 'Live', icon: Activity, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    { label: 'Source', value: 'Neo-Sousse', icon: Database, tone: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
    { label: 'Mode', value: 'Analyste', icon: Gauge, tone: 'text-purple-300 bg-purple-400/10 border-purple-400/20' },
];

export default function ChatIA({ apiBase }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Systeme ARIA initialise. Je suis a votre ecoute pour toute requete analytique ou operationnelle sur le reseau Neo-Sousse.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await axios.post(`${apiBase}/chat`, { question: userMsg });
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: res.data.reponse || 'ARIA n a pas retourne de reponse.' },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Interruption du flux de donnees. Veuillez verifier la connexion au noyau central.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: 'Memoire locale reinitialisee. Nouvelle session active.',
            },
        ]);
    };

    const applyPrompt = (prompt) => {
        if (loading) return;
        setInput(prompt);
    };

    return (
        <section className="h-[calc(100vh-105px)] w-full max-w-7xl mx-auto animate-fade-in">
            <div className="h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d1b]/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="grid h-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex min-w-0 flex-col">
                        <header className="border-b border-white/10 bg-gradient-to-r from-purple-500/12 via-pink-500/8 to-transparent px-8 py-6">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/25 bg-gradient-to-br from-purple-500/25 to-pink-500/15 shadow-[0_0_34px_rgba(168,85,247,0.28)]">
                                            <BrainCircuit className="h-8 w-8 text-purple-200" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-4 border-[#080d1b] bg-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.28em] text-purple-200/70">
                                            Centre cognitif
                                        </p>
                                        <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
                                            ARIA Chat
                                        </h2>
                                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-300">
                                            Assistant operationnel pour analyser les capteurs, vehicules, interventions et rapports de la ville.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={resetChat}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
                                    title="Reinitialiser la conversation"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                {systemCards.map((card) => {
                                    const Icon = card.icon;
                                    return (
                                        <div
                                            key={card.label}
                                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${card.tone}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                                    {card.label}
                                                </p>
                                                <p className="text-sm font-black text-white">{card.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-8 py-7 custom-scrollbar">
                            <div className="space-y-6">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex max-w-[86%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                                                    msg.role === 'user'
                                                        ? 'border-pink-300/30 bg-pink-400/15 text-pink-100'
                                                        : 'border-purple-300/25 bg-purple-400/12 text-purple-100'
                                                }`}
                                            >
                                                {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                            </div>

                                            <div>
                                                <div
                                                    className={`whitespace-pre-wrap rounded-[1.35rem] border px-6 py-4 text-[15px] font-medium leading-7 shadow-xl ${
                                                        msg.role === 'user'
                                                            ? 'rounded-tr-md border-pink-300/20 bg-gradient-to-br from-pink-500/18 to-purple-500/10 text-white'
                                                            : 'rounded-tl-md border-white/10 bg-white/[0.055] text-slate-100'
                                                    }`}
                                                >
                                                    {msg.content}
                                                </div>
                                                <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                    {msg.role === 'user' ? 'Vous' : 'ARIA'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="flex max-w-[86%] gap-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-300/25 bg-purple-400/12">
                                                <Sparkles className="h-5 w-5 animate-spin text-purple-200" />
                                            </div>
                                            <div className="flex items-center gap-2 rounded-[1.35rem] rounded-tl-md border border-white/10 bg-white/[0.055] px-6 py-5">
                                                <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '0s' }} />
                                                <span className="h-2 w-2 animate-bounce rounded-full bg-pink-300" style={{ animationDelay: '0.2s' }} />
                                                <span className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </div>

                        <footer className="border-t border-white/10 bg-[#070b16]/80 px-8 py-5 backdrop-blur-xl">
                            <div className="relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Posez une question a ARIA..."
                                    rows={2}
                                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 pr-16 text-base font-medium text-white shadow-inner transition placeholder:text-slate-500 focus:bg-white/[0.075]"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-[0_12px_28px_rgba(168,85,247,0.34)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Envoyer"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </footer>
                    </div>

                    <aside className="hidden border-l border-white/10 bg-white/[0.035] p-6 xl:block">
                        <div className="rounded-2xl border border-white/10 bg-[#0c1324]/80 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/12 text-purple-200">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Session securisee</p>
                                    <p className="text-xs font-semibold text-slate-400">Connexion au noyau IA</p>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3 text-sm">
                                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                    <span className="text-slate-400">Latence</span>
                                    <span className="font-black text-emerald-300">Optimale</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Messages</span>
                                    <span className="font-black text-white">{messages.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="mb-3 flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-purple-300" />
                                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                    Questions rapides
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {suggestedPrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => applyPrompt(prompt)}
                                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold leading-6 text-slate-200 transition hover:border-purple-300/30 hover:bg-purple-400/10"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/12 to-pink-500/8 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-pink-200">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Conseil</p>
                                    <p className="mt-1 text-xs font-medium leading-5 text-slate-300">
                                        Demandez une synthese, une priorisation ou une action precise pour obtenir une reponse plus exploitable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
