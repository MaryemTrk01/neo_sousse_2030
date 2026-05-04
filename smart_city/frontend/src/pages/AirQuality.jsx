import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { Wind, Thermometer, Droplets, AlertTriangle, Activity, ShieldCheck, Info } from 'lucide-react';

const SEUILS = {
  CO2: { normal: 400, warning: 800, critical: 1200, unit: 'ppm' },
  Pollution: { normal: 50, warning: 100, critical: 150, unit: 'AQI' },
  Temp: { normal: 22, warning: 30, critical: 35, unit: '°C' },
  Humidity: { normal: 45, warning: 70, critical: 85, unit: '%' }
};

const Gauge = ({ value, label, unit, config, icon: Icon }) => {
  const percent = Math.min(100, (value / config.critical) * 100);
  const isWarning = value >= config.warning;
  const isCritical = value >= config.critical;
  
  const color = isCritical ? '#ff4444' : isWarning ? '#f59e0b' : '#00ff88';

  return (
    <GlassCard className="flex flex-col items-center p-6 text-center border-white/5 hover:border-white/10 transition-all group">
      <div className={`p-4 rounded-2xl mb-4 transition-all duration-500 shadow-lg`} style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={32} className={isCritical ? 'animate-pulse' : ''} />
      </div>
      
      <div className="space-y-1 mb-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</h4>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-rajdhani font-bold text-white">{value}</span>
          <span className="text-xs font-bold text-slate-500">{unit}</span>
        </div>
      </div>

      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative mb-2">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className="h-full rounded-full transition-all duration-1000"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      
      <div className="flex justify-between w-full text-[9px] font-bold text-slate-600">
        <span>0</span>
        <span>{config.warning}</span>
        <span>{config.critical}</span>
      </div>

      {isCritical && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 uppercase tracking-tighter"
        >
          <AlertTriangle size={12} /> Seuil Critique Atteint
        </motion.div>
      )}
    </GlassCard>
  );
};

const AirQuality = () => {
  const [data, setData] = useState({
    CO2: 420,
    Pollution: 65,
    Temp: 24,
    Humidity: 52
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Simulated live updates for air quality
    const interval = setInterval(() => {
      setData(prev => ({
        CO2: Math.max(350, Math.min(1500, prev.CO2 + (Math.random() - 0.5) * 50)),
        Pollution: Math.max(20, Math.min(200, prev.Pollution + (Math.random() - 0.5) * 10)),
        Temp: Math.max(18, Math.min(38, prev.Temp + (Math.random() - 0.5) * 0.5)),
        Humidity: Math.max(30, Math.min(90, prev.Humidity + (Math.random() - 0.5) * 2))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 h-full flex flex-col">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-white mb-2 tracking-tight">Qualité de l'Air & Environnement</h1>
          <p className="text-slate-400">Surveillance des indicateurs écologiques en temps réel pour Neo-Sousse.</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
          <ShieldCheck className="text-emerald-400" size={20} />
          <div className="text-right">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Index Santé</div>
            <div className="text-sm font-bold text-white">OPTIMAL</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Gauge value={Math.round(data.CO2)} label="CO2 Concentration" unit="ppm" config={SEUILS.CO2} icon={Wind} />
        <Gauge value={Math.round(data.Pollution)} label="Pollution (AQI)" unit="AQI" config={SEUILS.Pollution} icon={Activity} />
        <Gauge value={data.Temp.toFixed(1)} label="Température" unit="°C" config={SEUILS.Temp} icon={Thermometer} />
        <Gauge value={Math.round(data.Humidity)} label="Humidité" unit="%" config={SEUILS.Humidity} icon={Droplets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <GlassCard className="lg:col-span-2 flex flex-col overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Info size={18} className="text-cyan-400" /> Analyse Environnementale
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="text-sm font-bold text-white mb-2">Conseils Municipaux</h4>
              <p className="text-xs text-slate-400 leading-relaxed italic">
                "La qualité de l'air est restée stable au cours de la dernière heure. Nous recommandons de maintenir les zones piétonnes de la Médina fermées au trafic lourd pour préserver ces niveaux."
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="text-sm font-bold text-white mb-2">Rapport d'Impact CO2</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Les capteurs de la Zone Nord indiquent une légère hausse de CO2 entre 17h00 et 19h00, corrélée aux pics de trafic. L'IA recommande une optimisation des feux de signalisation via l'automate de trafic.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col border-amber-500/20 bg-amber-500/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Seuils & Alertes
          </h3>
          <div className="space-y-4">
            {Object.entries(SEUILS).map(([key, config]) => (
              <div key={key} className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{key}</div>
                  <div className="text-xs font-bold text-slate-300">Max Alert: {config.warning} {config.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-rose-500">DANGER</div>
                  <div className="text-xs font-bold text-white">{config.critical} {config.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default AirQuality;
