import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Search, Download, MoreVertical, Cpu, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../SocketContext';

const STATUS_MAP = {
    ACTIF: { color: '#10b981', class: 'badge-actif', next: 'signaler', nextLabel: 'Signaler' },
    SIGNALE: { color: '#f59e0b', class: 'badge-signale', next: 'maintenir', nextLabel: 'Maintenance' },
    EN_MAINTENANCE: { color: '#facc15', class: 'badge-maintenance', next: 'declarer_hs', nextLabel: 'Hors Service' },
    INACTIF: { color: '#94a3b8', class: 'badge-inactif', next: 'activer', nextLabel: 'Activer' },
    HORS_SERVICE: { color: '#ef4444', class: 'badge-hs', next: null, nextLabel: null },
};

const SOUSSE_CENTER = [35.8256, 10.6084];

const ZONES_COORDS = {
    "centre ville": [35.8256, 10.6084],
    "medina": [35.8270, 10.6120],
    "corniche": [35.8350, 10.6250],
    "port sousse": [35.8320, 10.6380],
    "sahloul": [35.8380, 10.5950],
    "khzema": [35.8450, 10.6100],
    "hammam sousse": [35.8580, 10.5980],
    "kantaoui": [35.8920, 10.5980],
    "riadh": [35.8150, 10.5850],
    "bouhsina": [35.8200, 10.6000],
};

const getStablePosition = (capteur) => {
    const zoneKey = capteur.zone?.toLowerCase() || "";
    const base = ZONES_COORDS[zoneKey] || SOUSSE_CENTER;
    const id = Number(capteur.id) || 1;

    return {
        lat: base[0] + Math.sin(id * 12.9898) * 0.006,
        lng: base[1] + Math.cos(id * 78.233) * 0.006,
    };
};

const normalizeCapteurs = (list) => {
    return (list || []).map((c) => {
        const p = getStablePosition(c);
        return { ...c, lat: p.lat, lng: p.lng };
    });
};

export default function Capteurs({ apiBase }) {
    const [capteurs, setCapteurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const { socket } = useSocket();

    const fetchCapteurs = useCallback(async () => {
        try {
            const res = await axios.get(`${apiBase}/capteurs`);
            const data = res.data?.capteurs || [];
            setCapteurs(normalizeCapteurs(data));
        } catch (err) {
            console.error("Error fetching capteurs:", err);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetchCapteurs();
        const timer = setInterval(fetchCapteurs, 60000);

        const onCapteursUpdate = (data) => {
            console.log("CAPTEURS UPDATE RECU:", data?.length);
            if (Array.isArray(data)) {
                setCapteurs(normalizeCapteurs(data));
                setLoading(false);
            } else {
                fetchCapteurs();
            }
        };

        if (socket) {
            socket.on("capteurs_update", onCapteursUpdate);
        }

        return () => {
            clearInterval(timer);
            if (socket) {
                socket.off("capteurs_update", onCapteursUpdate);
            }
        };
    }, [socket, fetchCapteurs]);

    const handleTransition = async (id, event) => {
        try {
            await axios.post(`${apiBase}/capteurs/${id}/transition`, { event });
        } catch (err) {
            alert(err.response?.data?.error || "Erreur de transition");
        }
    };

    const filtered = capteurs.filter((c) => {
        const s = search.toLowerCase();
        const matchSearch =
            String(c.id).includes(s) ||
            c.type?.toLowerCase().includes(s) ||
            c.zone?.toLowerCase().includes(s);

        const matchStatus = statusFilter === 'ALL' || c.statut === statusFilter;
        return matchSearch && matchStatus;
    });

    const pieData = Object.entries(
        capteurs.reduce((acc, c) => {
            acc[c.statut] = (acc[c.statut] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Capteurs <span className="text-gradient">Urbains</span>
                    </h2>
                    <p className="text-text-muted font-medium">
                        Monitoring haute précision • Sousse Smart Grid
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="btn-primary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Rapport PDF
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 neo-card p-2 h-[450px] relative">
                    <div className="absolute top-6 left-6 z-10 neo-glass px-4 py-2 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-turquoise" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                Cartographie Live • {filtered.length} capteurs affichés
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-full rounded-[1rem] overflow-hidden">
                        <MapContainer center={SOUSSE_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                            {filtered.map((c) => (
                                <CircleMarker
                                    key={c.id}
                                    center={[c.lat, c.lng]}
                                    radius={10}
                                    fillColor={STATUS_MAP[c.statut]?.color || '#3b82f6'}
                                    fillOpacity={0.75}
                                    stroke
                                    weight={2}
                                    color="white"
                                    opacity={0.25}
                                >
                                    <Popup>
                                        <div className="bg-[#0d1117] text-white p-2 rounded-lg">
                                            <p className="font-black text-turquoise uppercase tracking-tighter">
                                                Capteur #{c.id}
                                            </p>
                                            <p className="text-xs font-bold mt-1 opacity-80">
                                                {c.type?.toUpperCase()} • {c.zone}
                                            </p>
                                            <p
                                                className="text-[10px] mt-2 py-1 px-2 rounded inline-block"
                                                style={{
                                                    backgroundColor: STATUS_MAP[c.statut]?.color || '#3b82f6',
                                                    color: '#fff',
                                                }}
                                            >
                                                {c.statut}
                                            </p>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                <div className="neo-card p-8 flex flex-col justify-between">
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-l-4 border-turquoise pl-3">
                            Distribution Globale
                        </h4>

                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={STATUS_MAP[entry.name]?.color || '#40e0d0'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0d1117',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        {pieData.map((d) => (
                            <div key={d.name} className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: STATUS_MAP[d.name]?.color || '#40e0d0' }}
                                    />
                                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                        {d.name}
                                    </span>
                                </div>
                                <span className="text-sm font-black text-white">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="neo-card overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-black/10">
                    <div className="flex gap-4 flex-1 min-w-[300px]">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim w-4 h-4 group-focus-within:text-turquoise transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrer par ID, type ou zone..."
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
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Réf. Capteur</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Type / Technologie</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Zone Urbaine</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">État Actuel</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Contrôle Manuel</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-12 text-center text-text-dim italic">
                                        Synchronisation avec le réseau central...
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
                                        <td className="px-8 py-5 font-black text-turquoise tracking-tighter text-base">#{c.id}</td>

                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <Cpu className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="text-white font-bold text-sm uppercase tracking-wide">{c.type}</span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-5 text-sm font-semibold text-text-muted">{c.zone}</td>

                                        <td className="px-8 py-5">
                                            <span className={`badge ${STATUS_MAP[c.statut]?.class || 'badge-inactif'}`}>
                                                <span className="status-dot bg-current"></span>
                                                {c.statut}
                                            </span>
                                        </td>

                                        <td className="px-8 py-5">
                                            {STATUS_MAP[c.statut]?.next && (
                                                <button
                                                    onClick={() => handleTransition(c.id, STATUS_MAP[c.statut].next)}
                                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-turquoise hover:text-black hover:border-turquoise transition-all uppercase tracking-widest flex items-center gap-2"
                                                >
                                                    <MoreVertical className="w-3 h-3" />
                                                    {STATUS_MAP[c.statut].nextLabel}
                                                </button>
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
