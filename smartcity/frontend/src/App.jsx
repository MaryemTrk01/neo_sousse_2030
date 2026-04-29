import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Accueil from './components/Accueil';
import Capteurs from './components/Capteurs';
import Interventions from './components/Interventions';
import QualiteAir from './components/QualiteAir';
import Compilateur from './components/Compilateur';
import LabCompilation from './components/LabCompilation';
import Rapports from './components/Rapports';
import Automates from './components/Automates';
import CarteUrbaine from './components/CarteUrbaine';
import ChatIA from './components/ChatIA';
import Statistiques from './components/Statistiques';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { SocketProvider, useSocket } from './SocketContext';
import Vehicules from './components/Vehicules';


const API_BASE = '/api';

function AppContent() {
    const [activePage, setActivePage] = useState('dashboard');
    const [globalStats, setGlobalStats] = useState(null);
    const [alertsCount, setAlertsCount] = useState(0);
    const [showNotification, setShowNotification] = useState(null);
    const { socket, lastAlert } = useSocket();

    // Init et WebSockets
    useEffect(() => {
        // Initial fetch
        const fetchGlobal = async () => {
            try {
                const res = await axios.get(`${API_BASE}/dashboard`);
                setGlobalStats(res.data);
                setAlertsCount(res.data.capteurs_hs || 0);
            } catch (err) {
                console.error("Erreur initial fetch", err);
            }
        };
        fetchGlobal();

        if (socket) {
            // Mise à jour temps réel des métriques (toutes les 10s via le serveur)
            socket.on('metrics_update', (data) => {
                console.log("📈 Real-time metrics update", data);
                setGlobalStats(data);
                setAlertsCount(data.capteurs_hs || 0);
            });

            // Changements de statut automates
            socket.on('status_change', (data) => {
                console.log("🔄 Status change detected", data);
                // On peut déclencher un rafraîchissement ou une alerte
            });
        }
    }, [socket]);

    // Gestion des alertes entrantes
    useEffect(() => {
        if (lastAlert) {
            setShowNotification(lastAlert);
            const timer = setTimeout(() => setShowNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [lastAlert]);

    const renderPage = () => {
        const props = { apiBase: API_BASE, globalStats };
        switch (activePage) {
            case 'dashboard': return <Accueil {...props} />;
            case 'capteurs': return <Capteurs {...props} />;
            case 'interventions': return <Interventions {...props} />;
            case 'air': return <QualiteAir {...props} />;
            case 'compiler': return <Compilateur {...props} />;
            case 'lab': return <LabCompilation {...props} />;
            case 'reports': return <Rapports {...props} />;
            case 'automates': return <Automates {...props} />;
            case 'map': return <CarteUrbaine {...props} />;
            case 'chat': return <ChatIA {...props} />;
            case 'stats': return <Statistiques {...props} />;
            case 'vehicules': return <Vehicules {...props} />;
            default: return <Accueil {...props} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans relative">
            {/* Notification Toast */}
            <AnimatePresence>
                {showNotification && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed top-6 right-6 z-[100] bg-red-900/40 backdrop-blur-xl border border-red-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px]"
                    >
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-red-400 capitalize">{showNotification.type}</h4>
                            <p className="text-sm text-red-100">{showNotification.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                alertsCount={alertsCount}
                vehiculesPanne={globalStats?.vehicules?.en_panne || 0}
            />

            <main className="flex-1 ml-64 overflow-y-auto relative h-full">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10 pointer-events-none" />

                <div className="p-8 max-w-[1600px] mx-auto min-h-full flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1"
                        >
                            {renderPage()}
                        </motion.div>
                    </AnimatePresence>

                    <footer className="mt-auto pt-10 pb-4 border-t border-gray-800/30 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest">
                        <p>© 2030 Neo-Sousse Smart City Platform</p>
                        <p>Connecté au cluster central-01 | Real-time Active</p>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <SocketProvider>
            <AppContent />
        </SocketProvider>
    );
}