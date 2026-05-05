import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    Bus,
    Car,
    CheckCircle2,
    MapPin,
    Navigation,
    ParkingCircle,
    RefreshCw,
    Route,
    Truck,
    Wrench,
    X,
} from 'lucide-react';
import { useSocket } from '../SocketContext';

const ZONES = [
    { id: 'centre', label: 'Centre', x: 35, y: 35, w: 30, h: 30, color: '#6d28d9' },
    { id: 'nord', label: 'Nord', x: 15, y: 5, w: 70, h: 28, color: '#0f766e' },
    { id: 'sud', label: 'Sud', x: 15, y: 67, w: 70, h: 28, color: '#0f766e' },
    { id: 'est', label: 'Est', x: 70, y: 30, w: 25, h: 38, color: '#0369a1' },
    { id: 'ouest', label: 'Ouest', x: 5, y: 30, w: 25, h: 38, color: '#0369a1' },
    { id: 'port', label: 'Port', x: 78, y: 5, w: 17, h: 22, color: '#0891b2' },
    { id: 'medina', label: 'Medina', x: 5, y: 5, w: 17, h: 22, color: '#be185d' },
    { id: 'corniche', label: 'Corniche', x: 78, y: 72, w: 17, h: 23, color: '#0891b2' },
];

const ZONE_CENTERS = {};
ZONES.forEach((zone) => {
    ZONE_CENTERS[zone.id] = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
});
const ZONE_KEYS = Object.keys(ZONE_CENTERS);

const STATUS_CONFIG = {
    EN_ROUTE: {
        label: 'En route',
        color: '#10b981',
        icon: Navigation,
        card: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
        badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    },
    EN_PANNE: {
        label: 'En panne',
        color: '#ef4444',
        icon: AlertTriangle,
        card: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
        badge: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    },
    STATIONNE: {
        label: 'Stationne',
        color: '#94a3b8',
        icon: ParkingCircle,
        card: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
        badge: 'border-slate-400/25 bg-slate-400/10 text-slate-300',
    },
    ARRIVE: {
        label: 'Arrive',
        color: '#60a5fa',
        icon: CheckCircle2,
        card: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
        badge: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    },
};

const TYPE_ICON = {
    bus: Bus,
    camion: Truck,
    voiture: Car,
    moto: Route,
    scooter: Route,
};

const randInZone = (zoneId) => {
    const zone = ZONES.find((item) => item.id === zoneId) || ZONES[0];
    return {
        x: zone.x + 2 + Math.random() * (zone.w - 4),
        y: zone.y + 2 + Math.random() * (zone.h - 4),
    };
};

const getVehicleIcon = (type) => TYPE_ICON[type] || Car;

const KpiGauge = ({ value, label, icon: Icon, color, active, onClick }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(8, Math.min(100, value));
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <button
            onClick={onClick}
            style={{ height: 158 }}
            className={`group flex min-w-0 flex-col items-center justify-center rounded-3xl border bg-[#0d1424] px-4 py-4 text-center shadow-[0_14px_42px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-white/20 ${
                active ? 'border-white/25 ring-2 ring-white/10' : 'border-white/10'
            }`}
        >
            <div className="relative" style={{ width: 76, height: 76 }}>
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="12"
                    />
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-500"
                        style={{ filter: `drop-shadow(0 0 14px ${color}66)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.045]" style={{ color }}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </div>

            <div className="mt-2 text-2xl font-black leading-none text-white">
                {value}
            </div>
            <div className="mt-2 max-w-full truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
                {label}
            </div>
        </button>
    );
};

export default function Vehicules({ apiBase }) {
    const [vehicules, setVehicules] = useState([]);
    const [positions, setPositions] = useState({});
    const [targets, setTargets] = useState({});
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('tous');
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [tick, setTick] = useState(0);
    const animRef = useRef(null);
    const pollRef = useRef(null);
    const { socket, connected } = useSocket();

    const applyVehicules = useCallback((data) => {
        setVehicules(data);
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        setLoading(false);

        setSelected((prev) => {
            if (!prev) return prev;
            return data.find((vehicle) => vehicle.id === prev.id) || null;
        });

        setPositions((prev) => {
            const next = { ...prev };
            data.forEach((vehicle) => {
                if (!next[vehicle.id]) {
                    next[vehicle.id] = randInZone(ZONE_KEYS[vehicle.id % ZONE_KEYS.length]);
                }
            });
            return next;
        });

        setTargets((prev) => {
            const next = { ...prev };
            data.forEach((vehicle) => {
                if (vehicle.statut === 'EN_ROUTE' && !next[vehicle.id]) {
                    next[vehicle.id] = randInZone(ZONE_KEYS[(vehicle.id * 3) % ZONE_KEYS.length]);
                }
                if (vehicle.statut !== 'EN_ROUTE') {
                    delete next[vehicle.id];
                }
            });
            return next;
        });
    }, []);

    const fetchVehicules = useCallback(async () => {
        try {
            const res = await axios.get(`${apiBase}/vehicules`);
            applyVehicules(res.data.vehicules || []);
        } catch (err) {
            console.error('Vehicules fetch error:', err);
            setLoading(false);
        }
    }, [apiBase, applyVehicules]);

    const animateStep = useCallback(() => {
        setPositions((prev) => {
            const next = { ...prev };
            setTargets((prevTargets) => {
                const nextTargets = { ...prevTargets };

                vehicules.forEach((vehicle) => {
                    if (vehicle.statut !== 'EN_ROUTE') return;

                    const pos = next[vehicle.id];
                    const target = nextTargets[vehicle.id];
                    if (!pos || !target) return;

                    const dx = target.x - pos.x;
                    const dy = target.y - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 0.8) {
                        nextTargets[vehicle.id] = randInZone(ZONE_KEYS[Math.floor(Math.random() * ZONE_KEYS.length)]);
                    } else {
                        const speed = 0.25 + Math.random() * 0.1;
                        next[vehicle.id] = {
                            x: pos.x + (dx / dist) * speed,
                            y: pos.y + (dy / dist) * speed,
                        };
                    }
                });

                return nextTargets;
            });
            return next;
        });
        setTick((value) => value + 1);
    }, [vehicules]);

    useEffect(() => {
        fetchVehicules();
    }, [fetchVehicules]);

    useEffect(() => {
        pollRef.current = setInterval(fetchVehicules, 60000);
        return () => clearInterval(pollRef.current);
    }, [fetchVehicules]);

    useEffect(() => {
        if (!socket) return undefined;

        const onVehicleUpdate = (data) => {
            if (Array.isArray(data)) {
                applyVehicules(data);
                return;
            }
            fetchVehicules();
        };

        socket.on('vehicle_update', onVehicleUpdate);
        return () => socket.off('vehicle_update', onVehicleUpdate);
    }, [socket, fetchVehicules, applyVehicules]);

    useEffect(() => {
        animRef.current = setInterval(animateStep, 80);
        return () => clearInterval(animRef.current);
    }, [animateStep]);

    const stats = {
        EN_ROUTE: vehicules.filter((vehicle) => vehicle.statut === 'EN_ROUTE').length,
        EN_PANNE: vehicules.filter((vehicle) => vehicle.statut === 'EN_PANNE').length,
        STATIONNE: vehicules.filter((vehicle) => vehicle.statut === 'STATIONNE').length,
        ARRIVE: vehicules.filter((vehicle) => vehicle.statut === 'ARRIVE').length,
    };

    const filtered = filter === 'tous'
        ? vehicules
        : vehicules.filter((vehicle) => vehicle.statut === filter);

    const total = vehicules.length || 1;
    const activeRate = Math.round(((stats.EN_ROUTE + stats.ARRIVE) / total) * 100);
    const brokenVehicles = vehicules.filter((vehicle) => vehicle.statut === 'EN_PANNE');

    return (
        <section className="mx-auto max-w-7xl animate-fade-in space-y-4 pb-6">
            <header className="border-b border-white/10 pb-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200/70">
                            Mobilite urbaine
                        </p>
                        <h2 className="mt-1 text-[2rem] font-black leading-tight tracking-tight text-white">
                            Flotte de <span className="text-gradient">Vehicules</span>
                        </h2>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-400">
                            Suivi temps reel des vehicules, incidents et mouvements sur Neo-Sousse.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] ${connected ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
                            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-300' : 'bg-rose-300'}`} />
                            {connected ? 'Live' : 'Hors ligne'}
                        </span>
                        {lastUpdate && (
                            <span className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-slate-400">
                                Maj {lastUpdate}
                            </span>
                        )}
                        <button
                            onClick={fetchVehicules}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-300"
                            title="Rafraichir"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
            >
                <KpiGauge
                    value={stats.EN_ROUTE}
                    label="En route"
                    icon={Navigation}
                    color="#34d399"
                    active={filter === 'EN_ROUTE'}
                    onClick={() => setFilter('EN_ROUTE')}
                />
                <KpiGauge
                    value={stats.EN_PANNE}
                    label="En panne"
                    icon={AlertTriangle}
                    color="#fb3f67"
                    active={filter === 'EN_PANNE'}
                    onClick={() => setFilter('EN_PANNE')}
                />
                <KpiGauge
                    value={stats.STATIONNE}
                    label="Stationne"
                    icon={ParkingCircle}
                    color="#cbd5e1"
                    active={filter === 'STATIONNE'}
                    onClick={() => setFilter('STATIONNE')}
                />
                <KpiGauge
                    value={stats.ARRIVE}
                    label="Arrive"
                    icon={CheckCircle2}
                    color="#38bdf8"
                    active={filter === 'ARRIVE'}
                    onClick={() => setFilter('ARRIVE')}
                />
                <KpiGauge
                    value={vehicules.length}
                    label="Total flotte"
                    icon={Activity}
                    color="#c084fc"
                    active={filter === 'tous'}
                    onClick={() => setFilter('tous')}
                />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <main className="min-w-0 rounded-3xl border border-white/10 bg-[#0c1324]/90 p-5 shadow-[0_16px_42px_rgba(0,0,0,0.30)]">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                <MapPin className="h-4 w-4 text-emerald-300" />
                                Carte GPS
                            </h3>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                                Cliquez sur un vehicule pour voir ses details.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {['tous', 'EN_ROUTE', 'EN_PANNE', 'STATIONNE', 'ARRIVE'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition ${
                                        filter === item
                                            ? 'border-purple-300/40 bg-purple-400/15 text-white'
                                            : 'border-white/10 bg-white/[0.035] text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {item === 'tous' ? 'Tous' : STATUS_CONFIG[item]?.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#050816]">
                        <svg viewBox="0 0 100 100" className="h-[500px] w-full">
                            <defs>
                                <pattern id="fleet-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                                    <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.4" />
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#fleet-grid)" />

                            <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
                            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" strokeDasharray="2,3" />
                            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2,4" />

                            {ZONES.map((zone) => (
                                <g key={zone.id}>
                                    <rect
                                        x={zone.x}
                                        y={zone.y}
                                        width={zone.w}
                                        height={zone.h}
                                        fill={zone.color}
                                        fillOpacity={0.22}
                                        stroke="rgba(255,255,255,0.10)"
                                        strokeWidth={0.35}
                                        rx={2}
                                    />
                                    <text
                                        x={zone.x + zone.w / 2}
                                        y={zone.y + 4.6}
                                        textAnchor="middle"
                                        fontSize="2.6"
                                        fill="rgba(255,255,255,0.48)"
                                        className="pointer-events-none select-none"
                                    >
                                        {zone.label}
                                    </text>
                                </g>
                            ))}

                            {vehicules
                                .filter((vehicle) => filter === 'tous' || vehicle.statut === filter)
                                .map((vehicle) => {
                                    const pos = positions[vehicle.id];
                                    if (!pos) return null;

                                    const status = STATUS_CONFIG[vehicle.statut] || STATUS_CONFIG.STATIONNE;
                                    const isSelected = selected?.id === vehicle.id;
                                    const isMoving = vehicle.statut === 'EN_ROUTE';
                                    const isBroken = vehicle.statut === 'EN_PANNE';

                                    return (
                                        <g key={vehicle.id} className="cursor-pointer" onClick={() => setSelected(vehicle)}>
                                            {isMoving && (
                                                <circle
                                                    cx={pos.x}
                                                    cy={pos.y}
                                                    r={3.4}
                                                    fill={status.color}
                                                    opacity={0.12 + 0.05 * Math.sin(tick * 0.3)}
                                                />
                                            )}
                                            {isBroken && (
                                                <circle
                                                    cx={pos.x}
                                                    cy={pos.y}
                                                    r={3.3 + 1.4 * Math.abs(Math.sin(tick * 0.15))}
                                                    fill="none"
                                                    stroke={status.color}
                                                    strokeWidth={0.45}
                                                    opacity={0.7}
                                                />
                                            )}
                                            {isSelected && (
                                                <circle
                                                    cx={pos.x}
                                                    cy={pos.y}
                                                    r={4.5}
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth={0.55}
                                                    strokeDasharray="1,1"
                                                />
                                            )}
                                            <circle cx={pos.x} cy={pos.y} r={2.1} fill={status.color} stroke="white" strokeWidth={0.42} />
                                            <text
                                                x={pos.x + 2.8}
                                                y={pos.y - 1.2}
                                                fontSize="1.9"
                                                fill="rgba(255,255,255,0.7)"
                                                className="pointer-events-none select-none"
                                            >
                                                V{vehicle.id}
                                            </text>
                                        </g>
                                    );
                                })}
                        </svg>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-slate-400 md:grid-cols-4">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <div key={key} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                                {config.label}
                            </div>
                        ))}
                    </div>
                </main>

                <aside className="space-y-5">
                    <AnimatePresence mode="wait">
                        {selected && (
                            <motion.div
                                key={selected.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="rounded-3xl border border-purple-300/20 bg-[#0c1324]/90 p-5 shadow-[0_16px_42px_rgba(0,0,0,0.30)]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-200">
                                            {React.createElement(getVehicleIcon(selected.type), { className: 'h-6 w-6' })}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white">
                                                Vehicule V-{String(selected.id).padStart(3, '0')}
                                            </h4>
                                            <p className="text-xs font-semibold capitalize text-slate-400">{selected.type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelected(null)}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
                                        title="Fermer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] ${STATUS_CONFIG[selected.statut]?.badge}`}>
                                    {React.createElement(STATUS_CONFIG[selected.statut]?.icon || Car, { className: 'h-4 w-4' })}
                                    {STATUS_CONFIG[selected.statut]?.label || selected.statut}
                                </div>

                                <div className="mt-5 space-y-3 text-sm">
                                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                        <span className="text-slate-400">Identifiant</span>
                                        <span className="font-mono font-black text-white">V-{String(selected.id).padStart(3, '0')}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Type</span>
                                        <span className="font-bold capitalize text-white">{selected.type}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Trajet</span>
                                        <span className="font-bold text-white">{selected.trajet_id || '-'}</span>
                                    </div>
                                </div>

                                {selected.statut === 'EN_ROUTE' && (
                                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-200">
                                        Deplacement en cours sur le reseau urbain.
                                    </div>
                                )}
                                {selected.statut === 'EN_PANNE' && (
                                    <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">
                                        Intervention technique requise.
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="rounded-3xl border border-white/10 bg-[#0c1324]/90 p-5 shadow-[0_16px_42px_rgba(0,0,0,0.30)]">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                <Activity className="h-4 w-4 text-purple-300" />
                                Flotte
                            </h3>
                            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white">
                                {filtered.length}
                            </span>
                        </div>

                        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                            {filtered.map((vehicle) => {
                                const Icon = getVehicleIcon(vehicle.type);
                                const status = STATUS_CONFIG[vehicle.statut] || STATUS_CONFIG.STATIONNE;
                                return (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => setSelected(vehicle)}
                                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                            selected?.id === vehicle.id
                                                ? 'border-purple-300/30 bg-purple-400/10'
                                                : 'border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-slate-200">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-black text-white">
                                                V-{String(vehicle.id).padStart(3, '0')}
                                            </p>
                                            <p className="truncate text-xs font-semibold capitalize text-slate-500">{vehicle.type}</p>
                                        </div>
                                        <span className={`rounded-xl border px-2 py-1 text-[10px] font-black uppercase ${status.badge}`}>
                                            {status.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-[#0c1324]/90 p-5 shadow-[0_16px_42px_rgba(0,0,0,0.30)]">
                        <div className="mb-4 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-rose-300" />
                            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                Diagnostic
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-[0.12em]">
                                    <span className="text-slate-400">Disponibilite</span>
                                    <span className="text-emerald-300">{activeRate}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: `${activeRate}%` }} />
                                </div>
                            </div>

                            {brokenVehicles.length > 0 ? (
                                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-200">
                                        {brokenVehicles.length} panne(s) active(s)
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {brokenVehicles.slice(0, 4).map((vehicle) => (
                                            <p key={vehicle.id} className="text-xs font-semibold text-rose-100/85">
                                                V-{String(vehicle.id).padStart(3, '0')} - {vehicle.type}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-200">
                                    Aucune panne active
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
