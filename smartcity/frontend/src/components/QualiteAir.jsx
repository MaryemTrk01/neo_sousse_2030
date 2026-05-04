import React, { useState, useEffect, useCallback } from 'react';
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
    const statusColor = value > SEUILS.HIGH ? '#f43f5e' : value > SEUILS.LOW ? '#fcd34d' : '#40e0d0';
    return (
        <div className="neo-card p-8 flex flex-col items-center group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-24 h-24 mb-6">
                <svg className="w-full h-full rotate-[-90deg]">
                    <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="42" stroke={statusColor} strokeWidth="8" fill="transparent" strokeDasharray="263.8" strokeDashoffset={263.8 - (263.8 * percent) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-8 h-8" style={{ color: statusColor }} />
                </div>
                <div className="absolute -inset-2 rounded-full blur-xl opacity-20" style={{ backgroundColor: statusColor }} />
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
            <p className="text-[10px] text-text-dim uppercase tracking-[0.2em] font-black mt-1">{label}</p>
        </div>
    );
};

export default function QualiteAir({ apiBase }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetch = useCallback(async () => {
        try {
            const res = await axios.get(`${apiBase}/mesures`);
            setData(res.data.mesures);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [apiBase]);

    useEffect(() => {
        fetch();
        const timer = setInterval(fetch, 60000);

        const onMeasuresUpdate = (measures) => {
            if (Array.isArray(measures)) {
                setData(measures);
                setLoading(false);
            } else {
                fetch();
            }
        };

        if (socket) {
            socket.on('measures_update', onMeasuresUpdate);
        }

        return () => {
            clearInterval(timer);
            if (socket) {
                socket.off('measures_update', onMeasuresUpdate);
            }
        };
    }, [fetch, socket]);

    if (!data) return <div className="neo-card h-96 animate-pulse bg-white/5" />;

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
        <div className="space-y-10 animate-fade-in max-w-7xl mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Indice <span className="text-gradient">Environnemental</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-1 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-turquoise animate-pulse" />
                        Réseau de capteurs atmosphériques • Neo-Sousse
                    </p>
                </div>
                <div className="neo-glass px-6 py-3 rounded-2xl border border-rose-500/10 flex items-center gap-4 bg-rose-500/5">
                    <ShieldAlert className="text-rose-400 w-6 h-6 animate-pulse" />
                    <span className="text-[10px] font-black text-rose-100 uppercase tracking-widest">Surveillance de seuil critique</span>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {averages.map(g => <Gauge key={g.id} {...g} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="neo-card p-8 h-[350px] bg-black/40">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Flux Atmosphérique en Direct</h4>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 bg-turquoise/10 rounded-lg text-[9px] font-black text-turquoise border border-turquoise/20">LIVE PPM</span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#40e0d0" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#40e0d0" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,17,26,0.9)', border: '1px solid rgba(64,224,208,0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }} />
                                <Area type="monotone" dataKey="val" stroke="#40e0d0" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" animationDuration={1000} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="neo-card p-6 h-[300px] bg-black/40">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-turquoise" /> Géolocalisation des Émissions
                            </h4>
                            <span className="text-[9px] text-text-dim font-bold uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Sousse District Alpha</span>
                        </div>
                        <div className="w-full h-[200px] rounded-[1.5rem] overflow-hidden border border-white/5 shadow-inner">
                            <MapContainer center={SOUSSE_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {data.slice(0, 50).map((m, i) => (
                                    <CircleMarker key={i} center={[SOUSSE_CENTER[0] + (Math.random() - 0.5) * 0.04, SOUSSE_CENTER[1] + (Math.random() - 0.5) * 0.04]} radius={5 + (m.valeur / 15)} fillColor={m.valeur > SEUILS.HIGH ? '#f43f5e' : '#40e0d0'} fillOpacity={0.4} stroke={false}>
                                        <Popup className="neo-popup">
                                            <div className="text-bg-deep font-black uppercase text-[10px] tracking-widest">{m.type_mesure} : {m.valeur}</div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="neo-card p-8 bg-rose-500/[0.02] border-rose-500/10">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                            <AlertCircle className="w-4 h-4" /> Journal de Pollution
                        </h4>
                        <div className="space-y-4">
                            {alerts.length > 0 ? alerts.map((a, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex justify-between items-center group hover:bg-rose-500/10 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-white uppercase tracking-tighter">{a.type_mesure}</span>
                                        <span className="text-[8px] text-text-dim font-black uppercase tracking-widest mt-1">Secteur Nord-Est</span>
                                    </div>
                                    <span className="text-xl font-black text-rose-400 group-hover:scale-110 transition-transform">{a.valeur}</span>
                                </motion.div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-turquoise">
                                    <ShieldAlert className="w-12 h-12 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Niveaux Optimaux</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="neo-card p-8 bg-turquoise/[0.02] border-turquoise/10 text-center">
                        <div className="w-16 h-16 bg-turquoise/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Wind className="w-8 h-8 text-turquoise" />
                        </div>
                        <h5 className="font-black text-white text-sm uppercase tracking-widest mb-2">Qualité Air : BONNE</h5>
                        <div className="flex justify-between items-end gap-1 h-8 px-8 mt-4">
                            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4].map((h, i) => <div key={i} className="flex-1 bg-turquoise/30 rounded-t-sm" style={{ height: `${h * 100}%` }} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
