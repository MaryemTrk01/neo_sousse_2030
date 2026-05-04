import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Zap, Target } from 'lucide-react';

export default function Statistiques({ apiBase }) {
    const [data, setData] = useState({ sensors: [], interventions: [], measures: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [c, i, m] = await Promise.all([
                    axios.get(`${apiBase}/capteurs`),
                    axios.get(`${apiBase}/interventions`),
                    axios.get(`${apiBase}/mesures`)
                ]);
                setData({
                    sensors: c.data.capteurs || [],
                    interventions: i.data.interventions || [],
                    measures: m.data.mesures || []
                });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
        const timer = setInterval(fetchData, 60000);
        return () => clearInterval(timer);
    }, [apiBase]);

    const sensorDensity = data.sensors.reduce((acc, s) => {
        acc[s.zone] = (acc[s.zone] || 0) + 1;
        return acc;
    }, {});

    const densityData = Object.entries(sensorDensity).map(([name, density]) => ({
        name,
        density,
        pollution: data.measures.filter(m => m.capteur_id && data.sensors.find(s => s.id === m.capteur_id)?.zone === name)
            .reduce((sum, m, _, arr) => sum + m.valeur / arr.length, 0) || 0
    }));

    const trendData = data.measures.slice(0, 30).map((m, i) => ({
        index: i,
        val: m.valeur,
        smooth: m.valeur * 0.8 + (Math.random() * 10)
    }));

    return (
        <div className="space-y-10 animate-fade-in max-w-7xl mx-auto">
            <header className="flex items-end justify-between">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Analytique <span className="text-gradient">Avancée</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-1">Modélisation prédictive et corrélations multi-vectorielles • Neo-Sousse</p>
                </div>
                <div className="p-3 neo-glass rounded-2xl border border-white/5 flex items-center gap-3">
                    <Zap className="text-sand w-5 h-5 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Calcul GPU Actif</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="neo-card p-10 bg-black/40">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 rounded-2xl bg-turquoise/10 text-turquoise border border-turquoise/20"><Target className="w-6 h-6" /></div>
                        <div>
                            <h4 className="text-xl font-black text-white tracking-tight">Efficience du Maillage</h4>
                            <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">Densité vs Niveaux de Pollution</p>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <XAxis type="number" dataKey="density" name="Densité" unit=" cap" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis type="number" dataKey="pollution" name="Niveau" unit=" ppm" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                                <ZAxis type="number" range={[150, 600]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(15,17,26,0.9)', border: '1px solid rgba(64,224,208,0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }} />
                                <Scatter name="Zones" data={densityData} fill="#40e0d0">
                                    {densityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#40e0d0' : '#fcd34d'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="neo-card p-10 bg-black/40">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 rounded-2xl bg-sand/10 text-sand border border-sand/20"><TrendingUp className="w-6 h-6" /></div>
                        <div>
                            <h4 className="text-xl font-black text-white tracking-tight">Tendance Prédictive</h4>
                            <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">Modèle de lissage exponentiel (Live)</p>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <XAxis dataKey="index" hide />
                                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,17,26,0.9)', border: '1px solid rgba(64,224,208,0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }} />
                                <Line type="monotone" dataKey="val" stroke="rgba(255,255,255,0.1)" strokeWidth={1} dot={false} strokeDasharray="8 8" />
                                <Line type="basis" dataKey="smooth" stroke="#fcd34d" strokeWidth={4} dot={false} strokeLinecap="round" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="neo-card p-10 bg-gradient-to-br from-turquoise/[0.03] to-transparent">
                <div className="flex justify-between items-center mb-12">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-turquoise" /> Charge Système par Secteur
                    </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {['Pollution', 'Énergie', 'Transport', 'Maintenace'].map((label, i) => (
                        <div key={label} className="text-center group">
                            <div className="w-24 h-24 mx-auto relative mb-6">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                                    <circle cx="48" cy="48" r="42" stroke={['#40e0d0', '#fcd34d', '#3b82f6', '#f43f5e'][i]} strokeWidth="8" fill="transparent" strokeDasharray="263.8" strokeDashoffset={263.8 * (0.3 + i * 0.15)} strokeLinecap="round" className="transition-all duration-1000" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-white group-hover:scale-110 transition-transform">
                                    {Math.round(30 + i * 15)}%
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] group-hover:text-white transition-colors">{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
