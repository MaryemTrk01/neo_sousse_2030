import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
    Search,
    Download,
    MoreVertical,
    Cpu,
    MapPin,
    AlertTriangle,
    Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../SocketContext';

const STATUS_MAP = {
    ACTIF: {
        color: '#10b981',
        class: 'badge-actif',
        next: 'signaler',
        nextLabel: 'Signaler',
    },
    SIGNALE: {
        color: '#f59e0b',
        class: 'badge-signale',
        next: 'maintenir',
        nextLabel: 'Maintenance',
    },
    EN_MAINTENANCE: {
        color: '#facc15',
        class: 'badge-maintenance',
        next: 'declarer_hs',
        nextLabel: 'Hors Service',
    },
    INACTIF: {
        color: '#94a3b8',
        class: 'badge-inactif',
        next: 'activer',
        nextLabel: 'Activer',
    },
    HORS_SERVICE: {
        color: '#ef4444',
        class: 'badge-hs',
        next: null,
        nextLabel: null,
    },
};

const SOUSSE_CENTER = [35.8256, 10.6084];

const ZONES_COORDS = {
    'centre ville': [35.8256, 10.6084],
    medina: [35.827, 10.612],
    corniche: [35.835, 10.625],
    'port sousse': [35.832, 10.638],
    sahloul: [35.838, 10.595],
    khzema: [35.845, 10.61],
    'hammam sousse': [35.858, 10.598],
    kantaoui: [35.892, 10.598],
    riadh: [35.815, 10.585],
    bouhsina: [35.82, 10.6],
};

const getStablePosition = (capteur) => {
    const zoneKey = capteur.zone?.toLowerCase() || '';
    const base = ZONES_COORDS[zoneKey] || SOUSSE_CENTER;
    const id = Number(capteur.id) || 1;

    return {
        lat: base[0] + Math.sin(id * 12.9898) * 0.006,
        lng: base[1] + Math.cos(id * 78.233) * 0.006,
    };
};

const fallbackRiskLevel = (risk) => {
    if (risk >= 85) return 'Critique';
    if (risk >= 65) return 'Élevé';
    if (risk >= 40) return 'Moyen';
    return 'Faible';
};

const fallbackRiskColor = (level) => {
    const colors = {
        Faible: '#10b981',
        Moyen: '#facc15',
        Élevé: '#f97316',
        Critique: '#ef4444',
    };

    return colors[level] || '#10b981';
};

const getRiskStyle = (level, color) => {
    const selectedColor = color || fallbackRiskColor(level);

    return {
        color: selectedColor,
        bg: selectedColor.replace(')', ', 0.12)').replace('rgb', 'rgba'),
        border: selectedColor.replace(')', ', 0.30)').replace('rgb', 'rgba'),
    };
};

const hexToRgba = (hex, alpha) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeCapteurs = (list, predictions = []) => {
    const predictionById = new Map(
        (predictions || []).map((p) => [Number(p.id), p])
    );

    return (list || []).map((c) => {
        const p = getStablePosition(c);
        const prediction = predictionById.get(Number(c.id));
        const failureRisk = prediction?.failureRisk ?? 0;
        const riskLevel = prediction?.riskLevel ?? fallbackRiskLevel(failureRisk);
        const riskColor = prediction?.riskColor ?? fallbackRiskColor(riskLevel);

        return {
            ...c,
            lat: p.lat,
            lng: p.lng,
            failureRisk,
            riskLevel,
            riskColor,
            riskBg: hexToRgba(riskColor, 0.12),
            riskBorder: hexToRgba(riskColor, 0.3),
            riskReason:
                prediction?.riskReason ||
                'Prédiction IA indisponible pour ce capteur.',
        };
    });
};

export default function Capteurs({ apiBase }) {
    const [capteurs, setCapteurs] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [predictionSummary, setPredictionSummary] = useState({
        highRiskCount: 0,
        criticalRiskCount: 0,
        averageRisk: 0,
        mostRisky: null,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [riskFilter, setRiskFilter] = useState('ALL');
    const { socket } = useSocket();

    const fetchCapteurs = useCallback(async () => {
        try {
            const [capteursRes, predictionsRes] = await Promise.all([
                axios.get(`${apiBase}/capteurs`),
                axios.get(`${apiBase}/predictions/capteurs`),
            ]);

            const capteursData = capteursRes.data?.capteurs || [];
            const predictionsData = predictionsRes.data?.predictions || [];
            const summary = predictionsRes.data?.summary || {};

            setPredictions(predictionsData);
            setPredictionSummary({
                highRiskCount: summary.highRiskCount || 0,
                criticalRiskCount: summary.criticalRiskCount || 0,
                averageRisk: summary.averageRisk || 0,
                mostRisky: summary.mostRisky || null,
            });
            setCapteurs(normalizeCapteurs(capteursData, predictionsData));
        } catch (err) {
            console.error('Error fetching capteurs:', err);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetchCapteurs();

        const timer = setInterval(fetchCapteurs, 60000);

        const onCapteursUpdate = (data) => {
            if (Array.isArray(data)) {
                setCapteurs(normalizeCapteurs(data, predictions));
                setLoading(false);
                fetchCapteurs();
            } else {
                fetchCapteurs();
            }
        };

        const onPredictionsUpdate = (data) => {
            if (Array.isArray(data)) {
                setPredictions(data);
                setCapteurs((prev) => normalizeCapteurs(prev, data));
            }
        };

        if (socket) {
            socket.on('capteurs_update', onCapteursUpdate);
            socket.on('predictions_update', onPredictionsUpdate);
        }

        return () => {
            clearInterval(timer);

            if (socket) {
                socket.off('capteurs_update', onCapteursUpdate);
                socket.off('predictions_update', onPredictionsUpdate);
            }
        };
    }, [socket, fetchCapteurs, predictions]);

    const handleTransition = async (id, event) => {
        try {
            await axios.post(`${apiBase}/capteurs/${id}/transition`, { event });
            fetchCapteurs();
        } catch (err) {
            alert(err.response?.data?.error || 'Erreur de transition');
        }
    };

    const handlePlanIntervention = async (capteur) => {
        alert(
            `Intervention suggérée pour le capteur #${capteur.id}\n` +
                `Risque IA : ${capteur.failureRisk}% (${capteur.riskLevel})\n` +
                `Zone : ${capteur.zone}`
        );
    };

    const filtered = capteurs.filter((c) => {
        const s = search.toLowerCase();

        const matchSearch =
            String(c.id).includes(s) ||
            c.type?.toLowerCase().includes(s) ||
            c.zone?.toLowerCase().includes(s) ||
            c.riskLevel?.toLowerCase().includes(s);

        const matchStatus = statusFilter === 'ALL' || c.statut === statusFilter;
        const matchRisk = riskFilter === 'ALL' || c.riskLevel === riskFilter;

        return matchSearch && matchStatus && matchRisk;
    });

    const pieData = Object.entries(
        capteurs.reduce((acc, c) => {
            acc[c.statut] = (acc[c.statut] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    const orderedPieData = [
        'ACTIF',
        'EN_MAINTENANCE',
        'SIGNALE',
        'HORS_SERVICE',
        'INACTIF',
    ]
        .map((status) => pieData.find((item) => item.name === status))
        .filter(Boolean);

    const highRiskCapteurs = capteurs.filter((c) => c.failureRisk >= 65);
    const criticalRiskCapteurs = capteurs.filter((c) => c.failureRisk >= 85);
    const averageRisk = predictionSummary.averageRisk || 0;
    const mostRiskyFromSummary = predictionSummary.mostRisky;
    const mostRiskyCapteur = mostRiskyFromSummary
        ? normalizeCapteurs(
              [capteurs.find((c) => Number(c.id) === Number(mostRiskyFromSummary.id)) || mostRiskyFromSummary],
              [mostRiskyFromSummary]
          )[0]
        : highRiskCapteurs[0] || null;

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-12">
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                        Capteurs <span className="text-gradient">Urbains</span>
                    </h2>

                    <p className="text-text-muted font-medium mt-2">
                        Monitoring intelligent • Maintenance prédictive • Sousse Smart Grid
                    </p>
                </div>

                <button className="btn-primary flex items-center gap-2 w-fit">
                    <Download className="w-4 h-4" />
                    Rapport PDF
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neo-card rounded-[26px] p-6 relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-orange-500/20 blur-3xl rounded-full" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                                Risque de panne IA
                            </p>

                            <h3 className="text-4xl font-black text-white mt-3">
                                {predictionSummary.highRiskCount || highRiskCapteurs.length}
                            </h3>

                            <p className="text-sm text-gray-500 font-medium mt-1">
                                capteurs à risque élevé
                            </p>
                        </div>

                        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-orange-400" />
                        </div>
                    </div>
                </div>

                <div className="neo-card rounded-[26px] p-6 relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-cyan-500/20 blur-3xl rounded-full" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                                Risque moyen réseau
                            </p>

                            <h3 className="text-4xl font-black text-white mt-3">
                                {averageRisk}%
                            </h3>

                            <p className="text-sm text-gray-500 font-medium mt-1">
                                prédiction sur 48 heures
                            </p>
                        </div>

                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Activity className="w-7 h-7 text-cyan-400" />
                        </div>
                    </div>
                </div>

                <div className="neo-card rounded-[26px] p-6 relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-red-500/20 blur-3xl rounded-full" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                                Alerte critique
                            </p>

                            <h3 className="text-4xl font-black text-white mt-3">
                                {predictionSummary.criticalRiskCount || criticalRiskCapteurs.length}
                            </h3>

                            <p className="text-sm text-gray-500 font-medium mt-1">
                                intervention prioritaire
                            </p>
                        </div>

                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {mostRiskyCapteur && (
                <div className="neo-card rounded-[26px] p-5 border border-orange-500/20 bg-orange-500/[0.04]">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-orange-400" />
                            </div>

                            <div>
                                <h3 className="text-white font-black text-lg">
                                    Capteur #{mostRiskyCapteur.id} risque de tomber en panne
                                </h3>

                                <p className="text-sm text-gray-400 mt-1">
                                    {mostRiskyCapteur.riskReason}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span
                                className="px-4 py-2 rounded-xl text-sm font-black border"
                                style={{
                                    color: mostRiskyCapteur.riskColor,
                                    backgroundColor: mostRiskyCapteur.riskBg,
                                    borderColor: mostRiskyCapteur.riskBorder,
                                }}
                            >
                                {mostRiskyCapteur.failureRisk}% • {mostRiskyCapteur.riskLevel}
                            </span>

                            <button
                                onClick={() => handlePlanIntervention(mostRiskyCapteur)}
                                className="px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest hover:bg-orange-400 transition-all"
                            >
                                Planifier intervention
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8 items-stretch">
                <div className="2xl:col-span-2 neo-card p-2 min-h-[650px] relative overflow-hidden rounded-[28px]">
                    <div className="absolute top-6 left-6 z-[500] neo-glass px-4 py-3 rounded-xl border border-white/10 shadow-xl">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-turquoise" />

                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                Cartographie Live • {filtered.length} capteurs affichés
                            </span>
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 z-[500] neo-glass px-4 py-3 rounded-xl border border-orange-500/20 shadow-xl">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />

                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                {highRiskCapteurs.length} à risque
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-full rounded-[22px] overflow-hidden">
                        <MapContainer
                            center={SOUSSE_CENTER}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                            {filtered.map((c) => {
                                const highRisk = c.failureRisk >= 65;

                                return (
                                    <CircleMarker
                                        key={c.id}
                                        center={[c.lat, c.lng]}
                                        radius={highRisk ? 13 : 10}
                                        fillColor={
                                            highRisk
                                                ? c.riskColor
                                                : STATUS_MAP[c.statut]?.color || '#3b82f6'
                                        }
                                        fillOpacity={highRisk ? 0.9 : 0.75}
                                        stroke
                                        weight={highRisk ? 4 : 2}
                                        color={highRisk ? '#ffffff' : '#111827'}
                                        opacity={highRisk ? 0.85 : 0.45}
                                    >
                                        <Popup>
                                            <div className="bg-[#0d1117] text-white p-3 rounded-lg min-w-[180px]">
                                                <p className="font-black text-turquoise uppercase tracking-tighter">
                                                    Capteur #{c.id}
                                                </p>

                                                <p className="text-xs font-bold mt-1 opacity-80">
                                                    {c.type?.toUpperCase()} • {c.zone}
                                                </p>

                                                <p
                                                    className="text-[10px] mt-2 py-1 px-2 rounded inline-block"
                                                    style={{
                                                        backgroundColor:
                                                            STATUS_MAP[c.statut]?.color || '#3b82f6',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {c.statut}
                                                </p>

                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                        Risque IA 48h
                                                    </p>

                                                    <p
                                                        className="text-lg font-black"
                                                        style={{ color: c.riskColor }}
                                                    >
                                                        {c.failureRisk}% • {c.riskLevel}
                                                    </p>

                                                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                                        {c.riskReason}
                                                    </p>
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </MapContainer>
                    </div>
                </div>

                <div className="neo-card p-8 min-h-[650px] rounded-[28px] flex flex-col">
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8 border-l-4 border-turquoise pl-4">
                            Distribution Globale
                        </h4>

                        <div className="h-[300px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={orderedPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={115}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {orderedPieData.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={STATUS_MAP[entry.name]?.color || '#40e0d0'}
                                            />
                                        ))}
                                    </Pie>

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0d1117',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-4 mt-auto">
                        {orderedPieData.map((d) => (
                            <div
                                key={d.name}
                                className="flex justify-between items-center px-6 py-4 bg-white/5 rounded-2xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: STATUS_MAP[d.name]?.color || '#40e0d0' }}
                                    />

                                    <span className="text-[12px] font-black text-white uppercase tracking-wider">
                                        {d.name}
                                    </span>
                                </div>

                                <span className="text-xl font-black text-white">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="neo-card overflow-hidden rounded-[28px]">
                <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-black/10">
                    <div className="flex flex-col lg:flex-row gap-4 flex-1 min-w-[300px]">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim w-4 h-4 group-focus-within:text-turquoise transition-colors" />

                            <input
                                type="text"
                                placeholder="Filtrer par ID, type, zone ou risque..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-turquoise/50 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <select
                            className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:border-turquoise/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Tous les statuts</option>

                            {Object.keys(STATUS_MAP).map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </select>

                        <select
                            className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:border-turquoise/50"
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                        >
                            <option value="ALL">Tous les risques</option>
                            <option value="Faible">Faible</option>
                            <option value="Moyen">Moyen</option>
                            <option value="Élevé">Élevé</option>
                            <option value="Critique">Critique</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    Réf. Capteur
                                </th>

                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    Type / Technologie
                                </th>

                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    Zone Urbaine
                                </th>

                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    État Actuel
                                </th>

                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    Risque IA
                                </th>

                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">
                                    Contrôle Manuel
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-12 text-center text-text-dim italic">
                                        Synchronisation avec le réseau central...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-12 text-center text-text-dim italic">
                                        Aucun capteur trouvé.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((c, i) => (
                                    <motion.tr
                                        key={c.id}
                                        className="hover:bg-white/[0.02] transition-colors"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.01 }}
                                    >
                                        <td className="px-8 py-5 font-black text-turquoise tracking-tighter text-base">
                                            #{c.id}
                                        </td>

                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <Cpu className="w-4 h-4 text-blue-400" />
                                                </div>

                                                <span className="text-white font-bold text-sm uppercase tracking-wide">
                                                    {c.type}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-5 text-sm font-semibold text-text-muted">
                                            {c.zone}
                                        </td>

                                        <td className="px-8 py-5">
                                            <span className={`badge ${STATUS_MAP[c.statut]?.class || 'badge-inactif'}`}>
                                                <span className="status-dot bg-current" />
                                                {c.statut}
                                            </span>
                                        </td>

                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-2 min-w-[170px]">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border"
                                                        style={{
                                                            color: c.riskColor,
                                                            backgroundColor: c.riskBg,
                                                            borderColor: c.riskBorder,
                                                        }}
                                                    >
                                                        {c.riskLevel}
                                                    </span>

                                                    <span className="text-white font-black text-sm">
                                                        {c.failureRisk}%
                                                    </span>
                                                </div>

                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${c.failureRisk}%`,
                                                            backgroundColor: c.riskColor,
                                                        }}
                                                    />
                                                </div>

                                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                                    {c.riskReason}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-8 py-5">
                                            {STATUS_MAP[c.statut]?.next ? (
                                                <button
                                                    onClick={() => handleTransition(c.id, STATUS_MAP[c.statut].next)}
                                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-turquoise hover:text-black hover:border-turquoise transition-all uppercase tracking-widest flex items-center gap-2"
                                                >
                                                    <MoreVertical className="w-3 h-3" />
                                                    {STATUS_MAP[c.statut].nextLabel}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                    Finalisé
                                                </span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
