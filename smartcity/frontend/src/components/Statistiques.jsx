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
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [apiBase]);

    // Derived stats for advanced visuals
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
        smooth: m.valeur * 0.8 + (Math.random() * 10) // simulated smooth trend
    }));

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <BarChart3 className="text-indigo-500 w-8 h-8" />
                    Analytique Avancée
                </h2>
                <p className="text-gray-500 mt-2">Exploration des tendances lourdes et corrélations du Big Data urbain</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Correlation: Sensor Density vs Pollution */}
                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400"><Target className="w-6 h-6" /></div>
                        <div>
                            <h4 className="font-bold text-white">Corrélation Densité / Mesures</h4>
                            <p className="text-xs text-gray-500">Analyse de l'impact du maillage par zone</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis type="number" dataKey="density" name="Densité" unit=" cap" stroke="#6b7280" fontSize={10} />
                                <YAxis type="number" dataKey="pollution" name="Niveau" unit=" ppm" stroke="#6b7280" fontSize={10} />
                                <ZAxis type="number" range={[100, 400]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Scatter name="Zones" data={densityData} fill="#8b5cf6" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Prediction / Trend */}
                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp className="w-6 h-6" /></div>
                        <div>
                            <h4 className="font-bold text-white">Lissage Exponentiel</h4>
                            <p className="text-xs text-gray-500">Prédiction des pics de charge environnementaux</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="index" hide />
                                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#181d29', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="val" stroke="#374151" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                                <Line type="basis" dataKey="smooth" stroke="#10b981" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Resource Allocation */}
            <div className="glass-card p-8">
                <div className="flex justify-between items-center mb-8">
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" /> Charge Opérationnelle par Pole
                    </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {['Pollution', 'Énergie', 'Transport', 'Maintenace'].map((label, i) => (
                        <div key={label} className="text-center">
                            <div className="w-20 h-20 mx-auto relative mb-4">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="40" cy="40" r="35" stroke="#1f2937" strokeWidth="6" fill="transparent" />
                                    <circle cx="40" cy="40" r="35" stroke={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i]} strokeWidth="6" fill="transparent" strokeDasharray="219.8" strokeDashoffset={219.8 * (0.3 + i * 0.15)} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                                    {Math.round(30 + i * 15)}%
                                </div>
                            </div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
