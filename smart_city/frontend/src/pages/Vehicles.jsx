import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { 
  Car, Battery, MapPin, Navigation, Wifi, WifiOff, 
  Search, Filter, Activity, ShieldAlert, Truck, Bike, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import KPICard from '../components/KPICard';

const ZONES = [
  { id: 'Sousse Médina', x: 2, y: 3, label: 'Médina' },
  { id: 'Sousse Nord',   x: 4, y: 1, label: 'Sousse Nord' },
  { id: 'Akouda',        x: 1, y: 1, label: 'Akouda' },
  { id: 'Kalaa Sghira',  x: 1, y: 4, label: 'Kalaa Sghira' },
  { id: 'Hammam Sousse', x: 3, y: 2, label: 'Hammam Sousse' },
  { id: 'Sousse Riadh',  x: 3, y: 5, label: 'Sousse Riadh' },
  { id: 'Hergla',        x: 5, y: 1, label: 'Hergla' },
  { id: 'Bouficha',      x: 5, y: 3, label: 'Bouficha' },
  { id: 'Port de Sousse',x: 4, y: 4, label: 'Port' },
  { id: 'Msaken',        x: 2, y: 6, label: 'Msaken' },
  { id: 'Khezama Est',   x: 4, y: 2, label: 'Khezama' },
  { id: 'Sidi Abdelhamid',x: 5, y: 5, label: 'Sidi Abdel.' },
  { id: 'Messaadine',    x: 1, y: 6, label: 'Messaadine' },
];

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws/dashboard';
    let socket;

    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        setTimeout(connect, 5000);
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.activeVehicles) {
          setVehicles(data.activeVehicles);
        }
      };
    };

    connect();
    return () => socket?.close();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'ALL' || v.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [vehicles, searchTerm, filterStatus]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedId), 
  [vehicles, selectedId]);

  const getVehicleIcon = (id) => {
    if (id.includes('TUN')) return <Car size={20} />;
    if (id.includes('MOTO')) return <Bike size={20} />;
    return <Truck size={20} />;
  };

  const stats = {
    total: vehicles.length,
    moving: vehicles.filter(v => v.status === 'EN_ROUTE').length,
    alerts: vehicles.filter(v => v.status === 'EN_PANNE').length,
    avgBattery: vehicles.length ? Math.round(vehicles.reduce((acc, v) => acc + v.battery, 0) / vehicles.length) : 0
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 h-full flex flex-col pb-6"
    >
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-rajdhani tracking-tight flex items-center gap-3">
            <Navigation className="text-cyan-400" size={32} />
            Command Center: Flotte Autonome
          </h1>
          <p className="text-slate-400">Surveillance spatiale et télémétrie des véhicules Neo-Sousse.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {connected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
          {connected ? 'RESEAU ACTIF' : 'SYNCHRONISATION INTERROMPUE'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Unités" value={stats.total} icon={Car} colorClass="text-cyan-400" />
        <KPICard title="En Mission" value={stats.moving} icon={Activity} colorClass="text-indigo-400" />
        <KPICard title="Alertes / Panne" value={stats.alerts} icon={ShieldAlert} colorClass="text-rose-400" />
        <KPICard title="Batterie Moyenne" value={`${stats.avgBattery}%`} icon={Battery} colorClass="text-emerald-400" />
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-400 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'EN_ROUTE', 'ARRIVÉ', 'EN_PANNE'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                filterStatus === s 
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Map View */}
        <GlassCard className="lg:col-span-2 relative overflow-hidden bg-[#050810] p-0 border-slate-700/30 group">
          {/* Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
          
          <div className="relative w-full h-full p-8 grid grid-cols-6 grid-rows-6 gap-2">
            {/* Render Zones */}
            {ZONES.map(zone => (
              <div 
                key={zone.id}
                className="col-start-1 row-start-1 border border-white/5 bg-white/[0.02] rounded-3xl flex flex-col items-center justify-center text-center p-2 group hover:bg-white/[0.05] transition-all"
                style={{ 
                  gridColumnStart: zone.x, 
                  gridRowStart: zone.y,
                  gridColumnEnd: zone.x + 1,
                  gridRowEnd: zone.y + 1
                }}
              >
                <div className="w-1 h-1 rounded-full bg-slate-700 mb-2"></div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter opacity-50">{zone.label}</span>
              </div>
            ))}

            {/* Render Vehicles on Map */}
            <AnimatePresence>
              {filteredVehicles.map(v => {
                const zone = ZONES.find(z => z.id === v.location);
                if (!zone) return null;
                const isSelected = selectedId === v.id;
                
                return (
                  <motion.div
                    key={v.id}
                    layoutId={v.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: isSelected ? 1.2 : 1,
                      opacity: 1,
                      gridColumnStart: zone.x, 
                      gridRowStart: zone.y,
                      x: (Math.sin(v.id.length) * 30), // fixed offset based on ID
                      y: (Math.cos(v.id.length) * 30)
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                    className="col-start-1 row-start-1 z-20 flex flex-col items-center cursor-pointer"
                    style={{ gridColumnEnd: zone.x + 1, gridRowEnd: zone.y + 1 }}
                    onClick={() => setSelectedId(isSelected ? null : v.id)}
                  >
                    <div className={`relative p-2.5 rounded-xl border transition-all duration-500 ${
                      isSelected 
                        ? 'bg-cyan-500 text-white border-white shadow-[0_0_25px_rgba(6,182,212,0.8)] scale-110' 
                        : v.status === 'EN_PANNE' 
                          ? 'bg-rose-500/20 text-rose-500 border-rose-500/50' 
                          : v.status === 'STATIONNÉ'
                            ? 'bg-slate-800/40 text-slate-500 border-white/5 opacity-60 scale-90'
                            : 'bg-slate-800 text-cyan-400 border-white/10 hover:border-cyan-500/50'
                    }`}>
                      {getVehicleIcon(v.id)}
                      {isSelected && (
                        <div className="absolute inset-[-8px] border-2 border-dashed border-cyan-400 rounded-2xl animate-[spin_10s_linear_infinite] pointer-events-none"></div>
                      )}
                    </div>
                    <div className={`mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors ${
                      isSelected ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-black/60 text-slate-400 border-white/5'
                    }`}>
                      {v.id.split('-').pop()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Map Legend/Overlay */}
          <div className="absolute bottom-6 left-6 flex gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-black/60 px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div> EN MISSION
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-black/60 px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div> EN PANNE
            </div>
          </div>
        </GlassCard>

        {/* List View */}
        <div className="flex flex-col gap-6">
          <GlassCard className="flex-1 overflow-hidden flex flex-col border-slate-700/50 bg-[#0a0f1e]/40 p-0">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Détail de la Flotte
              </h3>
              <span className="text-[10px] font-bold text-slate-500">{filteredVehicles.length} ACTIFS</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredVehicles.map(v => (
                <motion.div
                  key={v.id}
                  layout
                  onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    selectedId === v.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50' 
                      : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        v.status === 'EN_PANNE' ? 'bg-rose-500/20 text-rose-400' : 
                        selectedId === v.id ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {getVehicleIcon(v.id)}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors uppercase">{v.id}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{v.location}</div>
                      </div>
                    </div>
                    <div className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest uppercase ${
                      v.status === 'EN_ROUTE' ? 'bg-emerald-500/10 text-emerald-500' :
                      v.status === 'EN_PANNE' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {v.status}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                      <span>Niveau d'énergie</span>
                      <span className={v.battery < 20 ? 'text-rose-500' : 'text-slate-300'}>{v.battery}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${v.battery}%` }}
                        className={`h-full rounded-full ${v.battery < 20 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                        style={{ boxShadow: v.battery < 20 ? '0 0 10px rgba(244,63,94,0.3)' : 'none' }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredVehicles.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 py-10 opacity-30">
                  <Car size={48} className="mb-4" />
                  <p className="text-sm font-bold">AUCUN UNITÉ TROUVÉE</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Contextual Detail Card */}
          <AnimatePresence>
            {selectedVehicle && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
              >
                <GlassCard className="border-cyan-500/40 bg-cyan-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Navigation size={64} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Focus Unité</h4>
                      <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white transition-colors">
                        <AlertCircle size={16} />
                      </button>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="p-4 bg-cyan-500 rounded-2xl text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        {getVehicleIcon(selectedVehicle.id)}
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-black text-white tracking-tighter">{selectedVehicle.id}</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase">
                          <CheckCircle size={12} /> {selectedVehicle.status === 'EN_ROUTE' ? 'En mission active' : 'En attente'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Localisation</div>
                        <div className="text-xs font-bold text-white">{selectedVehicle.location}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Autonomie</div>
                        <div className="text-xs font-bold text-white">{selectedVehicle.battery}%</div>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl border border-white/10 transition-all uppercase tracking-widest">
                      Ouvrir Télémétrie Complète
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
};

export default Vehicles;
