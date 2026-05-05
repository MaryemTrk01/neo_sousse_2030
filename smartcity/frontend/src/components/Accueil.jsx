import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Cpu,
    Wrench,
    Car,
    AlertTriangle,
    ArrowUpRight,
    ShieldCheck,
    BarChart3,
    Clock,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import { useSocket } from '../SocketContext';

const getColorText = (color) => {
    const colors = {
        blue: '#60a5fa',
        rose: '#fb7185',
        amber: '#fbbf24',
        cyan: '#22d3ee',
        emerald: '#34d399',
    };

    return colors[color] || '#40e0d0';
};

const getColorBg = (color) => {
    const colors = {
        blue: 'rgba(59, 130, 246, 0.10)',
        rose: 'rgba(244, 63, 94, 0.10)',
        amber: 'rgba(245, 158, 11, 0.10)',
        cyan: 'rgba(6, 182, 212, 0.10)',
        emerald: 'rgba(16, 185, 129, 0.10)',
    };

    return colors[color] || 'rgba(64, 224, 208, 0.10)';
};

const getColorBorder = (color) => {
    const colors = {
        blue: 'rgba(59, 130, 246, 0.20)',
        rose: 'rgba(244, 63, 94, 0.20)',
        amber: 'rgba(245, 158, 11, 0.20)',
        cyan: 'rgba(6, 182, 212, 0.20)',
        emerald: 'rgba(16, 185, 129, 0.20)',
    };

    return colors[color] || 'rgba(64, 224, 208, 0.20)';
};

const clamp = (value, min = 0, max = 100) => {
    return Math.min(max, Math.max(min, value));
};

const getEcoScoreGradient = (score) => {
    if (score >= 75) {
        return 'linear-gradient(90deg, #10b981, #34d399)';
    }

    if (score >= 50) {
        return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    }

    return 'linear-gradient(90deg, #ef4444, #fb7185)';
};

const getEcoScoreShadow = (score) => {
    if (score >= 75) {
        return '0 0 18px rgba(16, 185, 129, 0.55)';
    }

    if (score >= 50) {
        return '0 0 18px rgba(245, 158, 11, 0.55)';
    }

    return '0 0 18px rgba(239, 68, 68, 0.55)';
};

const buildMesuresByType = (mesures = []) => {
    const grouped = {};

    mesures.forEach((item) => {
        const type = item.type_mesure || item.type || 'inconnu';
        const value = Number(item.valeur);

        if (!Number.isFinite(value)) return;

        if (!grouped[type]) {
            grouped[type] = { total: 0, count: 0 };
        }

        grouped[type].total += value;
        grouped[type].count += 1;
    });

    return Object.entries(grouped)
        .map(([type_mesure, data]) => ({
            type_mesure,
            moyenne: Number((data.total / data.count).toFixed(2)),
        }))
        .sort((a, b) => a.type_mesure.localeCompare(b.type_mesure));
};

const StatCard = ({ label, value, icon: Icon, color, subValue, trend }) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        className="neo-card p-5 flex flex-col gap-4 relative overflow-hidden group min-h-[145px]"
    >
        <div
            className="absolute -right-4 -top-4 w-24 h-24 blur-3xl rounded-full"
            style={{ backgroundColor: getColorBg(color) }}
        />

        <div className="flex justify-between items-start z-10">
            <div
                className="p-3 rounded-2xl border"
                style={{
                    backgroundColor: getColorBg(color),
                    borderColor: getColorBorder(color),
                }}
            >
                <Icon className="w-5 h-5" style={{ color: getColorText(color) }} />
            </div>

            {trend !== undefined && (
                <div
                    className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                        trend >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                    }`}
                >
                    <ArrowUpRight
                        className={`w-3 h-3 ${trend < 0 ? 'rotate-90' : ''}`}
                    />
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div className="z-10">
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                {label}
            </p>

            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-white tracking-tighter">
                    {value ?? 0}
                </h3>

                {subValue && (
                    <span className="text-xs text-gray-500 font-medium">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    </motion.div>
);

export default function Accueil({ globalStats }) {
    const { socket, connected } = useSocket();
    const [currentTime, setCurrentTime] = useState(
        new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    );
    const [liveMesuresByType, setLiveMesuresByType] = useState([]);
    const liveStats = globalStats;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(
                new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                })
            );
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setLiveMesuresByType(globalStats?.mesures_by_type || []);
    }, [globalStats?.mesures_by_type]);

    useEffect(() => {
        if (!socket) return undefined;

        const onMeasuresUpdate = (mesures) => {
            if (!Array.isArray(mesures)) return;
            setLiveMesuresByType(buildMesuresByType(mesures));
        };

        socket.on('measures_update', onMeasuresUpdate);
        return () => socket.off('measures_update', onMeasuresUpdate);
    }, [socket]);

    if (!liveStats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="neo-card h-40 animate-pulse bg-white/5"
                    />
                ))}
            </div>
        );
    }

    const chartData = liveStats.measure_chart_data || [];
    const mesuresByType = liveMesuresByType.length > 0
        ? liveMesuresByType
        : liveStats.mesures_by_type || [];

    const anomalies =
        (liveStats.capteurs_hs || 0) +
        (liveStats.capteurs_signales || 0);

    const totalCapteurs = liveStats.total_capteurs || 0;
    const totalVehicules = liveStats.total_vehicules || 0;
    const totalInterventions = liveStats.total_interventions || 0;

    const capteursActifs = liveStats.capteurs_actifs || 0;
    const vehiculesEnPanne = liveStats.vehicules_en_panne || 0;
    const interventionsTerminees = liveStats.interventions_terminees || 0;

    const scoreCapteurs =
        totalCapteurs > 0
            ? (capteursActifs / totalCapteurs) * 40
            : 0;

    const scoreAnomalies =
        totalCapteurs > 0
            ? (1 - anomalies / totalCapteurs) * 25
            : 0;

    const scoreVehicules =
        totalVehicules > 0
            ? (1 - vehiculesEnPanne / totalVehicules) * 20
            : 0;

    const scoreInterventions =
        totalInterventions > 0
            ? (interventionsTerminees / totalInterventions) * 15
            : 15;

    const ecoScore = Math.round(
        clamp(
            scoreCapteurs +
                scoreAnomalies +
                scoreVehicules +
                scoreInterventions
        )
    );

    const stats = [
        {
            label: 'Capteurs Actifs',
            value: liveStats.capteurs_actifs,
            subValue: `/ ${liveStats.total_capteurs || 0}`,
            icon: Cpu,
            color: 'blue',
            trend: 8,
        },
        {
            label: 'Anomalies',
            value: anomalies,
            subValue: 'signalés + HS',
            icon: AlertTriangle,
            color: 'rose',
            trend: -12,
        },
        {
            label: 'Capteurs Maintenance',
            value: liveStats.capteurs_maintenance,
            subValue: 'capteurs',
            icon: Wrench,
            color: 'amber',
            trend: 4,
        },
        {
            label: 'Mobilité Live',
            value: liveStats.vehicules_en_route,
            subValue: 'véhicules',
            icon: Car,
            color: 'cyan',
            trend: 22,
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2">
                        Neo-Sousse <span className="text-gradient">2030</span>
                    </h1>

                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-turquoise uppercase tracking-widest">
                            Hyper-connectée
                        </span>

                        <span className="text-sm text-gray-400">
                            Session Live • {liveStats.date || 'Aujourd’hui'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="neo-glass flex items-center gap-3 rounded-2xl border border-white/5 px-5 py-3">
                        <Clock className="h-4 w-4 text-purple-300" />
                        <span className="font-mono text-sm font-black text-white">
                            {currentTime}
                        </span>
                    </div>

                    <div className="px-6 py-3 neo-glass rounded-2xl border border-white/5 text-[10px] font-black text-white uppercase tracking-widest">
                        {connected ? 'Socket connecté' : 'Sync 60s'}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {stats.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="xl:col-span-2 neo-card p-6 min-h-[520px]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">
                                Flux Énergétique & Données
                            </h3>

                            <p className="text-sm text-gray-400">
                                Activité réelle des mesures depuis la base
                                PostgreSQL/TimescaleDB
                            </p>
                        </div>
                    </div>

                    <div className="h-[390px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{
                                    top: 10,
                                    right: 20,
                                    left: -10,
                                    bottom: 5,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="colorVal"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#40e0d0"
                                            stopOpacity={0.4}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#40e0d0"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.05)"
                                />

                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={11}
                                />

                                <YAxis stroke="#64748b" fontSize={11} />

                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0d1117',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                        color: '#ffffff',
                                    }}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#40e0d0"
                                    strokeWidth={3}
                                    fill="url(#colorVal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="neo-card p-6 min-h-[250px]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    Eco-Score
                                </h3>

                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    Sousse durable
                                </p>
                            </div>
                        </div>

                        <h4 className="text-4xl font-black text-white mb-5">
                            {ecoScore}%
                        </h4>

                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${ecoScore}%`,
                                    background: getEcoScoreGradient(ecoScore),
                                    boxShadow: getEcoScoreShadow(ecoScore),
                                }}
                            />
                        </div>

                        <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-rose-400">Faible</span>
                            <span className="text-amber-400">Moyen</span>
                            <span className="text-emerald-400">Excellent</span>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-5 font-medium leading-relaxed">
                            Calculé selon les capteurs actifs, les anomalies,
                            les véhicules et les interventions.
                        </p>
                    </div>

                    <div className="neo-card p-6 min-h-[250px] border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                                <BarChart3 className="w-6 h-6 text-cyan-400" />
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    Mesures par Type
                                </h3>

                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    Live socket
                                </p>
                            </div>
                        </div>

                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={mesuresByType}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -10,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.05)"
                                    />

                                    <XAxis
                                        dataKey="type_mesure"
                                        stroke="#64748b"
                                        fontSize={10}
                                    />

                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={10}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0d1117',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 12,
                                            color: '#ffffff',
                                        }}
                                    />

                                    <Bar
                                        dataKey="moyenne"
                                        fill="#40e0d0"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
