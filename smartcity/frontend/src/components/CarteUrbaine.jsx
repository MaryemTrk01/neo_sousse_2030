import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapIcon, RefreshCw, Wifi, AlertTriangle, Activity } from 'lucide-react';

// ── Définition des zones de Neo-Sousse ──
const ZONES = [
    { id: 'centre', name: 'Centre', x: 38, y: 38, w: 24, h: 24, label: 'Centre Ville' },
    { id: 'nord', name: 'Nord', x: 20, y: 5, w: 60, h: 28, label: 'Zone Nord' },
    { id: 'sud', name: 'Sud', x: 20, y: 67, w: 60, h: 28, label: 'Zone Sud' },
    { id: 'est', name: 'Est', x: 67, y: 33, w: 28, h: 34, label: 'Zone Est' },
    { id: 'ouest', name: 'Ouest', x: 5, y: 33, w: 28, h: 34, label: 'Zone Ouest' },
    { id: 'port', name: 'Port', x: 78, y: 5, w: 17, h: 25, label: 'Port' },
    { id: 'medina', name: 'Médina', x: 5, y: 5, w: 12, h: 25, label: 'Médina' },
    { id: 'corniche', name: 'Corniche', x: 78, y: 70, w: 17, h: 25, label: 'Corniche' },
];

// Position centrale de chaque zone (pour placer véhicules/capteurs)
const ZONE_CENTER = {};
ZONES.forEach(z => {
    ZONE_CENTER[z.id] = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
});

// Couleur selon niveau de pollution
const pollutionColor = (val) => {
    if (!val || val < 45) return { fill: 'rgba(34,197,94,0.18)', stroke: 'rgba(34,197,94,0.5)' };
    if (val < 70) return { fill: 'rgba(245,158,11,0.18)', stroke: 'rgba(245,158,11,0.5)' };
    return { fill: 'rgba(239,68,68,0.22)', stroke: 'rgba(239,68,68,0.6)' };
};

// Couleur selon statut capteur
const capteurColor = (statut) => {
    const map = {
        ACTIF: '#10b981',
        HORS_SERVICE: '#ef4444',
        SIGNALE: '#f59e0b',
        EN_MAINTENANCE: '#3b82f6',
        INACTIF: '#6b7280',
    };
    return map[statut] || '#6b7280';
};

// Couleur selon statut véhicule
const vehiculeColor = (statut) => {
    const map = {
        EN_ROUTE: '#10b981',
        EN_PANNE: '#ef4444',
        STATIONNE: '#6b7280',
        ARRIVE: '#3b82f6',
    };
    return map[statut] || '#94a3b8';
};

// Icône véhicule selon type
const vehiculeIcon = (type) => {
    const map = { bus: '🚌', voiture: '🚗', camion: '🚛', moto: '🛵', scooter: '🛴' };
    return map[type] || '🚗';
};

export default function CarteUrbaine({ apiBase }) {
    const [capteurs, setCapteurs] = useState([]);
    const [vehicules, setVehicules] = useState([]);
    const [zoneStats, setZoneStats] = useState({});
    const [hoveredZone, setHoveredZone] = useState(null);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [animTick, setAnimTick] = useState(0);
    const intervalRef = useRef(null);

    // Positions animées des véhicules (simulation mouvement)
    const [vehiculePos, setVehiculePos] = useState({});

    // ── Fetch données ──
    const fetchAll = useCallback(async () => {
        try {
            const [capRes, vehRes, mesRes] = await Promise.all([
                axios.get(`${apiBase}/capteurs`),
                axios.get(`${apiBase}/vehicules`),
                axios.get(`${apiBase}/mesures`),
            ]);

            const caps = capRes.data.capteurs || [];
            const vehs = vehRes.data.vehicules || [];
            const mes = mesRes.data.mesures || [];

            setCapteurs(caps);
            setVehicules(vehs);

            // Calculer moyenne pollution par zone
            const stats = {};
            ZONES.forEach(z => {
                const zm = mes.filter(m => m.zone === z.id || m.zone === z.name);
                const pol = zm.filter(m => m.type_mesure === 'pollution');
                stats[z.id] = pol.length > 0
                    ? Math.round(pol.reduce((s, m) => s + parseFloat(m.valeur), 0) / pol.length)
                    : Math.floor(Math.random() * 60) + 10;
            });
            setZoneStats(stats);
            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));

            // Initialiser positions véhicules
            setVehiculePos(prev => {
                const next = { ...prev };
                vehs.forEach(v => {
                    if (!next[v.id]) {
                        // Position aléatoire dans une zone
                        const zones = Object.keys(ZONE_CENTER);
                        const z = ZONE_CENTER[zones[v.id % zones.length]];
                        next[v.id] = {
                            x: z.x + (Math.random() - 0.5) * 10,
                            y: z.y + (Math.random() - 0.5) * 10,
                            targetX: z.x,
                            targetY: z.y,
                        };
                    }
                });
                return next;
            });

        } catch (err) {
            console.error('CarteUrbaine fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    // ── Animation mouvement véhicules ──
    const animateVehicules = useCallback(() => {
        setVehiculePos(prev => {
            const next = { ...prev };
            vehicules.forEach(v => {
                if (v.statut !== 'EN_ROUTE') return;
                const pos = next[v.id];
                if (!pos) return;

                // Mouvement fluide vers la cible
                const dx = pos.targetX - pos.x;
                const dy = pos.targetY - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.5) {
                    // Choisir une nouvelle cible aléatoire
                    const zones = Object.keys(ZONE_CENTER);
                    const z = ZONE_CENTER[zones[Math.floor(Math.random() * zones.length)]];
                    next[v.id] = {
                        ...pos,
                        targetX: z.x + (Math.random() - 0.5) * 8,
                        targetY: z.y + (Math.random() - 0.5) * 8,
                    };
                } else {
                    // Avancer vers la cible
                    const speed = 0.3;
                    next[v.id] = {
                        ...pos,
                        x: pos.x + (dx / dist) * speed,
                        y: pos.y + (dy / dist) * speed,
                    };
                }
            });
            return next;
        });
        setAnimTick(t => t + 1);
    }, [vehicules]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Polling toutes les 5 secondes
    useEffect(() => {
        intervalRef.current = setInterval(fetchAll, 5000);
        return () => clearInterval(intervalRef.current);
    }, [fetchAll]);

    // Animation véhicules toutes les 100ms
    useEffect(() => {
        const anim = setInterval(animateVehicules, 100);
        return () => clearInterval(anim);
    }, [animateVehicules]);

    // ── Statistiques globales ──
    const nbHS = capteurs.filter(c => c.statut === 'HORS_SERVICE').length;
    const nbActifs = capteurs.filter(c => c.statut === 'ACTIF').length;
    const nbRoute = vehicules.filter(v => v.statut === 'EN_ROUTE').length;
    const nbPanne = vehicules.filter(v => v.statut === 'EN_PANNE').length;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <MapIcon className="text-indigo-400 w-8 h-8" />
                        Carte Temps Réel — Neo-Sousse 2030
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">
                        Véhicules, capteurs et qualité de l'air en direct
                        {lastUpdate && <span className="ml-3 text-indigo-400">• Mis à jour {lastUpdate}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <Wifi className="w-3 h-3 animate-pulse" /> Temps réel actif
                    </div>
                    <button onClick={fetchAll}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                        <RefreshCw className={`w-5 h-5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Capteurs actifs', value: nbActifs, color: 'emerald', icon: '📡' },
                    { label: 'Hors service', value: nbHS, color: 'red', icon: '🚨' },
                    { label: 'Véhicules en route', value: nbRoute, color: 'blue', icon: '🚗' },
                    { label: 'En panne', value: nbPanne, color: 'amber', icon: '⚠️' },
                ].map(kpi => (
                    <div key={kpi.label}
                        className={`bg-gray-900/60 border border-${kpi.color}-500/20 rounded-xl p-4 flex items-center gap-3`}>
                        <span className="text-2xl">{kpi.icon}</span>
                        <div>
                            <div className={`text-2xl font-bold text-${kpi.color}-400`}>{kpi.value}</div>
                            <div className="text-xs text-gray-500">{kpi.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Carte + Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Carte SVG */}
                <div className="lg:col-span-2 bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 left-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Vue topographique interactive
                    </div>

                    <svg viewBox="0 0 100 100" className="w-full h-auto mt-4"
                        style={{ maxHeight: '500px' }}>

                        {/* Zones colorées selon pollution */}
                        {ZONES.map(zone => {
                            const pol = zoneStats[zone.id] || 0;
                            const { fill, stroke } = pollutionColor(pol);
                            const isHovered = hoveredZone?.id === zone.id;
                            return (
                                <g key={zone.id}>
                                    <rect
                                        x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                                        fill={fill}
                                        stroke={isHovered ? 'white' : stroke}
                                        strokeWidth={isHovered ? 0.8 : 0.3}
                                        rx={1}
                                        className="cursor-pointer transition-all duration-300"
                                        onMouseEnter={() => setHoveredZone({ ...zone, pollution: pol })}
                                        onMouseLeave={() => setHoveredZone(null)}
                                        onClick={() => setSelected({ type: 'zone', data: { ...zone, pollution: pol } })}
                                    />
                                    {/* Label zone */}
                                    <text
                                        x={zone.x + zone.w / 2} y={zone.y + zone.h / 2}
                                        textAnchor="middle" dominantBaseline="middle"
                                        fontSize="3" fill="rgba(255,255,255,0.5)"
                                        className="pointer-events-none select-none">
                                        {zone.name}
                                    </text>
                                    {/* Valeur pollution */}
                                    <text
                                        x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 4}
                                        textAnchor="middle" dominantBaseline="middle"
                                        fontSize="2.5"
                                        fill={pol > 70 ? '#ef4444' : pol > 45 ? '#f59e0b' : '#10b981'}
                                        className="pointer-events-none select-none font-bold">
                                        {pol} ppm
                                    </text>
                                </g>
                            );
                        })}

                        {/* Capteurs */}
                        {capteurs.map(cap => {
                            const zone = ZONE_CENTER[cap.zone] || ZONE_CENTER['centre'];
                            const col = capteurColor(cap.statut);
                            // Offset pour éviter superposition
                            const ox = ((cap.id * 3.7) % 8) - 4;
                            const oy = ((cap.id * 2.3) % 8) - 4;
                            const cx = (zone?.x || 50) + ox;
                            const cy = (zone?.y || 50) + oy;

                            return (
                                <g key={`cap-${cap.id}`}
                                    className="cursor-pointer"
                                    onClick={() => setSelected({ type: 'capteur', data: cap })}>
                                    {/* Pulse pour HS */}
                                    {cap.statut === 'HORS_SERVICE' && (
                                        <circle cx={cx} cy={cy} r={3}
                                            fill="none" stroke="#ef4444" strokeWidth={0.3}
                                            opacity={0.5 + 0.5 * Math.sin(animTick * 0.2)}>
                                        </circle>
                                    )}
                                    <circle cx={cx} cy={cy} r={1.5}
                                        fill={col} stroke="white" strokeWidth={0.3} />
                                    <text x={cx} y={cy - 2.5}
                                        textAnchor="middle" fontSize="1.8"
                                        fill="white" className="pointer-events-none select-none">
                                        📡
                                    </text>
                                </g>
                            );
                        })}

                        {/* Véhicules animés */}
                        {vehicules.map(v => {
                            const pos = vehiculePos[v.id];
                            if (!pos) return null;
                            const col = vehiculeColor(v.statut);

                            return (
                                <g key={`veh-${v.id}`}
                                    className="cursor-pointer"
                                    onClick={() => setSelected({ type: 'vehicule', data: v })}>
                                    {/* Traînée pour véhicules en route */}
                                    {v.statut === 'EN_ROUTE' && (
                                        <circle cx={pos.x} cy={pos.y} r={2.5}
                                            fill={col} opacity={0.15} />
                                    )}
                                    <circle cx={pos.x} cy={pos.y} r={1.8}
                                        fill={col} stroke="white" strokeWidth={0.3} />
                                    <text x={pos.x} y={pos.y + 0.7}
                                        textAnchor="middle" fontSize="2"
                                        className="pointer-events-none select-none">
                                        {v.statut === 'EN_ROUTE' ? '🚗' :
                                            v.statut === 'EN_PANNE' ? '🔧' :
                                                v.statut === 'ARRIVE' ? '🏁' : '🅿️'}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Légende */}
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Normal (&lt;45 ppm)
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-amber-500" /> Vigilance (45-70)
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" /> Critique (&gt;70)
                        </div>
                        <div className="flex items-center gap-1.5">📡 Capteur</div>
                        <div className="flex items-center gap-1.5">🚗 Véhicule en route</div>
                        <div className="flex items-center gap-1.5">🔧 En panne</div>
                    </div>
                </div>

                {/* Panel droite */}
                <div className="space-y-4">

                    {/* Info zone survolée */}
                    <AnimatePresence mode="wait">
                        {hoveredZone && (
                            <motion.div
                                key={hoveredZone.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                                <h3 className="font-bold text-white text-lg">{hoveredZone.label}</h3>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Pollution</span>
                                        <span className={`font-bold ${hoveredZone.pollution > 70 ? 'text-red-400' : hoveredZone.pollution > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {hoveredZone.pollution} ppm
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Capteurs</span>
                                        <span className="text-white">
                                            {capteurs.filter(c => c.zone === hoveredZone.id).length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">État</span>
                                        <span className={`font-bold ${hoveredZone.pollution > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {hoveredZone.pollution > 70 ? '🚨 ALERTE' : '✅ STABLE'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Info élément sélectionné */}
                    <AnimatePresence mode="wait">
                        {selected && (
                            <motion.div
                                key={`${selected.type}-${selected.data.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-gray-800/60 border border-gray-600/40 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-white capitalize">
                                        {selected.type === 'capteur' ? '📡 Capteur' : '🚗 Véhicule'} #{selected.data.id}
                                    </h4>
                                    <button onClick={() => setSelected(null)}
                                        className="text-gray-500 hover:text-white text-xs">✕</button>
                                </div>
                                {selected.type === 'capteur' && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Type</span>
                                            <span className="text-white">{selected.data.type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Zone</span>
                                            <span className="text-white">{selected.data.zone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Statut</span>
                                            <span style={{ color: capteurColor(selected.data.statut) }}
                                                className="font-bold">{selected.data.statut}</span>
                                        </div>
                                    </div>
                                )}
                                {selected.type === 'vehicule' && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Type</span>
                                            <span className="text-white">{vehiculeIcon(selected.data.type)} {selected.data.type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Statut</span>
                                            <span style={{ color: vehiculeColor(selected.data.statut) }}
                                                className="font-bold">{selected.data.statut}</span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Liste alertes temps réel */}
                    <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Alertes temps réel
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {capteurs.filter(c => c.statut === 'HORS_SERVICE').map(c => (
                                <div key={c.id}
                                    className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                                    <span className="text-red-300">Capteur {c.id} HS — zone {c.zone}</span>
                                </div>
                            ))}
                            {vehicules.filter(v => v.statut === 'EN_PANNE').map(v => (
                                <div key={v.id}
                                    className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                    <span className="text-amber-300">Véhicule {v.id} en panne ({v.type})</span>
                                </div>
                            ))}
                            {capteurs.filter(c => c.statut === 'HORS_SERVICE').length === 0 &&
                                vehicules.filter(v => v.statut === 'EN_PANNE').length === 0 && (
                                    <div className="text-xs text-emerald-400 flex items-center gap-2">
                                        <span>✅</span> Aucune alerte active
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Stats zones */}
                    <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Pollution par zone
                        </h4>
                        <div className="space-y-2">
                            {ZONES.slice(0, 5).map(z => {
                                const pol = zoneStats[z.id] || 0;
                                const pct = Math.min(100, Math.round(pol / 1.5));
                                const col = pol > 70 ? '#ef4444' : pol > 45 ? '#f59e0b' : '#10b981';
                                return (
                                    <div key={z.id}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">{z.label}</span>
                                            <span style={{ color: col }} className="font-bold">{pol} ppm</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: col }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}