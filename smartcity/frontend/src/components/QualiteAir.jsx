import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wind, AlertCircle, Thermometer, Droplets, ShieldAlert, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../SocketContext';

const GAUGES = [
    { id: 'pollution', label: 'Pollution (PPM)', color: '#3b82f6', icon: Wind, max: 100 },
    { id: 'co2', label: 'CO2 (Lvl)', color: '#8b5cf6', icon: AlertCircle, max: 100 },
    { id: 'temperature', label: 'Température (°C)', color: '#fb7185', icon: Thermometer, max: 50 },
    { id: 'humidite', label: 'Humidité (%)', color: '#60a5fa', icon: Droplets, max: 100 },
];

const SOUSSE_CENTER = [35.8256, 10.6084];
const SEUILS = { LOW: 40, HIGH: 75 };

const Gauge = ({ label, value, color, icon: Icon, max }) => {
    const percent = Math.min((value / max) * 100, 100);
    const statusColor = value > SEUILS.HIGH ? '#ef4444' : value > SEUILS.LOW ? '#f59e0b' : '#22c55e';
    return (
        <div className="glass-card p-4 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-3">
                <svg className="w-full h-full rotate-[-90deg]">
                    <circle cx="40" cy="40" r="35" stroke="#1f2937" strokeWidth="6" fill="transparent" />
                    <circle cx="40" cy="40" r="35" stroke={statusColor} strokeWidth="6" fill="transparent" strokeDasharray="219.8" strokeDashoffset={219.8 - (219.8 * percent) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-6 h-6" style={{ color: statusColor }} />
                </div>
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
        </div>
    );
};

export default function QualiteAir({ apiBase }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${apiBase}/mesures`);
                setData(res.data.mesures);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();

        if (socket) {
            socket.on('metrics_update', () => {
                fetch();
            });
        }
        return () => {
            if (socket) socket.off('metrics_update');
        };
    }, [apiBase, socket]);

    if (!data) return <div className="loading-shimmer h-96 rounded-xl" />;

    const chartData = data.slice(0, 20).reverse().map(m => ({
        time: m.date ? m.date.substring(11, 16) : '—',
        val: m.valeur,
        type: m.type_mesure
    }));

    const averages = GAUGES.map(g => {
        const typeMesures = data.filter(m => m.type_mesure.toLowerCase() === g.id);
        const avg = typeMesures.length > 0 ? typeMesures.reduce((sum, current) => sum + current.valeur, 0) / typeMesures.length : 0;
        return { ...g, value: Math.round(avg) };
    });

    const alerts = data.filter(m => m.valeur > SEUILS.HIGH).slice(0, 5);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Qualité de l'Air</h2>
                    <p className="text-gray-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Surveillance environnementale en temps réel
                    </p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="text-red-400 w-5 h-5 animate-pulse" />
                    <span className="text-xs font-bold text-red-100 uppercase tracking-widest">Alertes critiques détectées</span>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {averages.map(g => <Gauge key={g.id} {...g} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 h-[300px]">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 flex justify-between">
                            Évolution Temporelle (Live)
                            <span className="text-blue-400">PPM</span>
                        </h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} animationDuration={500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-card p-4 h-[250px]">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400" /> Carte des Points de Mesure
                        </h4>
                        <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800">
                            <MapContainer center={SOUSSE_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {data.slice(0, 50).map((m, i) => (
                                    <CircleMarker
                                        key={i}
                                        center={[SOUSSE_CENTER[0] + (Math.random() - 0.5) * 0.03, SOUSSE_CENTER[1] + (Math.random() - 0.5) * 0.03]}
                                        radius={6 + (m.valeur / 20)}
                                        fillColor={m.valeur > SEUILS.HIGH ? '#ef4444' : '#22c55e'}
                                        fillOpacity={0.5}
                                        stroke={false}
                                    >
                                        <Popup>
                                            <p className="text-xs font-bold">{m.type_mesure} : {m.valeur}</p>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 h-full">
                    <h4 className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Dépassements Récents
                    </h4>
                    <div className="space-y-3">
                        {alerts.length > 0 ? alerts.map((a, i) => (
                            <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex justify-between items-center">
                                <span className="text-xs font-bold text-white uppercase">{a.type_mesure}</span>
                                <span className="text-red-400 font-bold font-mono">{a.valeur}</span>
                            </div>
                        )) : <p className="text-center text-xs text-emerald-400 py-10 font-bold">✓ AUCUN DÉPASSEMENT</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
