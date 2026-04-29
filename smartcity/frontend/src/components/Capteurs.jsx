import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Search, Filter, Download, MoreVertical, Cpu, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const STATUS_MAP = {
    'ACTIF': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', class: 'badge-actif' },
    'HORS_SERVICE': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', class: 'badge-hs' },
    'SIGNALE': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', class: 'badge-signale' },
    'EN_MAINTENANCE': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', class: 'badge-maintenance' },
    'INACTIF': { color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.1)', class: 'badge-inactif' },
};

// Coordonnées de Sousse
const SOUSSE_CENTER = [35.8256, 10.6084];
const ZONES_COORDS = {
    "nord": [35.8400, 10.5900],
    "sud": [35.8100, 10.6100],
    "centre": [35.8256, 10.6084],
    "est": [35.8280, 10.6300],
    "ouest": [35.8230, 10.5750],
    "port": [35.8320, 10.6380],
    "medina": [35.8270, 10.6120],
};

export default function Capteurs({ apiBase }) {
    const [capteurs, setCapteurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [zoneFilter, setZoneFilter] = useState('ALL');

    useEffect(() => {
        const fetchCapteurs = async () => {
            try {
                const res = await axios.get(`${apiBase}/capteurs`);
                setCapteurs(res.data.capteurs.map(c => ({
                    ...c,
                    // Ajouter des coords si manquantes pour la carte
                    lat: c.lat || (ZONES_COORDS[c.zone.toLowerCase()] ? ZONES_COORDS[c.zone.toLowerCase()][0] : SOUSSE_CENTER[0] + (Math.random() - 0.5) * 0.02),
                    lng: c.lng || (ZONES_COORDS[c.zone.toLowerCase()] ? ZONES_COORDS[c.zone.toLowerCase()][1] : SOUSSE_CENTER[1] + (Math.random() - 0.5) * 0.02)
                })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCapteurs();
    }, [apiBase]);

    const filtered = capteurs.filter(c => {
        const matchSearch = String(c.id).includes(search) || c.type.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || c.statut === statusFilter;
        const matchZone = zoneFilter === 'ALL' || c.zone === zoneFilter;
        return matchSearch && matchStatus && matchZone;
    });

    const zones = [...new Set(capteurs.map(c => c.zone))];

    const statusCounts = capteurs.reduce((acc, c) => {
        acc[c.statut] = (acc[c.statut] || 0) + 1;
        return acc;
    }, {});
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const zoneCounts = capteurs.reduce((acc, c) => {
        acc[c.zone] = (acc[c.zone] || 0) + 1;
        return acc;
    }, {});
    const barData = Object.entries(zoneCounts).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">État des Capteurs</h2>
                    <p className="text-gray-500">Gestion et monitoring du réseau urbain</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 transition-colors">
                    <Download className="w-4 h-4" /> Exporter PDF
                </button>
            </header>

            {/* Map & Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Interactive Map */}
                <div className="xl:col-span-2 glass-card p-4 h-[400px] overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 px-2">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localisation en temps réel</span>
                    </div>
                    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800">
                        <MapContainer center={SOUSSE_CENTER} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} scrollWheelZoom={false}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            {filtered.map(c => (
                                <CircleMarker
                                    key={c.id}
                                    center={[c.lat, c.lng]}
                                    radius={8}
                                    fillColor={STATUS_MAP[c.statut]?.color || '#8b5cf6'}
                                    fillOpacity={0.7}
                                    stroke={false}
                                >
                                    <Popup>
                                        <div className="bg-[#181d29] text-white p-1">
                                            <p className="font-bold">Capteur #{c.id}</p>
                                            <p className="text-xs font-mono">{c.type}</p>
                                            <p className="text-[10px] mt-1">{c.statut} • {c.zone}</p>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 h-[190px]">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Statuts</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_MAP[entry.name]?.color || '#8b5cf6'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="glass-card p-6 h-[190px]">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Zones</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className="w-full bg-[#0f111a] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="bg-[#0f111a] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Tous Statuts</option>
                            {Object.keys(STATUS_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select
                            className="bg-[#0f111a] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            value={zoneFilter}
                            onChange={e => setZoneFilter(e.target.value)}
                        >
                            <option value="ALL">Toutes Zones</option>
                            {zones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-800/10 border-b border-gray-800">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Zone</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Statut</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Installation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-600">Chargement...</td></tr>
                            ) : filtered.map((c, i) => (
                                <motion.tr
                                    key={c.id}
                                    className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                >
                                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold text-sm">#{c.id}</td>
                                    <td className="px-6 py-4 text-white font-semibold text-sm">{c.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{c.zone}</td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${STATUS_MAP[c.statut]?.class || 'badge-inactif'}`}>{c.statut}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{c.date_installation}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
