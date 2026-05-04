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
    if (!val || val < 45) return { fill: 'rgba(64,224,208,0.1)', stroke: 'rgba(64,224,208,0.3)' };
    if (val < 70) return { fill: 'rgba(252,211,77,0.1)', stroke: 'rgba(252,211,77,0.3)' };
    return { fill: 'rgba(244,63,94,0.1)', stroke: 'rgba(244,63,94,0.3)' };
};

const capteurColor = (statut) => {
    const map = {
        ACTIF: '#40e0d0', // Turquoise
        HORS_SERVICE: '#f43f5e', // Rose
        SIGNALE: '#fcd34d', // Sand
        EN_MAINTENANCE: '#f59e0b',
        INACTIF: '#94a3b8',
    };
    return map[statut] || '#94a3b8';
};

const vehiculeColor = (statut) => {
    const map = {
        EN_ROUTE: '#3b82f6',
        EN_PANNE: '#f43f5e',
        STATIONNE: '#94a3b8',
        ARRIVE: '#10b981',
    };
    return map[statut] || '#94a3b8';
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
    const [vehiculePos, setVehiculePos] = useState({});

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
            const stats = {};
            ZONES.forEach(z => {
                const pol = mes.filter(m => (m.zone === z.id || m.zone === z.name) && m.type_mesure === 'pollution');
                stats[z.id] = pol.length > 0 ? Math.round(pol.reduce((s, m) => s + parseFloat(m.valeur), 0) / pol.length) : Math.floor(Math.random() * 40) + 10;
            });
            setZoneStats(stats);
            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
            setVehiculePos(prev => {
                const next = { ...prev };
                vehs.forEach(v => {
                    if (!next[v.id]) {
                        const zones = Object.keys(ZONE_CENTER);
                        const z = ZONE_CENTER[zones[v.id % zones.length]];
                        next[v.id] = { x: z.x + (Math.random() - 0.5) * 10, y: z.y + (Math.random() - 0.5) * 10, targetX: z.x, targetY: z.y };
                    }
                });
                return next;
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [apiBase]);

    const animateVehicules = useCallback(() => {
        setVehiculePos(prev => {
            const next = { ...prev };
            vehicules.forEach(v => {
                if (v.statut !== 'EN_ROUTE') return;
                const pos = next[v.id];
                if (!pos) return;
                const dx = pos.targetX - pos.x, dy = pos.targetY - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) {
                    const zones = Object.keys(ZONE_CENTER);
                    const z = ZONE_CENTER[zones[Math.floor(Math.random() * zones.length)]];
                    next[v.id] = { ...pos, targetX: z.x + (Math.random() - 0.5) * 12, targetY: z.y + (Math.random() - 0.5) * 12 };
                } else {
                    const speed = 0.2;
                    next[v.id] = { ...pos, x: pos.x + (dx / dist) * speed, y: pos.y + (dy / dist) * speed };
                }
            });
            return next;
        });
        setAnimTick(t => t + 1);
    }, [vehicules]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => {
        intervalRef.current = setInterval(fetchAll, 60000);
        return () => clearInterval(intervalRef.current);
    }, [fetchAll]);
    useEffect(() => {
        const anim = setInterval(animateVehicules, 100);
        return () => clearInterval(anim);
    }, [animateVehicules]);

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Carte <span className="text-gradient">Topographique</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-1 flex items-center gap-3">
                        <Activity className="w-4 h-4 text-turquoise" /> Géolocalisation active Neo-Sousse 2030
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="neo-glass px-5 py-2 rounded-2xl border border-turquoise/20 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-turquoise animate-pulse" />
                        <span className="text-[10px] font-black text-turquoise uppercase tracking-widest">Temps Réel Actif</span>
                    </div>
                    <button onClick={fetchAll} className="p-3 neo-glass rounded-2xl border border-white/5 text-turquoise hover:text-white transition-all"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 neo-card p-10 bg-black/40 relative overflow-hidden">
                    <div className="absolute top-8 left-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Synoptique Urbain</div>
                    <svg viewBox="0 0 100 100" className="w-full h-auto mt-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ maxHeight: '600px' }}>
                        {ZONES.map(zone => {
                            const pol = zoneStats[zone.id] || 0;
                            const { fill, stroke } = pollutionColor(pol);
                            const isHovered = hoveredZone?.id === zone.id;
                            return (
                                <g key={zone.id}>
                                    <motion.rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} fill={fill} stroke={isHovered ? '#40e0d0' : stroke} strokeWidth={isHovered ? 0.8 : 0.2} rx={2} className="cursor-pointer transition-all duration-500" onMouseEnter={() => setHoveredZone({ ...zone, pollution: pol })} onMouseLeave={() => setHoveredZone(null)} onClick={() => setSelected({ type: 'zone', data: { ...zone, pollution: pol } })} />
                                    <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="2.5" fill="rgba(255,255,255,0.2)" className="pointer-events-none select-none font-black uppercase tracking-widest">{zone.name}</text>
                                    <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 4} textAnchor="middle" dominantBaseline="middle" fontSize="2" fill={pol > 70 ? '#f43f5e' : pol > 45 ? '#fcd34d' : '#40e0d0'} className="pointer-events-none select-none font-bold opacity-60">{pol} ppm</text>
                                </g>
                            );
                        })}
                        {capteurs.map(cap => {
                            const zone = ZONE_CENTER[cap.zone] || ZONE_CENTER['centre'];
                            const col = capteurColor(cap.statut);
                            const ox = ((cap.id * 5) % 10) - 5, oy = ((cap.id * 3) % 10) - 5;
                            const cx = (zone?.x || 50) + ox, cy = (zone?.y || 50) + oy;
                            return (
                                <g key={`cap-${cap.id}`} className="cursor-pointer group" onClick={() => setSelected({ type: 'capteur', data: cap })}>
                                    {cap.statut === 'HORS_SERVICE' && <circle cx={cx} cy={cy} r={4} fill="none" stroke="#f43f5e" strokeWidth={0.2} opacity={0.4} className="animate-ping" />}
                                    <circle cx={cx} cy={cy} r={1.2} fill={col} stroke="rgba(255,255,255,0.2)" strokeWidth={0.2} className="transition-all group-hover:scale-150" />
                                    <text x={cx} y={cy - 2} textAnchor="middle" fontSize="1.5" fill="white" className="pointer-events-none select-none opacity-40 group-hover:opacity-100 transition-opacity">📡</text>
                                </g>
                            );
                        })}
                        {vehicules.map(v => {
                            const pos = vehiculePos[v.id]; if (!pos) return null;
                            const col = vehiculeColor(v.statut);
                            return (
                                <motion.g key={`veh-${v.id}`} className="cursor-pointer group" onClick={() => setSelected({ type: 'vehicule', data: v })}>
                                    {v.statut === 'EN_ROUTE' && <circle cx={pos.x} cy={pos.y} r={2} fill={col} opacity={0.1} />}
                                    <circle cx={pos.x} cy={pos.y} r={1.4} fill={col} stroke="white" strokeWidth={0.2} className="transition-transform group-hover:scale-125" />
                                </motion.g>
                            );
                        })}
                    </svg>
                    <div className="flex flex-wrap gap-6 mt-10 p-6 neo-glass rounded-2xl border border-white/5">
                        {[{ c: '#40e0d0', l: 'Qualité Optimale' }, { c: '#fcd34d', l: 'Vigilance' }, { c: '#f43f5e', l: 'Critique' }].map(i => (
                            <div key={i.l} className="flex items-center gap-3 text-[10px] font-black text-text-dim uppercase tracking-widest"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.c }} /> {i.l}</div>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <AnimatePresence mode="wait">
                        {hoveredZone ? (
                            <motion.div key={hoveredZone.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="neo-card p-8 bg-gradient-to-br from-turquoise/10 to-transparent border-turquoise/20">
                                <h3 className="text-2xl font-black text-white tracking-tighter mb-6">{hoveredZone.label}</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                                        <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Niveau Pollution</span>
                                        <span className={`text-lg font-black ${hoveredZone.pollution > 70 ? 'text-rose-400' : 'text-turquoise'}`}>{hoveredZone.pollution} ppm</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                                        <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Capteurs Actifs</span>
                                        <span className="text-lg font-black text-white">{capteurs.filter(c => c.zone === hoveredZone.id).length}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="neo-card p-8 text-center border-dashed border-white/5 bg-white/[0.01]">
                                <MapIcon className="w-12 h-12 text-text-dim opacity-20 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">Survoler une zone</p>
                            </div>
                        )}
                    </AnimatePresence>

                    <div className="neo-card p-8 bg-black/40">
                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Activity className="w-4 h-4 text-turquoise" /> Alertes Critiques</h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {capteurs.filter(c => c.statut === 'HORS_SERVICE').concat(vehicules.filter(v => v.statut === 'EN_PANNE')).map((item, i) => (
                                <div key={i} className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-4">
                                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-white uppercase tracking-tight">{item.zone ? `Capteur ${item.id}` : `Véhicule ${item.id}`}</span>
                                        <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest">Incident Critique</span>
                                    </div>
                                </div>
                            ))}
                            {capteurs.filter(c => c.statut === 'HORS_SERVICE').length === 0 && vehicules.filter(v => v.statut === 'EN_PANNE').length === 0 && (
                                <div className="text-center py-10 opacity-20"><p className="text-[10px] font-black uppercase tracking-widest text-turquoise">Système Nominal</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
