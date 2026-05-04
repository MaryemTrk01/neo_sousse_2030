import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Accueil from './components/Accueil';
import Capteurs from './components/Capteurs';
import Interventions from './components/Interventions';
import QualiteAir from './components/QualiteAir';
import Compilateur from './components/Compilateur';
import Rapports from './components/Rapports';
import Automates from './components/Automates';
import ChatIA from './components/ChatIA';
import Vehicules from './components/Vehicules';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { SocketProvider, useSocket } from './SocketContext';

const API_BASE = '/api';

function AppContent() {
    const [activePage, setActivePage] = useState('dashboard');
    const [globalStats, setGlobalStats] = useState(null);
    const [alertsCount, setAlertsCount] = useState(0);
    const [vehiculesPanne, setVehiculesPanne] = useState(0);
    const [showNotification, setShowNotification] = useState(null);

    const { socket, lastAlert } = useSocket();

    const applyStats = useCallback((data) => {
        if (!data) return;

        setGlobalStats(data);
        setAlertsCount((data.capteurs_hs || 0) + (data.capteurs_signales || 0));
        setVehiculesPanne(data.vehicules_en_panne || 0);
    }, []);

    const applyCapteursToDashboard = useCallback((capteurs) => {
        if (!Array.isArray(capteurs)) return;

        const capteurs_actifs = capteurs.filter(c => c.statut === 'ACTIF').length;
        const capteurs_hs = capteurs.filter(c => c.statut === 'HORS_SERVICE').length;
        const capteurs_signales = capteurs.filter(c => c.statut === 'SIGNALE').length;
        const capteurs_maintenance = capteurs.filter(c => c.statut === 'EN_MAINTENANCE').length;
        const capteurs_inactifs = capteurs.filter(c => c.statut === 'INACTIF').length;

        setGlobalStats(prev => ({
            ...(prev || {}),
            total_capteurs: capteurs.length,
            capteurs_actifs,
            capteurs_hs,
            capteurs_signales,
            capteurs_maintenance,
            capteurs_inactifs,
        }));

        setAlertsCount(capteurs_hs + capteurs_signales);
    }, []);

    const applyVehiculesToDashboard = useCallback((vehicules) => {
        if (!Array.isArray(vehicules)) return;

        const vehicules_en_route = vehicules.filter(v => v.statut === 'EN_ROUTE').length;
        const vehicules_en_panne = vehicules.filter(v => v.statut === 'EN_PANNE').length;
        const vehicules_stationnes = vehicules.filter(v => v.statut === 'STATIONNE').length;
        const vehicules_arrives = vehicules.filter(v => v.statut === 'ARRIVE').length;

        setGlobalStats(prev => ({
            ...(prev || {}),
            total_vehicules: vehicules.length,
            vehicules_en_route,
            vehicules_en_panne,
            vehicules_stationnes,
            vehicules_arrives,
        }));

        setVehiculesPanne(vehicules_en_panne);
    }, []);

    const applyInterventionsToDashboard = useCallback((interventions) => {
        if (!Array.isArray(interventions)) return;

        const interventions_terminees = interventions.filter(i => i.statut === 'TERMINE').length;
        const interventions_en_cours = interventions.filter(i => i.statut !== 'TERMINE').length;

        setGlobalStats(prev => ({
            ...(prev || {}),
            total_interventions: interventions.length,
            interventions_en_cours,
            interventions_terminees,
        }));
    }, []);

    const fetchGlobal = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/dashboard`);
            applyStats(res.data);
        } catch (err) {
            console.error("Erreur dashboard", err);
        }
    }, [applyStats]);

    useEffect(() => {
        fetchGlobal();

        const dashboardTimer = setInterval(fetchGlobal, 60000);

        const onMetricsUpdate = (data) => {
            console.log("Dashboard metrics_update reçu", data);
            applyStats(data);
        };

        const onCapteursUpdate = (capteurs) => {
            console.log("Dashboard capteurs_update reçu", capteurs?.length);
            applyCapteursToDashboard(capteurs);
        };

        const onVehicleUpdate = (vehicules) => {
            applyVehiculesToDashboard(vehicules);
        };

        const onInterventionUpdate = (interventions) => {
            applyInterventionsToDashboard(interventions);
        };

        const onStatusChange = () => {
            fetchGlobal();
        };

        if (socket) {
            socket.on("metrics_update", onMetricsUpdate);
            socket.on("capteurs_update", onCapteursUpdate);
            socket.on("vehicle_update", onVehicleUpdate);
            socket.on("intervention_update", onInterventionUpdate);
            socket.on("status_change", onStatusChange);
        }

        return () => {
            clearInterval(dashboardTimer);
            if (socket) {
                socket.off("metrics_update", onMetricsUpdate);
                socket.off("capteurs_update", onCapteursUpdate);
                socket.off("vehicle_update", onVehicleUpdate);
                socket.off("intervention_update", onInterventionUpdate);
                socket.off("status_change", onStatusChange);
            }
        };
    }, [socket, fetchGlobal, applyStats, applyCapteursToDashboard, applyVehiculesToDashboard, applyInterventionsToDashboard]);

    useEffect(() => {
        if (lastAlert) {
            setShowNotification(lastAlert);
            const timer = setTimeout(() => setShowNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [lastAlert]);

    const renderPage = () => {
        const props = { apiBase: API_BASE, api: API_BASE, globalStats };

        switch (activePage) {
            case 'dashboard':
                return <Accueil {...props} />;
            case 'capteurs':
                return <Capteurs {...props} />;
            case 'vehicules':
                return <Vehicules {...props} />;
            case 'interventions':
                return <Interventions {...props} />;
            case 'air':
                return <QualiteAir {...props} />;
            case 'compiler':
                return <Compilateur {...props} />;
            case 'reports':
                return <Rapports {...props} />;
            case 'automates':
                return <Automates {...props} />;
            case 'chat':
                return <ChatIA {...props} />;
            default:
                return <Accueil {...props} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#0f111a] text-white">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                alertsCount={alertsCount}
                vehiculesPanne={vehiculesPanne}
            />

            <main className="ml-64 min-h-screen p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePage}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        {renderPage()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {showNotification && (
                <div className="fixed top-6 right-6 z-[9999] max-w-sm rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-100 shadow-2xl backdrop-blur-xl">
                    <p className="text-sm font-black uppercase tracking-widest">Alerte</p>
                    <p className="mt-1 text-sm">{showNotification.message}</p>
                </div>
            )}
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
