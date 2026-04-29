import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, User, Bot, Trash2 } from 'lucide-react';

export default function ChatIA({ apiBase }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Bonjour ! Je suis ARIA, l'IA de gestion de Neo-Sousse 2030. Comment puis-je vous aider aujourd'hui ?" }
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
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await axios.post(`${apiBase}/chat`, { question: userMsg });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reponse }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Désolée, j'ai rencontré un problème technique lors de la connexion au serveur." }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: "Conversation réinitialisée. Que voulez-vous savoir ?" }]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] max-w-4xl mx-auto glass-card overflow-hidden">
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative">
                        <Bot className="text-white w-6 h-6" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#11141d] rounded-full" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-tight">ARIA Assistant</h3>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">IA Centrale de la Ville</p>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 text-gray-500 hover:text-rose-400 transition-colors"
                    title="Effacer le chat"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/10">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg'
                                    : 'bg-gray-800/80 text-gray-200 rounded-tl-none border border-gray-700/50'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex gap-4 max-w-[80%]">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                            </div>
                            <div className="p-4 bg-gray-800/80 rounded-2xl rounded-tl-none border border-gray-700/50 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-gray-800/20 border-t border-gray-800">
                <div className="flex gap-4 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Posez une question sur la base de données ou la ville..."
                        className="flex-1 bg-[#0f111a] border-2 border-gray-800 rounded-xl px-6 py-4 pr-16 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all active:scale-90 disabled:opacity-30 disabled:bg-gray-700"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-4 text-center">ARIA est connectée à la base PostgreSQL en lecture seule pour assurer la sécurité.</p>
            </div>
        </div>
    );
}
