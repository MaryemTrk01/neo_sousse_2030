import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, Trash2, User } from 'lucide-react';

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

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] max-w-5xl mx-auto neo-card overflow-hidden bg-black/40 animate-fade-in">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-turquoise/5 to-transparent">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-bg-deep flex items-center justify-center border border-turquoise/30 shadow-[0_0_20px_rgba(64,224,208,0.2)]">
                            <Bot className="text-turquoise w-8 h-8" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-turquoise rounded-full border-4 border-bg-deep animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tighter">ARIA Assistant</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full bg-turquoise animate-ping" />
                            <span className="text-[10px] text-turquoise font-black uppercase tracking-[0.2em]">
                                Coeur Cognitif Actif
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={resetChat}
                    className="p-3 text-text-dim hover:text-rose-400 hover:bg-rose-500/5 rounded-2xl transition-all"
                    title="Reinitialiser la conversation"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-4 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 ${msg.role === 'user' ? 'bg-turquoise text-black' : 'bg-white/5 text-turquoise'}`}>
                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                            </div>
                            <div className={`p-6 rounded-3xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-white/10 text-white rounded-tr-none border border-white/10 shadow-2xl backdrop-blur-md'
                                : 'neo-glass text-white/90 rounded-tl-none border-turquoise/20'
                                }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="flex gap-4 max-w-[75%]">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Sparkles className="w-5 h-5 text-turquoise animate-spin" />
                            </div>
                            <div className="p-6 neo-glass rounded-3xl rounded-tl-none border-turquoise/20 flex gap-2">
                                <span className="w-2 h-2 bg-turquoise rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <span className="w-2 h-2 bg-turquoise rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="w-2 h-2 bg-turquoise rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <div className="p-8 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Interrogez ARIA sur les statistiques, l'etat des services..."
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 pr-20 text-sm font-medium text-white focus:outline-none focus:border-turquoise/50 focus:bg-white/[0.08] transition-all placeholder-white/20 shadow-inner"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-turquoise hover:bg-turquoise/80 text-black rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(64,224,208,0.4)] active:scale-90 disabled:opacity-20 disabled:grayscale"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="mt-6 flex justify-center items-center gap-6 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-turquoise" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Securite SSL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-turquoise" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Noyau Ollama</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-turquoise" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Mode Analyste</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
