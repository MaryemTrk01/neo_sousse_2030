import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, RefreshCw, Wifi, AlertTriangle, MapPin, Activity, Navigation } from 'lucide-react';
import { useSocket } from '../SocketContext';

// ── Zones de la carte ──
const ZONES = [
    { id: 'centre', label: 'Centre', x: 35, y: 35, w: 30, h: 30, color: '#1e40af' },
    { id: 'nord', label: 'Nord', x: 15, y: 5, w: 70, h: 28, color: '#065f46' },
    { id: 'sud', label: 'Sud', x: 15, y: 67, w: 70, h: 28, color: '#065f46' },
    { id: 'est', label: 'Est', x: 70, y: 30, w: 25, h: 38, color: '#1e3a5f' },
    { id: 'ouest', label: 'Ouest', x: 5, y: 30, w: 25, h: 38, color: '#1e3a5f' },
    { id: 'port', label: 'Port', x: 78, y: 5, w: 17, h: 22, color: '#164e63' },
    { id: 'medina', label: 'Médina', x: 5, y: 5, w: 17, h: 22, color: '#3b1f5e' },
    { id: 'corniche', label: 'Corniche', x: 78, y: 72, w: 17, h: 23, color: '#164e63' },
];

// Centre de chaque zone
const ZONE_CENTERS = {};
ZONES.forEach(z => {
    ZONE_CENTERS[z.id] = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
});
const ZONE_KEYS = Object.keys(ZONE_CENTERS);

// Couleurs selon statut
const STATUT_COLOR = {
    EN_ROUTE: { bg: '#10b981', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    EN_PANNE: { bg: '#ef4444', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
    STATIONNE: { bg: '#6b7280', text: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    ARRIVE: { bg: '#3b82f6', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const TYPE_ICON = { bus: '🚌', voiture: '🚗', camion: '🚛', moto: '🛵', scooter: '🛴' };
const TYPE_EMOJI = (t) => TYPE_ICON[t] || '🚗';

// Génère une position initiale aléatoire dans une zone
const randInZone = (zoneId) => {
    const z = ZONES.find(z => z.id === zoneId) || ZONES[0];
    return {
        x: z.x + 2 + Math.random() * (z.w - 4),
        y: z.y + 2 + Math.random() * (z.h - 4),
    };
};

export default function Vehicules({ apiBase }) {
    const [vehicules, setVehicules] = useState([]);
    const [positions, setPositions] = useState({});   // positions animées
    const [targets, setTargets] = useState({});   // cibles de déplacement
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('tous');
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [tick, setTick] = useState(0);
    const animRef = useRef(null);
    const pollRef = useRef(null);
    const { socket, connected } = useSocket();

    // ── Fetch véhicules ──
    const fetchVehicules = useCallback(async () => {
        try {
            const res = await axios.get(`${apiBase}/vehicules`);
            const vehs = res.data.vehicules || [];
            setVehicules(vehs);
            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));

            // Initialiser positions pour nouveaux véhicules
            setPositions(prev => {
                const next = { ...prev };
                vehs.forEach(v => {
                    if (!next[v.id]) {
                        const zoneKey = ZONE_KEYS[v.id % ZONE_KEYS.length];
                        const pos = randInZone(zoneKey);
                        next[v.id] = { x: pos.x, y: pos.y };
                    }
                });
                return next;
            });
            setTargets(prev => {
                const next = { ...prev };
                vehs.forEach(v => {
                    if (!next[v.id] && v.statut === 'EN_ROUTE') {
                        const zoneKey = ZONE_KEYS[(v.id * 3) % ZONE_KEYS.length];
                        next[v.id] = randInZone(zoneKey);
                    }
                });
                return next;
            });
        } catch (err) {
            console.error('Vehicules fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    // ── Animation mouvement ──
    const animateStep = useCallback(() => {
        setPositions(prev => {
            const next = { ...prev };
            setTargets(prevT => {
                const nextT = { ...prevT };
                vehicules.forEach(v => {
                    if (v.statut !== 'EN_ROUTE') return;
                    const pos = next[v.id];
                    const tgt = nextT[v.id];
                    if (!pos || !tgt) return;

                    const dx = tgt.x - pos.x;
                    const dy = tgt.y - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 0.8) {
                        // Nouvelle cible aléatoire
                        const zoneKey = ZONE_KEYS[Math.floor(Math.random() * ZONE_KEYS.length)];
                        nextT[v.id] = randInZone(zoneKey);
                    } else {
                        const speed = 0.25 + Math.random() * 0.1;
                        next[v.id] = {
                            x: pos.x + (dx / dist) * speed,
                            y: pos.y + (dy / dist) * speed,
                        };
                    }
                });
                return nextT;
            });
            return next;
        });
        setTick(t => t + 1);
    }, [vehicules]);

    useEffect(() => { fetchVehicules(); }, [fetchVehicules]);

    // Rafraichissement de secours chaque minute. Les changements arrivent d'abord par Socket.IO.
    useEffect(() => {
        pollRef.current = setInterval(fetchVehicules, 60000);
        return () => clearInterval(pollRef.current);
    }, [fetchVehicules]);

    useEffect(() => {
        if (!socket) return;

        const onVehicleUpdate = (data) => {
            if (!Array.isArray(data)) {
                fetchVehicules();
                return;
            }

            setVehicules(data);
            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
            setLoading(false);

            setSelected(prev => {
                if (!prev) return prev;
                return data.find(v => v.id === prev.id) || null;
            });

            setPositions(prev => {
                const next = { ...prev };
                data.forEach(v => {
                    if (!next[v.id]) {
                        const zoneKey = ZONE_KEYS[v.id % ZONE_KEYS.length];
                        const pos = randInZone(zoneKey);
                        next[v.id] = { x: pos.x, y: pos.y };
                    }
                });
                return next;
            });

            setTargets(prev => {
                const next = { ...prev };
                data.forEach(v => {
                    if (v.statut === 'EN_ROUTE' && !next[v.id]) {
                        const zoneKey = ZONE_KEYS[(v.id * 3) % ZONE_KEYS.length];
                        next[v.id] = randInZone(zoneKey);
                    }
                    if (v.statut !== 'EN_ROUTE') {
                        delete next[v.id];
                    }
                });
                return next;
            });
        };

        socket.on('vehicle_update', onVehicleUpdate);
        return () => socket.off('vehicle_update', onVehicleUpdate);
    }, [socket, fetchVehicules]);

    // Animation 80ms
    useEffect(() => {
        animRef.current = setInterval(animateStep, 80);
        return () => clearInterval(animRef.current);
    }, [animateStep]);

    // ── Stats ──
    const stats = {
        enRoute: vehicules.filter(v => v.statut === 'EN_ROUTE').length,
        enPanne: vehicules.filter(v => v.statut === 'EN_PANNE').length,
        stationne: vehicules.filter(v => v.statut === 'STATIONNE').length,
        arrive: vehicules.filter(v => v.statut === 'ARRIVE').length,
    };

    const filtered = filter === 'tous'
        ? vehicules
        : vehicules.filter(v => v.statut === filter.toUpperCase());

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Car className="text-emerald-400 w-8 h-8" />
                        Flotte de Véhicules — Temps Réel
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">
                        Suivi GPS en direct des véhicules autonomes de Neo-Sousse 2030
                        {lastUpdate && <span className="ml-3 text-emerald-400">• {lastUpdate}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <Wifi className="w-3 h-3 animate-pulse" /> {connected ? 'Live Socket' : 'Hors ligne'}
                    </div>
                    <button onClick={fetchVehicules}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                        <RefreshCw className={`w-5 h-5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'En route', value: stats.enRoute, icon: '🚗', color: 'emerald' },
                    { label: 'En panne', value: stats.enPanne, icon: '🔧', color: 'red' },
                    { label: 'Stationnés', value: stats.stationne, icon: '🅿️', color: 'gray' },
                    { label: 'Arrivés', value: stats.arrive, icon: '🏁', color: 'blue' },
                ].map(k => (
                    <motion.div key={k.label}
                        whileHover={{ scale: 1.02 }}
                        className={`bg-gray-900/60 border border-${k.color}-500/20 rounded-xl p-4 flex items-center gap-3 cursor-pointer`}
                        onClick={() => setFilter(k.label === 'En route' ? 'EN_ROUTE' : k.label === 'En panne' ? 'EN_PANNE' : k.label === 'Stationnés' ? 'STATIONNE' : k.label === 'Arrivés' ? 'ARRIVE' : 'tous')}>
                        <span className="text-3xl">{k.icon}</span>
                        <div>
                            <div className={`text-2xl font-bold text-${k.color}-400`}>{k.value}</div>
                            <div className="text-xs text-gray-500">{k.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Carte + Liste ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Carte GPS interactive */}
                <div className="lg:col-span-2 bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            Carte GPS — Neo-Sousse 2030
                        </h3>
                        <div className="flex gap-2 text-xs">
                            {['tous', 'EN_ROUTE', 'EN_PANNE', 'STATIONNE'].map(f => (
                                <button key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-2 py-1 rounded-lg border transition-colors ${filter === f
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'border-gray-700 text-gray-500 hover:text-gray-300'
                                        }`}>
                                    {f === 'tous' ? 'Tous' : f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <svg viewBox="0 0 100 100" className="w-full h-auto rounded-xl overflow-hidden"
                        style={{ maxHeight: '480px', background: '#0f172a' }}>

                        {/* Routes */}
                        <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" strokeWidth="1.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="1.5" />
                        <line x1="0" y1="0" x2="100" y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,3" />

                        {/* Zones */}
                        {ZONES.map(zone => (
                            <g key={zone.id}>
                                <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                                    fill={zone.color} fillOpacity={0.3}
                                    stroke="rgba(255,255,255,0.08)" strokeWidth={0.3} rx={1} />
                                <text x={zone.x + zone.w / 2} y={zone.y + 4}
                                    textAnchor="middle" fontSize="2.5"
                                    fill="rgba(255,255,255,0.35)"
                                    className="pointer-events-none select-none">
                                    {zone.label}
                                </text>
                            </g>
                        ))}

                        {/* Véhicules */}
                        {vehicules
                            .filter(v => filter === 'tous' || v.statut === filter)
                            .map(v => {
                                const pos = positions[v.id];
                                if (!pos) return null;
                                const col = STATUT_COLOR[v.statut]?.bg || '#6b7280';
                                const isSelected = selected?.id === v.id;
                                const isMoving = v.statut === 'EN_ROUTE';

                                return (
                                    <g key={v.id}
                                        className="cursor-pointer"
                                        onClick={() => setSelected(v)}>

                                        {/* Traînée mouvement */}
                                        {isMoving && (
                                            <circle cx={pos.x} cy={pos.y} r={3}
                                                fill={col} opacity={0.1 + 0.05 * Math.sin(tick * 0.3)} />
                                        )}

                                        {/* Sélection */}
                                        {isSelected && (
                                            <circle cx={pos.x} cy={pos.y} r={4}
                                                fill="none" stroke="white" strokeWidth={0.5}
                                                strokeDasharray="1,1" />
                                        )}

                                        {/* Pulse pour panne */}
                                        {v.statut === 'EN_PANNE' && (
                                            <circle cx={pos.x} cy={pos.y}
                                                r={3 + 1.5 * Math.abs(Math.sin(tick * 0.15))}
                                                fill="none" stroke="#ef4444"
                                                strokeWidth={0.4} opacity={0.6} />
                                        )}

                                        {/* Corps véhicule */}
                                        <circle cx={pos.x} cy={pos.y} r={2}
                                            fill={col} stroke="white" strokeWidth={0.4} />

                                        {/* Icône */}
                                        <text x={pos.x} y={pos.y + 0.8}
                                            textAnchor="middle" fontSize="2.2"
                                            className="pointer-events-none select-none">
                                            {isMoving ? '🚗' :
                                                v.statut === 'EN_PANNE' ? '🔧' :
                                                    v.statut === 'ARRIVE' ? '🏁' : '🅿️'}
                                        </text>

                                        {/* ID véhicule */}
                                        <text x={pos.x + 2.5} y={pos.y - 1}
                                            fontSize="1.8" fill="rgba(255,255,255,0.6)"
                                            className="pointer-events-none select-none">
                                            {v.id}
                                        </text>
                                    </g>
                                );
                            })}
                    </svg>

                    {/* Légende */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">🚗 En route</span>
                        <span className="flex items-center gap-1">🔧 En panne</span>
                        <span className="flex items-center gap-1">🅿️ Stationné</span>
                        <span className="flex items-center gap-1">🏁 Arrivé</span>
                    </div>
                </div>

                {/* Panel droite */}
                <div className="space-y-4">

                    {/* Détail véhicule sélectionné */}
                    <AnimatePresence mode="wait">
                        {selected && (
                            <motion.div key={selected.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-gray-800/60 border border-indigo-500/30 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">
                                            {TYPE_EMOJI(selected.type)} Véhicule #{selected.id}
                                        </h4>
                                        <p className="text-xs text-gray-500 capitalize">{selected.type}</p>
                                    </div>
                                    <button onClick={() => setSelected(null)}
                                        className="text-gray-500 hover:text-white">✕</button>
                                </div>

                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${STATUT_COLOR[selected.statut]?.badge}`}>
                                    {selected.statut === 'EN_ROUTE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                    {selected.statut}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">ID</span>
                                        <span className="text-white font-mono">V-{String(selected.id).padStart(3, '0')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Type</span>
                                        <span className="text-white capitalize">{selected.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Trajet ID</span>
                                        <span className="text-white">{selected.trajet_id || '—'}</span>
                                    </div>
                                    {selected.statut === 'EN_ROUTE' && (
                                        <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                                            <Navigation className="w-3 h-3 animate-pulse" />
                                            Déplacement en cours...
                                        </div>
                                    )}
                                    {selected.statut === 'EN_PANNE' && (
                                        <div className="mt-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3" />
                                            Intervention requise
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Liste véhicules */}
                    <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            Flotte ({filtered.length})
                        </h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {filtered.map(v => {
                                const col = STATUT_COLOR[v.statut];
                                return (
                                    <motion.div key={v.id}
                                        whileHover={{ x: 2 }}
                                        onClick={() => setSelected(v)}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selected?.id === v.id
                                                ? 'bg-indigo-500/10 border border-indigo-500/20'
                                                : 'hover:bg-gray-800/60'
                                            }`}>
                                        <span className="text-lg">{TYPE_EMOJI(v.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white">
                                                V-{String(v.id).padStart(3, '0')}
                                                <span className="ml-1 text-gray-500 text-xs capitalize">· {v.type}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${col?.badge}`}>
                                            {v.statut === 'EN_ROUTE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}
                                            {v.statut.replace('_', ' ')}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alertes véhicules */}
                    {stats.enPanne > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" /> Pannes actives
                            </h4>
                            {vehicules.filter(v => v.statut === 'EN_PANNE').map(v => (
                                <div key={v.id} className="text-xs text-red-300 py-1 border-b border-red-500/10 last:border-0">
                                    {TYPE_EMOJI(v.type)} Véhicule {v.id} ({v.type}) — Intervention requise
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats par type */}
                    <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Par type de véhicule
                        </h4>
                        {['bus', 'voiture', 'camion', 'moto', 'scooter'].map(type => {
                            const count = vehicules.filter(v => v.type === type).length;
                            if (!count) return null;
                            return (
                                <div key={type} className="flex justify-between items-center py-1 text-xs">
                                    <span className="text-gray-400">{TYPE_EMOJI(type)} {type}</span>
                                    <span className="text-white font-bold">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
