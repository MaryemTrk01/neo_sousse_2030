import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { aiApi } from '../api/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
import { Radio, Wrench, Users, Car, FileText, ArrowRight, Wifi, WifiOff, Download, Activity, ShieldAlert, Cpu } from 'lucide-react';
import KPICard from '../components/KPICard';
import GlassCard from '../components/GlassCard';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws/dashboard';

const COLORS = {
  'ACTIF': '#00ff88',
  'INACTIF': '#64748b',
  'SIGNALÉ': '#f59e0b',
  'EN_MAINTENANCE': '#00d4ff',
  'HORS_SERVICE': '#ff4444'
};

const Dashboard = () => {
  const [stats, setStats]               = useState({ sensors: 0, citizens: 0, vehicles: 0, interventions: 0 });
  const [timeseries, setTimeseries]     = useState([]);
  const [sensorStatus, setSensorStatus] = useState([]);
  const [pollution, setPollution]       = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
  const [latestInterventions, setLatestInterventions] = useState([]);
  const [activeVehicles, setActiveVehicles]           = useState([]);
  const [latestReport, setLatestReport] = useState("Analyse en cours par l'IA...");
  const [connected, setConnected]       = useState(false);
  const [lastUpdate, setLastUpdate]     = useState(null);

  const dashboardRef = useRef(null);
  const wsRef       = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStats(data.stats);
        setSensorStatus(data.sensorStatus || []);
        setTimeseries((data.timeseries || []).slice().reverse());
        setPollution(data.pollution || []);
        setLatestReadings(data.latestReadings || []);
        setLatestInterventions(data.latestInterventions || []);
        setActiveVehicles(data.activeVehicles || []);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (e) { console.error('[WS] Parse error:', e); }
    };
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    aiApi.generateReport("Donne-moi un aperçu rapide de l'état de la ville de Sousse.").then(res => {
      setLatestReport(res.data.report.substring(0, 300) + "...");
    }).catch(() => setLatestReport("AI rapport indisponible."));
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const exportPDF = async () => {
    const element = dashboardRef.current;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#080b14' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Neo-Sousse-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div ref={dashboardRef} className="space-y-8 pb-12 relative">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-40 left-0 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Activity className="text-indigo-400" size={20} />
            </div>
            <h1 className="text-4xl font-rajdhani font-bold text-white tracking-tight">
              Neo-Sousse <span className="text-indigo-500">2030</span>
            </h1>
          </div>
          <p className="text-slate-400 font-medium">Système de Surveillance Intelligente & Compilation Temps Réel</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {connected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
              {connected ? 'Live Sync Active' : 'Disconnected'}
            </div>
            {lastUpdate && <span className="text-[10px] text-slate-500 font-mono">Sync: {lastUpdate}</span>}
          </div>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Download size={18} /> Export PDF
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Capteurs"         value={stats.sensors}       icon={Radio}       colorClass="text-cyan-400" delay={0.1} />
        <KPICard title="Interventions"          value={stats.interventions} icon={Wrench}      colorClass="text-amber-400" delay={0.2} />
        <KPICard title="Citoyens Connectés"     value={stats.citizens}      icon={Users}       colorClass="text-emerald-400" delay={0.3} />
        <KPICard title="Véhicules Actifs"       value={stats.vehicles}      icon={Car}         colorClass="text-indigo-400" delay={0.4} />
      </div>

      {/* Row 1: Telemetry & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 h-[400px] flex flex-col group" delay={0.5}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-cyan-400" /> Télémétrie Urbaine
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Moyenne / Minute</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10 }} minTickGap={60} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="h-[400px] flex flex-col items-center justify-center p-8" delay={0.6}>
          <h3 className="text-lg font-bold text-white mb-8 self-start">Santé du Réseau</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sensorStatus} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                {sensorStatus.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#334155'} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            {sensorStatus.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[s.name] }}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{s.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Row 2: Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="h-[400px] flex flex-col" delay={0.7}>
          <h3 className="text-lg font-bold text-white mb-4 flex justify-between items-center">
            Automates (Interventions)
            <ShieldAlert size={18} className="text-amber-500" />
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {latestInterventions.map((item, i) => (
              <motion.div
                key={item.id + item.status}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.target}</div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{item.desc}</div>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest ${
                    item.status === 'TERMINÉ' ? 'bg-emerald-500/10 text-emerald-500' :
                    item.status === 'DEMANDE' ? 'bg-indigo-500/10 text-indigo-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="h-[400px] flex flex-col" delay={0.8}>
          <h3 className="text-lg font-bold text-white mb-4 flex justify-between items-center">
            Tracking Véhicules
            <Cpu size={18} className="text-indigo-500" />
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {activeVehicles.map((v) => (
              <div key={v.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Car size={16} />
                    </div>
                    <span className="text-xs font-bold text-white">{v.id}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{v.location}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${v.battery}%` }}
                    className={`h-full rounded-full ${v.battery < 30 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Row 3: AI & Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="flex flex-col h-[300px] border-emerald-500/20 bg-emerald-500/5" delay={0.9}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" /> Analyse IA
          </h3>
          <div className="flex-1 bg-black/40 rounded-2xl p-5 border border-white/5 overflow-y-auto">
            <p className="text-sm text-slate-300 leading-relaxed font-medium italic">"{latestReport}"</p>
          </div>
          <Link to="/reports" className="mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl font-bold border border-emerald-500/20 transition-all group">
            Rapports de Ville <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </GlassCard>

        <GlassCard className="lg:col-span-2 overflow-hidden h-[300px]" delay={1.0}>
          <h3 className="text-lg font-bold text-white p-5 border-b border-white/5">Flux Direct des Mesures</h3>
          <div className="overflow-y-auto h-[210px] p-2 space-y-1">
            {latestReadings.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-white/5 transition-colors">
                <span className="font-mono text-cyan-400 text-xs font-bold w-32">{r.ref}</span>
                <span className="text-slate-500 text-[10px] uppercase font-bold flex-1">{r.location}</span>
                <span className="font-bold text-white text-xs w-24 text-right">{r.value} {r.unit}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

    </div>
  );
};

export default Dashboard;