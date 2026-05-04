import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, MiniMap, Controls, Background, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { automataApi } from '../api/api';
import GlassCard from '../components/GlassCard';
import { Cpu, ArrowRight, History, Info, Zap, CheckCircle, AlertTriangle, Wrench, XCircle, Clock, Play } from 'lucide-react';
import toast from 'react-hot-toast';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

// ─── Entity Definitions ──────────────────────────────────────────────────────

const automataData = {
  capteur: {
    label: 'Sensor',
    icon: '📡',
    description: 'Tracks the lifecycle of a physical sensor installed in the city.',
    states: ['INACTIF', 'ACTIF', 'SIGNALÉ', 'EN_MAINTENANCE', 'HORS_SERVICE'],
    stateInfo: {
      INACTIF:        { color: '#64748b', icon: Clock,        label: 'Inactive',      desc: 'Sensor is installed but not yet activated.' },
      ACTIF:          { color: '#00ff88', icon: CheckCircle,  label: 'Active',        desc: 'Sensor is online and collecting data.' },
      'SIGNALÉ':      { color: '#f59e0b', icon: AlertTriangle,label: 'Reported',      desc: 'A fault has been reported by a citizen or system.' },
      EN_MAINTENANCE: { color: '#00d4ff', icon: Wrench,       label: 'In Maintenance',desc: 'A technician is currently working on the sensor.' },
      HORS_SERVICE:   { color: '#ef4444', icon: XCircle,      label: 'Out of Service',desc: 'Sensor is permanently disabled.' },
    },
    events: [
      { id: 'installer',           label: 'Activate',          icon: '▶',  desc: 'Put the sensor online for the first time.' },
      { id: 'signaler_panne',      label: 'Report Fault',      icon: '⚠',  desc: 'Mark the sensor as having a problem.' },
      { id: 'demarrer_maintenance',label: 'Start Maintenance',  icon: '🔧', desc: 'Assign a technician to fix the sensor.' },
      { id: 'reparer',             label: 'Mark as Repaired',  icon: '✅', desc: 'Sensor is fixed and back online.' },
      { id: 'declarer_hs',         label: 'Decommission',      icon: '❌', desc: 'Sensor is beyond repair, disable it permanently.' },
    ],
    edges: [
      { source: 'INACTIF',        target: 'ACTIF',          label: 'Activate' },
      { source: 'ACTIF',          target: 'SIGNALÉ',        label: 'Report Fault' },
      { source: 'SIGNALÉ',        target: 'EN_MAINTENANCE', label: 'Start Maintenance' },
      { source: 'EN_MAINTENANCE', target: 'ACTIF',          label: 'Repaired' },
      { source: 'EN_MAINTENANCE', target: 'HORS_SERVICE',   label: 'Decommission' },
      { source: 'ACTIF',          target: 'HORS_SERVICE',   label: 'Decommission' },
    ]
  },
  intervention: {
    label: 'Intervention',
    icon: '🛠',
    description: 'Manages the approval workflow for a maintenance intervention request.',
    states: ['DEMANDE', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINÉ'],
    stateInfo: {
      DEMANDE:       { color: '#64748b', icon: Clock,        label: 'Requested',       desc: 'A new intervention has been requested.' },
      'TECH1_ASSIGNÉ':{ color: '#f59e0b', icon: Wrench,      label: 'Tech Assigned',   desc: 'First technician has been assigned.' },
      TECH2_VALIDE:  { color: '#00d4ff', icon: CheckCircle,  label: 'Tech Validated',  desc: 'Second technician confirmed the diagnosis.' },
      IA_VALIDE:     { color: '#a855f7', icon: Zap,          label: 'AI Validated',    desc: 'The AI system has approved the intervention.' },
      'TERMINÉ':     { color: '#00ff88', icon: CheckCircle,  label: 'Completed',       desc: 'The intervention is fully completed.' },
    },
    events: [
      { id: 'assigner_tech', label: 'Assign Technician', icon: '👷', desc: 'Assign the first technician to this job.' },
      { id: 'valider_tech',  label: 'Validate (Tech 2)', icon: '✅', desc: 'Second technician confirms the work.' },
      { id: 'valider_ia',    label: 'Validate (AI)',     icon: '🤖', desc: 'AI system approves the intervention report.' },
      { id: 'terminer',      label: 'Close Intervention',icon: '🏁', desc: 'Mark the intervention as fully done.' },
    ],
    edges: [
      { source: 'DEMANDE',       target: 'TECH1_ASSIGNÉ', label: 'Assign Tech' },
      { source: 'TECH1_ASSIGNÉ', target: 'TECH2_VALIDE',  label: 'Tech 2 Validates' },
      { source: 'TECH2_VALIDE',  target: 'IA_VALIDE',     label: 'AI Validates' },
      { source: 'IA_VALIDE',     target: 'TERMINÉ',       label: 'Close' },
    ]
  },
  vehicule: {
    label: 'Vehicle',
    icon: '🚗',
    description: 'Tracks a smart city vehicle as it moves through its operational states.',
    states: ['STATIONNÉ', 'EN_ROUTE', 'EN_PANNE', 'ARRIVÉ'],
    stateInfo: {
      'STATIONNÉ': { color: '#64748b', icon: Clock,         label: 'Parked',       desc: 'Vehicle is parked and idle.' },
      EN_ROUTE:    { color: '#00d4ff', icon: Play,          label: 'En Route',     desc: 'Vehicle is currently on a mission.' },
      EN_PANNE:    { color: '#ef4444', icon: AlertTriangle, label: 'Broken Down',  desc: 'Vehicle has broken down mid-route.' },
      'ARRIVÉ':    { color: '#00ff88', icon: CheckCircle,   label: 'Arrived',      desc: 'Vehicle has reached its destination.' },
    },
    events: [
      { id: 'demarrer',        label: 'Depart',       icon: '🚀', desc: 'Send the vehicle on a new mission.' },
      { id: 'tomber_en_panne', label: 'Break Down',   icon: '💥', desc: 'Vehicle has a mechanical failure.' },
      { id: 'reparer',         label: 'Repair',       icon: '🔧', desc: 'Vehicle is repaired and returns to parking.' },
      { id: 'arriver',         label: 'Arrive',       icon: '📍', desc: 'Vehicle reached its destination.' },
      { id: 'stationner',      label: 'Park',         icon: '🅿', desc: 'Vehicle returns to its parking spot.' },
    ],
    edges: [
      { source: 'STATIONNÉ', target: 'EN_ROUTE',  label: 'Depart' },
      { source: 'EN_ROUTE',  target: 'EN_PANNE',  label: 'Break Down' },
      { source: 'EN_PANNE',  target: 'STATIONNÉ', label: 'Repair' },
      { source: 'EN_ROUTE',  target: 'ARRIVÉ',    label: 'Arrive' },
      { source: 'ARRIVÉ',    target: 'STATIONNÉ', label: 'Park' },
    ]
  }
};

// ─── State Color Helpers ──────────────────────────────────────────────────────

const getStateColor = (entityType, state) =>
  automataData[entityType]?.stateInfo[state]?.color || '#64748b';

// ─── Custom Flow Node ─────────────────────────────────────────────────────────

const CustomNode = ({ data }) => {
  const isCurrent = data.isCurrent;
  return (
    <div style={{
      padding: '10px 20px',
      borderRadius: '12px',
      border: `2px solid ${isCurrent ? data.color : '#334155'}`,
      background: isCurrent ? `${data.color}22` : '#1E293B',
      boxShadow: isCurrent ? `0 0 24px ${data.color}66` : 'none',
      transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
      transition: 'all 0.3s ease',
      minWidth: 140,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: isCurrent ? data.color : '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>
        {data.label}
      </div>
      {isCurrent && (
        <div style={{ fontSize: 10, color: data.color, marginTop: 4, opacity: 0.8 }}>
          ● CURRENT
        </div>
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

// ─── Main Component ───────────────────────────────────────────────────────────

const Automata = () => {
  const [entityType, setEntityType] = useState('capteur');
  const [entityId, setEntityId] = useState('1');
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [liveInterventions, setLiveInterventions] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  const entity = automataData[entityType];
  const stateInfo = currentState ? entity.stateInfo[currentState] : null;
  const StateIcon = stateInfo?.icon || Clock;

  // ── Flow Graph ──────────────────────────────────────────────────────────────

  const { initialNodes, initialEdges } = useMemo(() => {
    const data = automataData[entityType];
    const stateCount = data.states.length;

    // Circular layout
    const cx = 300, cy = 250, rx = 220, ry = 180;
    const nodes = data.states.map((state, i) => {
      const angle = (2 * Math.PI * i) / stateCount - Math.PI / 2;
      return {
        id: state,
        type: 'custom',
        position: { x: cx + rx * Math.cos(angle) - 70, y: cy + ry * Math.sin(angle) - 20 },
        data: {
          label: data.stateInfo[state]?.label || state,
          isCurrent: state === currentState,
          color: data.stateInfo[state]?.color || '#64748b',
        }
      };
    });

    const edges = data.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.source === currentState,
      style: { stroke: e.source === currentState ? getStateColor(entityType, e.source) : '#334155', strokeWidth: e.source === currentState ? 2.5 : 1.5 },
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.source === currentState ? getStateColor(entityType, e.source) : '#334155' }
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [entityType, currentState]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // ── WebSocket Integration ──────────────────────────────────────────────────
  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws/dashboard';
    let socket;

    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onopen = () => setWsConnected(true);
      socket.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 5000);
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.latestInterventions) {
          setLiveInterventions(data.latestInterventions);
          
          // If we are looking at an intervention and its ID matches one in the live feed, auto-update
          if (entityType === 'intervention') {
            const match = data.latestInterventions.find(i => String(i.id) === String(entityId));
            if (match) {
              setCurrentState(match.status);
              setHistory(prev => {
                if (prev[0]?.state === match.status) return prev;
                return [{ time: match.time, event: 'Live Update', state: match.status, type: 'live' }, ...prev.slice(0, 9)];
              });
            }
          }
        }
      };
    };

    connect();
    return () => socket?.close();
  }, [entityType, entityId]);

  // ── API Calls ───────────────────────────────────────────────────────────────

  const loadState = async () => {
    setLoading(true);
    try {
      const res = await automataApi.getState(entityType, entityId);
      setCurrentState(res.data.state);
      setHistory(prev => [{ time: new Date().toLocaleTimeString(), event: 'Loaded State', state: res.data.state, type: 'load' }, ...prev.slice(0, 9)]);
      toast.success(`State loaded for ${entity.label} #${entityId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load state");
      setCurrentState(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerEvent = async (eventId, eventLabel) => {
    setLoading(true);
    try {
      const res = await automataApi.transition(entityType, entityId, eventId);
      setCurrentState(res.data.new_state);
      setHistory(prev => [{ time: new Date().toLocaleTimeString(), event: eventLabel, state: res.data.new_state, type: 'transition' }, ...prev.slice(0, 9)]);
      toast.success(`✅ ${eventLabel} → ${res.data.new_state}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Transition not allowed from current state");
    } finally {
      setLoading(false);
    }
  };

  const switchType = (type) => {
    setEntityType(type);
    setCurrentState(null);
    setHistory([]);
    setShowInfo(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial="initial" animate="in" exit="out"
      variants={pageVariants} transition={{ duration: 0.4 }}
      className="h-full flex flex-col space-y-4"
    >
      {/* Header */}
      <header className="shrink-0">
        <h1 className="text-3xl font-rajdhani font-bold text-white mb-1">State Machine Engine</h1>
        <p className="text-slate-400 text-sm">
          Control and monitor the lifecycle of smart city entities. Each entity follows defined rules — only valid transitions are allowed.
        </p>
      </header>

      {/* Entity Type Tabs */}
      <div className="flex gap-2 shrink-0">
        {Object.entries(automataData).map(([type, def]) => (
          <button
            key={type}
            onClick={() => switchType(type)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              entityType === type
                ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border-[#00d4ff]/40 shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <span>{def.icon}</span> {def.label}
          </button>
        ))}
      </div>

      {/* Entity Description Banner */}
      <div className="shrink-0 flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <Info size={16} className="text-[#00d4ff] shrink-0 mt-0.5" />
        <p className="text-slate-300 text-sm">{entity.description}</p>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* Left Panel */}
        <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">

          {/* Load Entity */}
          <GlassCard className="space-y-3 border-slate-700/50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 1 — Select Entity</p>
            <p className="text-xs text-slate-500">Enter the ID of a {entity.label.toLowerCase()} from your database, then click Load.</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                placeholder="Entity ID"
                className="w-full bg-[#050810] border border-slate-700 rounded-lg p-2.5 text-[#00d4ff] font-mono focus:border-[#00d4ff] outline-none transition-colors text-sm"
              />
              <button
                onClick={loadState}
                disabled={loading}
                title="Load State"
                className="px-4 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff] rounded-lg border border-[#00d4ff]/30 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Cpu size={16} />
              </button>
            </div>
          </GlassCard>

          {/* Current State */}
          <AnimatePresence>
            {currentState && stateInfo && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="border-slate-700/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current State</p>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border mb-2"
                    style={{ borderColor: `${stateInfo.color}44`, background: `${stateInfo.color}11` }}
                  >
                    <StateIcon size={20} style={{ color: stateInfo.color }} />
                    <div>
                      <div className="font-bold text-sm" style={{ color: stateInfo.color }}>{stateInfo.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{stateInfo.desc}</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <AnimatePresence>
            {currentState && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                <GlassCard className="flex-1 border-slate-700/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step 2 — Trigger an Action</p>
                  <p className="text-xs text-slate-500 mb-3">Click an action below to move this {entity.label.toLowerCase()} to its next state.</p>
                  <div className="space-y-2">
                    {entity.events.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => triggerEvent(ev.id, ev.label)}
                        disabled={loading}
                        className="w-full text-left px-3 py-2.5 bg-[#0a0f1e] hover:bg-[#00d4ff]/08 border border-slate-700/70 hover:border-[#00d4ff]/40 rounded-lg transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ev.icon}</span>
                            <span className="text-sm font-semibold text-slate-200 group-hover:text-[#00d4ff] transition-colors">{ev.label}</span>
                          </div>
                          <ArrowRight size={14} className="text-slate-600 group-hover:text-[#00d4ff] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 pl-7">{ev.desc}</p>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Interventions Feed */}
          <GlassCard className="border-slate-700/50 p-0 overflow-hidden flex flex-col h-[200px]">
            <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#00ff88] animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Interventions</span>
              </div>
            </div>
            <div className="p-2 overflow-y-auto space-y-1">
              {liveInterventions.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => { setEntityType('intervention'); setEntityId(item.id); setCurrentState(item.status); }}
                  className="p-2 rounded bg-white/5 border border-white/5 hover:border-[#00d4ff]/30 cursor-pointer transition-all flex justify-between items-center"
                >
                  <span className="text-[10px] font-bold text-white">{item.target}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">{item.status}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Timeline */}
          <GlassCard className="border-slate-700/50 p-0 overflow-hidden flex-1">
            <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
              <History size={14} className="text-[#00ff88]" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Event Timeline</span>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No events yet. Load an entity to start.</p>
              ) : history.map((h, i) => (
                <div key={i} className="flex gap-2 text-xs items-start">
                  <span className="text-slate-600 font-mono shrink-0 pt-0.5">{h.time}</span>
                  <div>
                    <span className="text-slate-400">{h.event}</span>
                    <span className="text-[#00d4ff] ml-1">→ {automataData[entityType]?.stateInfo[h.state]?.label || h.state}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Panel — Flow Diagram */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">

          {/* Legend */}
          <div className="shrink-0 flex flex-wrap gap-2">
            {entity.states.map(s => {
              const info = entity.stateInfo[s];
              const Icon = info.icon;
              const isCurr = s === currentState;
              return (
                <div
                  key={s}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                  style={{
                    borderColor: isCurr ? info.color : '#334155',
                    background: isCurr ? `${info.color}18` : 'transparent',
                    color: isCurr ? info.color : '#64748b',
                    boxShadow: isCurr ? `0 0 10px ${info.color}44` : 'none'
                  }}
                >
                  <Icon size={12} style={{ color: info.color }} />
                  {info.label}
                </div>
              );
            })}
          </div>

          {/* ReactFlow */}
          <GlassCard className="flex-1 p-0 overflow-hidden relative min-h-64">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              className="bg-[#050810]"
            >
              <Background color="#1e293b" gap={20} />
              <Controls className="bg-slate-800 border-slate-700" />
              <MiniMap
                style={{ backgroundColor: '#0a0f1e', border: '1px solid #1e293b' }}
                nodeColor={n => n.data.isCurrent ? n.data.color : '#334155'}
                maskColor="rgba(0,212,255,0.05)"
              />
            </ReactFlow>

            {/* Overlay when no state loaded */}
            {!currentState && (
              <div className="absolute inset-0 bg-[#0a0f1e]/85 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center max-w-xs">
                  <div className="text-4xl mb-3">{entity.icon}</div>
                  <p className="text-white font-semibold mb-1">No Entity Loaded</p>
                  <p className="text-slate-400 text-sm">
                    Enter a <span className="text-[#00d4ff]">{entity.label} ID</span> on the left and click <span className="text-[#00d4ff]">Load</span> to visualize its current state.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* State Transition Rules */}
          <GlassCard className="shrink-0 border-slate-700/50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📋 Allowed Transitions</p>
            <div className="flex flex-wrap gap-2">
              {entity.edges.map((e, i) => {
                const fromInfo = entity.stateInfo[e.source];
                const toInfo = entity.stateInfo[e.target];
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-lg">
                    <span style={{ color: fromInfo?.color }}>{fromInfo?.label || e.source}</span>
                    <ArrowRight size={10} className="text-slate-600" />
                    <span style={{ color: toInfo?.color }}>{toInfo?.label || e.target}</span>
                    <span className="text-slate-600 ml-1">({e.label})</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};

export default Automata;