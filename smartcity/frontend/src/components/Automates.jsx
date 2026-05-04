import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GitBranch, Play, CheckCircle2, AlertCircle, Info, RefreshCcw } from 'lucide-react';
import { useSocket } from '../SocketContext';

const STATE_COLORS = {
    'INACTIF': '#64748b', 'ACTIF': '#22c55e', 'SIGNALE': '#f59e0b', 'EN_MAINTENANCE': '#eab308', 'HORS_SERVICE': '#ef4444',
    'DEMANDE': '#94a3b8', 'TECH1_ASSIGNE': '#3b82f6', 'TECH2_VALIDE': '#8b5cf6', 'IA_VALIDE': '#06b6d4', 'TERMINE': '#22c55e',
    'STATIONNE': '#64748b', 'EN_ROUTE': '#3b82f6', 'EN_PANNE': '#ef4444', 'ARRIVE': '#22c55e',
};

const FSM_DEFS = {
    capteur: {
        states: ['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE'],
        transitions: [
            { from: 'INACTIF', to: 'ACTIF', label: 'activer' },
            { from: 'ACTIF', to: 'SIGNALE', label: 'signaler' },
            { from: 'SIGNALE', to: 'EN_MAINTENANCE', label: 'maintenir' },
            { from: 'EN_MAINTENANCE', to: 'HORS_SERVICE', label: 'declarer_hs' },
        ]
    },
    intervention: {
        states: ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE'],
        transitions: [
            { from: 'DEMANDE', to: 'TECH1_ASSIGNE', label: 'assigner_tech1' },
            { from: 'TECH1_ASSIGNE', to: 'TECH2_VALIDE', label: 'valider_tech2' },
            { from: 'TECH2_VALIDE', to: 'IA_VALIDE', label: 'valider_ia' },
            { from: 'IA_VALIDE', to: 'TERMINE', label: 'terminer' },
        ]
    },
    vehicule: {
        states: ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE'],
        transitions: [
            { from: 'STATIONNE', to: 'EN_ROUTE', label: 'demarrer' },
            { from: 'EN_ROUTE', to: 'EN_PANNE', label: 'panne' },
            { from: 'EN_ROUTE', to: 'ARRIVE', label: 'arriver' },
            { from: 'EN_PANNE', to: 'STATIONNE', label: 'reparer' },
            { from: 'ARRIVE', to: 'EN_ROUTE', label: 'demarrer' },
        ]
    }
};

const getFlowData = (fsmKey, currentState) => {
    const def = FSM_DEFS[fsmKey];
    const nodes = def.states.map((s, i) => {
        const isActive = s === currentState;
        return {
            id: s,
            data: { label: s.replace('_', ' ') },
            position: { x: i * 180, y: i % 2 === 0 ? 50 : 150 },
            style: {
                background: isActive ? STATE_COLORS[s] : '#11141d',
                color: isActive ? '#fff' : '#4b5563',
                border: `2px solid ${isActive ? '#fff' : STATE_COLORS[s]}`,
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '10px',
                width: 130,
                boxShadow: isActive ? `0 0 15px ${STATE_COLORS[s]}80` : 'none',
            }
        };
    });

    const edges = def.transitions.map((t, i) => {
        const isSourceActive = t.from === currentState;
        return {
            id: `e-${fsmKey}-${i}`,
            source: t.from,
            target: t.to,
            label: t.label,
            animated: isSourceActive,
            style: { stroke: isSourceActive ? '#3b82f6' : '#2d3748', strokeWidth: isSourceActive ? 3 : 1 },
            labelStyle: { fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' },
            markerEnd: { type: MarkerType.ArrowClosed, color: isSourceActive ? '#3b82f6' : '#2d3748' },
        };
    });

    return { nodes, edges };
};

export default function Automates({ apiBase }) {
    const [selectedFsm, setSelectedFsm] = useState('capteur');
    const [entities, setEntities] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const { socket } = useSocket();

    const fetchEntities = useCallback(async (refreshSelected = false) => {
        try {
            const endpoint = selectedFsm === 'capteur' ? 'capteurs' : (selectedFsm === 'intervention' ? 'interventions' : 'vehicules');
            const res = await axios.get(`${apiBase}/${endpoint}`);
            const list = res.data[endpoint] || [];
            setEntities(list);
            
            if (refreshSelected || !selectedEntity) {
                if (list.length > 0) setSelectedEntity(list[0]);
                else setSelectedEntity(null);
            } else {
                // Mettre à jour l'entité sélectionnée avec ses nouvelles données
                const updated = list.find(e => e.id === selectedEntity.id);
                if (updated) setSelectedEntity(updated);
            }
        } catch (err) { console.error(err); }
    }, [apiBase, selectedFsm, selectedEntity]);

    useEffect(() => {
        fetchEntities(true);
    }, [selectedFsm]); // Seul changement de type d'automate reset la sélection

    useEffect(() => {
        const timer = setInterval(() => fetchEntities(false), 60000);
        return () => clearInterval(timer);
    }, [fetchEntities]);

    useEffect(() => {
        if (socket) {
            const handleStatusChange = (data) => {
                if (data.entity === selectedFsm) {
                    setEntities(prev => prev.map(e => (
                        e.id === data.id ? { ...e, statut: data.new_status } : e
                    )));
                    setSelectedEntity(prev => (
                        prev?.id === data.id ? { ...prev, statut: data.new_status } : prev
                    ));
                    fetchEntities(false); // Rafraîchir sans reset la sélection
                }
            };
            socket.on('status_change', handleStatusChange);
            return () => socket.off('status_change', handleStatusChange);
        }
    }, [socket, selectedFsm, fetchEntities]);

    useEffect(() => {
        if (selectedEntity) {
            const { nodes: n, edges: e } = getFlowData(selectedFsm, selectedEntity.statut);
            setNodes(n);
            setEdges(e);
        } else {
            const { nodes: n, edges: e } = getFlowData(selectedFsm, null);
            setNodes(n);
            setEdges(e);
        }
    }, [selectedEntity, selectedFsm, setNodes, setEdges]);

    const handleTransition = async (trigger, nextState) => {
        if (!selectedEntity) return;
        setLoading(true);
        try {
            const endpoint = selectedFsm === 'capteur' ? 'capteurs' : (selectedFsm === 'vehicule' ? 'vehicules' : 'interventions');
            const res = await axios.post(`${apiBase}/${endpoint}/${selectedEntity.id}/transition`, {
                event: trigger
            });
            
            if (res.data.success) {
                setSelectedEntity(prev => prev ? { ...prev, statut: res.data.new_status } : prev);
                setEntities(prev => prev.map(e => (
                    e.id === selectedEntity.id ? { ...e, statut: res.data.new_status } : e
                )));
                // Le rafraîchissement se fera via le socket 'status_change'
                setValidation({ valide: true, justification: `Transition vers ${nextState} approuvée par le système.` });
            } else {
                setValidation({ valide: false, justification: res.data.error || "Transition refusée." });
            }
        } catch (err) { 
            console.error(err); 
            setValidation({ valide: false, justification: err.response?.data?.error || "Erreur lors de la transition." });
        }
        finally { setLoading(false); }
    };

    const availableTransitions = FSM_DEFS[selectedFsm].transitions.filter(t => t.from === selectedEntity?.statut);

    return (
        <div className="space-y-8 animate-fade-in flex flex-col h-full">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        Logique <span className="text-gradient">Automate</span>
                    </h2>
                    <p className="text-text-muted font-medium">Validation formelle des transitions d'états • Neo-Sousse Core</p>
                </div>
                <div className="flex gap-2 p-1.5 neo-glass rounded-2xl border border-white/5">
                    {['capteur', 'intervention', 'vehicule'].map(key => (
                        <button key={key} onClick={() => setSelectedFsm(key)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedFsm === key ? 'bg-turquoise text-black shadow-lg shadow-turquoise/20' : 'text-text-dim hover:text-white'}`}>
                            {key}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-[650px]">
                <div className="neo-card p-6 flex flex-col bg-black/40">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Réseau de Flotte</h4>
                        <button onClick={fetchEntities} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-turquoise"><RefreshCcw className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {entities.map(e => (
                            <button key={e.id} onClick={() => setSelectedEntity(e)}
                                className={`w-full p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all group ${selectedEntity?.id === e.id ? 'bg-turquoise/10 border-turquoise/40' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-black uppercase tracking-tight ${selectedEntity?.id === e.id ? 'text-turquoise' : 'text-white'}`}>ID #{e.id}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-turquoise shadow-[0_0_5px_rgba(64,224,208,0.5)]" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-60">{e.statut}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 neo-card relative overflow-hidden flex flex-col bg-black/40">
                    <div className="absolute top-6 left-6 z-10 p-3 neo-glass rounded-xl border border-white/10 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-turquoise animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Simulation Temps-Réel</span>
                    </div>

                    <div className="flex-1">
                        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView nodesDraggable={false} zoomOnScroll={false} panOnScroll={true}>
                            <Background color="rgba(255,255,255,0.03)" gap={24} />
                            <Controls className="!bg-bg-deep !border-white/10 !rounded-xl !shadow-2xl" />
                        </ReactFlow>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-gradient-to-t from-bg-deep to-transparent">
                        <div className="flex justify-between items-center">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Actions de Transition Sécurisées</p>
                                <div className="flex gap-3">
                                    {availableTransitions.length > 0 ? availableTransitions.map((t, idx) => (
                                        <button key={idx} onClick={() => handleTransition(t.label, t.to)} disabled={loading}
                                            className="btn-primary flex items-center gap-3 px-6 py-3 shadow-turquoise/20">
                                            <Play className="w-4 h-4" />
                                            <span className="font-black uppercase tracking-widest text-[10px]">{t.label}</span>
                                        </button>
                                    )) : <span className="text-xs text-text-muted font-bold italic opacity-40 uppercase tracking-widest">Aucune transition formelle autorisée</span>}
                                </div>
                            </div>
                            {loading && (
                                <div className="flex items-center gap-3 text-turquoise text-[10px] font-black animate-pulse uppercase tracking-[0.2em]">
                                    <RefreshCcw className="w-4 h-4 animate-spin" /> Audit IA en cours...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="neo-card p-8 bg-gradient-to-br from-turquoise/5 to-transparent">
                        <h4 className="text-[10px] font-black text-turquoise uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <GitBranch className="w-4 h-4" /> Analyse d'État
                        </h4>
                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                            <p className="text-[10px] text-text-dim uppercase font-black tracking-widest mb-3">Contexte Actuel</p>
                            <p className="text-sm text-white/80 leading-relaxed font-bold">
                                {selectedEntity ? (
                                    <>L'entité #{selectedEntity.id} est verrouillée sur l'état <span className="text-turquoise">"{selectedEntity.statut}"</span>. Ce cycle autorise {availableTransitions.length} mutations logiques.</>
                                ) : <>Sélectionnez une entité pour auditer sa logique.</>}
                            </p>
                        </div>
                    </div>

                    <div className="neo-card p-8 flex-1 border-dashed border-white/10 bg-white/[0.01]">
                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <Info className="w-4 h-4 text-turquoise" /> Rapport d'Audit IA
                        </h4>
                        {validation ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-2xl border ${validation.valide ? 'bg-turquoise/5 border-turquoise/30' : 'bg-rose-500/5 border-rose-500/30'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {validation.valide ? <CheckCircle2 className="w-5 h-5 text-turquoise" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${validation.valide ? 'text-turquoise' : 'text-rose-400'}`}>
                                        {validation.valide ? 'Approbation Formelle' : 'Violation Détectée'}
                                    </span>
                                </div>
                                <p className="text-xs text-white/70 italic leading-relaxed font-medium">"{validation.justification}"</p>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                                <GitBranch className="w-12 h-12 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Audit Prêt</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
