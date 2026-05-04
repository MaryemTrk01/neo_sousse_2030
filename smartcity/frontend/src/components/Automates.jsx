import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import {
    Car,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Play,
    RefreshCcw,
    Search,
    Wrench,
} from 'lucide-react';
import { useSocket } from '../SocketContext';

const STATE_COLORS = {
    INACTIF: '#64748b',
    ACTIF: '#22c55e',
    SIGNALE: '#f59e0b',
    EN_MAINTENANCE: '#eab308',
    HORS_SERVICE: '#ef4444',
    DEMANDE: '#94a3b8',
    TECH1_ASSIGNE: '#3b82f6',
    TECH2_VALIDE: '#8b5cf6',
    IA_VALIDE: '#06b6d4',
    TERMINE: '#22c55e',
    STATIONNE: '#64748b',
    EN_ROUTE: '#3b82f6',
    EN_PANNE: '#ef4444',
    ARRIVE: '#22c55e',
};

const FSM_DEFS = {
    capteur: {
        label: 'Capteurs',
        icon: Cpu,
        endpoint: 'capteurs',
        accent: 'text-cyan-300',
        states: ['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE'],
        transitions: [
            { from: 'INACTIF', to: 'ACTIF', label: 'activer' },
            { from: 'ACTIF', to: 'SIGNALE', label: 'signaler' },
            { from: 'SIGNALE', to: 'EN_MAINTENANCE', label: 'maintenir' },
            { from: 'EN_MAINTENANCE', to: 'HORS_SERVICE', label: 'declarer_hs' },
        ],
    },
    intervention: {
        label: 'Interventions',
        icon: Wrench,
        endpoint: 'interventions',
        accent: 'text-amber-300',
        states: ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE'],
        transitions: [
            { from: 'DEMANDE', to: 'TECH1_ASSIGNE', label: 'assigner_tech1' },
            { from: 'TECH1_ASSIGNE', to: 'TECH2_VALIDE', label: 'valider_tech2' },
            { from: 'TECH2_VALIDE', to: 'IA_VALIDE', label: 'valider_ia' },
            { from: 'IA_VALIDE', to: 'TERMINE', label: 'terminer' },
        ],
    },
    vehicule: {
        label: 'Vehicules',
        icon: Car,
        endpoint: 'vehicules',
        accent: 'text-blue-300',
        states: ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE'],
        transitions: [
            { from: 'STATIONNE', to: 'EN_ROUTE', label: 'demarrer' },
            { from: 'EN_ROUTE', to: 'EN_PANNE', label: 'panne' },
            { from: 'EN_ROUTE', to: 'ARRIVE', label: 'arriver' },
            { from: 'EN_PANNE', to: 'STATIONNE', label: 'reparer' },
            { from: 'ARRIVE', to: 'EN_ROUTE', label: 'demarrer' },
        ],
    },
};

const formatState = (state) => (state || 'AUCUN').replaceAll('_', ' ');

const getFlowData = (fsmKey, currentState) => {
    const def = FSM_DEFS[fsmKey];
    const nodeGap = def.states.length <= 4 ? 230 : 190;

    const nodes = def.states.map((state, index) => {
        const isActive = state === currentState;
        const color = STATE_COLORS[state] || '#40e0d0';

        return {
            id: state,
            data: { label: formatState(state) },
            position: { x: index * nodeGap, y: index % 2 === 0 ? 80 : 210 },
            style: {
                width: 156,
                minHeight: 58,
                borderRadius: 16,
                border: `2px solid ${isActive ? '#ffffff' : `${color}88`}`,
                background: isActive ? color : '#111827',
                color: isActive ? '#ffffff' : '#cbd5e1',
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: 0,
                boxShadow: isActive ? `0 0 28px ${color}66` : '0 10px 30px rgba(0,0,0,0.25)',
            },
        };
    });

    const edges = def.transitions.map((transition, index) => {
        const isSourceActive = transition.from === currentState;
        const color = isSourceActive ? '#40e0d0' : '#334155';

        return {
            id: `edge-${fsmKey}-${index}`,
            source: transition.from,
            target: transition.to,
            label: transition.label,
            animated: isSourceActive,
            style: { stroke: color, strokeWidth: isSourceActive ? 3 : 1.5 },
            labelStyle: { fill: isSourceActive ? '#40e0d0' : '#94a3b8', fontSize: 10, fontWeight: 800 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
        };
    });

    return { nodes, edges };
};

export default function Automates({ apiBase }) {
    const [selectedFsm, setSelectedFsm] = useState('capteur');
    const [entities, setEntities] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [filterState, setFilterState] = useState('ALL');
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const entityListRef = useRef(null);
    const { socket } = useSocket();

    const currentDef = FSM_DEFS[selectedFsm];
    const EntityIcon = currentDef.icon;

    const fetchEntities = useCallback(async (refreshSelected = false) => {
        try {
            const res = await axios.get(`${apiBase}/${FSM_DEFS[selectedFsm].endpoint}`);
            const list = res.data[FSM_DEFS[selectedFsm].endpoint] || [];
            setEntities(list);

            if (refreshSelected || !selectedEntity) {
                setSelectedEntity(list[0] || null);
            } else {
                const updated = list.find((entity) => entity.id === selectedEntity.id);
                if (updated) setSelectedEntity(updated);
            }
        } catch (err) {
            console.error(err);
        }
    }, [apiBase, selectedFsm, selectedEntity]);

    useEffect(() => {
        setValidation(null);
        setFilterText('');
        setFilterState('ALL');
        fetchEntities(true);
    }, [selectedFsm]);

    useEffect(() => {
        const timer = setInterval(() => fetchEntities(false), 60000);
        return () => clearInterval(timer);
    }, [fetchEntities]);

    useEffect(() => {
        if (!socket) return undefined;

        const handleStatusChange = (data) => {
            if (data.entity !== selectedFsm) return;

            setEntities((prev) => prev.map((entity) => (
                entity.id === data.id ? { ...entity, statut: data.new_status } : entity
            )));
            setSelectedEntity((prev) => (
                prev?.id === data.id ? { ...prev, statut: data.new_status } : prev
            ));
            fetchEntities(false);
        };

        socket.on('status_change', handleStatusChange);
        return () => socket.off('status_change', handleStatusChange);
    }, [socket, selectedFsm, fetchEntities]);

    useEffect(() => {
        const { nodes: flowNodes, edges: flowEdges } = getFlowData(selectedFsm, selectedEntity?.statut || null);
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [selectedEntity, selectedFsm, setNodes, setEdges]);

    const availableTransitions = useMemo(() => (
        currentDef.transitions.filter((transition) => transition.from === selectedEntity?.statut)
    ), [currentDef.transitions, selectedEntity?.statut]);

    const statusCounts = useMemo(() => (
        entities.reduce((acc, entity) => {
            acc[entity.statut] = (acc[entity.statut] || 0) + 1;
            return acc;
        }, {})
    ), [entities]);

    const filteredEntities = useMemo(() => (
        entities.filter((entity) => {
            const matchesText = !filterText.trim() || String(entity.id).includes(filterText.trim());
            const matchesState = filterState === 'ALL' || entity.statut === filterState;
            return matchesText && matchesState;
        })
    ), [entities, filterText, filterState]);

    const scrollEntities = (direction) => {
        entityListRef.current?.scrollBy({
            left: direction * 360,
            behavior: 'smooth',
        });
    };

    const handleTransition = async (trigger, nextState) => {
        if (!selectedEntity) return;

        setLoading(true);
        try {
            const res = await axios.post(`${apiBase}/${currentDef.endpoint}/${selectedEntity.id}/transition`, {
                event: trigger,
            });

            if (res.data.success) {
                setSelectedEntity((prev) => (prev ? { ...prev, statut: res.data.new_status } : prev));
                setEntities((prev) => prev.map((entity) => (
                    entity.id === selectedEntity.id ? { ...entity, statut: res.data.new_status } : entity
                )));
                setValidation({
                    valide: true,
                    justification: `Transition ${formatState(selectedEntity.statut)} -> ${formatState(nextState)} appliquee avec succes.`,
                });
            } else {
                setValidation({ valide: false, justification: res.data.error || 'Transition refusee.' });
            }
        } catch (err) {
            console.error(err);
            setValidation({ valide: false, justification: err.response?.data?.error || 'Erreur lors de la transition.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-7 animate-fade-in">
            <header className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Automates <span className="text-gradient">Operationnels</span>
                    </h2>
                    <p className="text-text-muted font-medium mt-2">
                        Pilotage visuel des etats et validation des transitions Neo-Sousse.
                    </p>
                </div>

                <div className="flex gap-2 p-1.5 neo-glass rounded-2xl border border-white/5">
                    {Object.entries(FSM_DEFS).map(([key, def]) => {
                        const Icon = def.icon;
                        const active = selectedFsm === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedFsm(key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active
                                    ? 'bg-turquoise text-black shadow-lg shadow-turquoise/20'
                                    : 'text-text-dim hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {def.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            <section className="neo-card p-6 bg-black/40">
                <div className="flex flex-wrap items-center justify-between gap-5 mb-6">
                    <div className="flex flex-wrap items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl border border-turquoise/30 bg-turquoise/10 flex items-center justify-center">
                            <EntityIcon className={`w-6 h-6 ${currentDef.accent}`} />
                        </div>
                        <div>
                            <p className="text-[10px] text-text-dim font-black uppercase tracking-[0.2em]">Entites</p>
                            <h3 className="text-xl font-black text-white">{currentDef.label}</h3>
                        </div>
                        <div className="hidden sm:grid grid-cols-3 gap-3">
                            <div className="min-w-[112px] rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">Total</p>
                                <p className="text-xl font-black text-white">{entities.length}</p>
                            </div>
                            <div className="min-w-[112px] rounded-2xl border border-turquoise/30 bg-turquoise/[0.06] px-5 py-4">
                                <p className="text-[10px] font-black text-turquoise uppercase tracking-widest">Selection</p>
                                <p className="text-xl font-black text-white">#{selectedEntity?.id || '--'}</p>
                            </div>
                            <div className="min-w-[112px] rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">Affiches</p>
                                <p className="text-xl font-black text-white">{filteredEntities.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/10 bg-bg-deep/70 p-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-turquoise" />
                            <input
                                value={filterText}
                                onChange={(event) => setFilterText(event.target.value)}
                                placeholder="ID"
                                className="h-12 w-36 rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-text-dim focus:border-turquoise/50 focus:bg-turquoise/[0.05]"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterState}
                                onChange={(event) => setFilterState(event.target.value)}
                                className="h-12 min-w-[230px] appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-11 text-xs font-black uppercase tracking-widest text-white outline-none transition-colors [color-scheme:dark] focus:border-turquoise/50 focus:bg-turquoise/[0.05]"
                            >
                                <option className="bg-bg-deep text-white" value="ALL">Tous les etats</option>
                                {currentDef.states.map((state) => (
                                    <option className="bg-bg-deep text-white" key={state} value={state}>{formatState(state)}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                        </div>
                        <button
                            onClick={() => scrollEntities(-1)}
                            className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:text-turquoise hover:bg-turquoise/[0.06] transition-colors flex items-center justify-center"
                            title="Glisser a gauche"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scrollEntities(1)}
                            className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:text-turquoise hover:bg-turquoise/[0.06] transition-colors flex items-center justify-center"
                            title="Glisser a droite"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => fetchEntities(false)}
                            className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] text-turquoise hover:bg-turquoise/[0.06] transition-colors flex items-center justify-center"
                            title="Rafraichir"
                        >
                            <RefreshCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div
                    ref={entityListRef}
                    className="flex gap-3 overflow-x-auto custom-scrollbar scroll-smooth pb-2"
                >
                    {filteredEntities.map((entity) => {
                        const active = selectedEntity?.id === entity.id;
                        const color = STATE_COLORS[entity.statut] || '#40e0d0';
                        return (
                            <button
                                key={entity.id}
                                onClick={() => setSelectedEntity(entity)}
                                className={`min-w-[230px] p-4 rounded-2xl border text-left transition-all ${active
                                    ? 'bg-turquoise/10 border-turquoise/40 shadow-lg shadow-turquoise/5'
                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className={`text-sm font-black ${active ? 'text-turquoise' : 'text-white'}`}>ID #{entity.id}</span>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                </div>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-text-dim">
                                    {formatState(entity.statut)}
                                </p>
                            </button>
                        );
                    })}
                    {filteredEntities.length === 0 && (
                        <div className="min-w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-text-dim">
                                Aucun element trouve avec ce filtre
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <main className="neo-card bg-black/40 overflow-hidden flex flex-col min-h-[650px]">
                    <div className="px-7 py-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl border border-turquoise/20 bg-turquoise/10 flex items-center justify-center">
                                <EntityIcon className={`w-6 h-6 ${currentDef.accent}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Etat courant</p>
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    {formatState(selectedEntity?.statut)}
                                </h3>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {currentDef.states.map((state) => (
                                <span
                                    key={state}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70"
                                >
                                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATE_COLORS[state] }} />
                                    {formatState(state)}: {statusCounts[state] || 0}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="relative h-[520px] w-full">
                        <div className="absolute left-6 top-6 z-10 rounded-2xl border border-white/10 bg-bg-deep/80 px-4 py-2 backdrop-blur-xl">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-turquoise animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Diagramme temps reel</span>
                            </div>
                        </div>
                        <ReactFlow
                            key={selectedFsm}
                            className="h-full w-full"
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            fitView
                            fitViewOptions={{ padding: 0.22, minZoom: 0.55, maxZoom: 1.05 }}
                            nodesDraggable={false}
                            zoomOnScroll={false}
                            panOnScroll
                        >
                            <Background color="rgba(255,255,255,0.04)" gap={28} />
                            <Controls className="!bg-bg-deep !border-white/10 !rounded-xl !shadow-2xl" />
                        </ReactFlow>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-gradient-to-t from-bg-deep to-transparent">
                        <div className="flex flex-wrap items-center justify-between gap-5">
                            <div>
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Transitions disponibles</p>
                                <p className="text-sm text-white/60 mt-1">Choisissez une action valide pour l'entite selectionnee.</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {availableTransitions.length > 0 ? availableTransitions.map((transition) => (
                                    <button
                                        key={`${transition.from}-${transition.to}-${transition.label}`}
                                        onClick={() => handleTransition(transition.label, transition.to)}
                                        disabled={loading}
                                        className="btn-primary flex items-center gap-3 px-6 py-3 shadow-turquoise/20 disabled:opacity-40"
                                    >
                                        <Play className="w-4 h-4" />
                                        <span className="font-black uppercase tracking-widest text-[10px]">{transition.label}</span>
                                    </button>
                                )) : (
                                    <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-black uppercase tracking-widest text-text-dim">
                                        Aucune transition disponible
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </section>
        </div>
    );
}
