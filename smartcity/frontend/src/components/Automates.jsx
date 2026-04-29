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
            { from: 'EN_PANNE', to: 'ARRIVE', label: 'arriver' },
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

    // Fetch entities based on selected FSM
    const fetchEntities = useCallback(async () => {
        try {
            const endpoint = selectedFsm === 'capteur' ? 'capteurs' : (selectedFsm === 'intervention' ? 'interventions' : 'vehicules');
            const res = await axios.get(`${apiBase}/${endpoint}`);
            const list = res.data[endpoint] || [];
            setEntities(list);
            if (list.length > 0) {
                setSelectedEntity(list[0]);
            } else {
                setSelectedEntity(null);
            }
        } catch (err) {
            console.error(err);
        }
    }, [apiBase, selectedFsm]);

    useEffect(() => {
        fetchEntities();

        if (socket) {
            socket.on('status_change', (data) => {
                if (data.type === selectedFsm) {
                    console.log("🔗 Real-time FSM update", data);
                    fetchEntities();
                }
            });
        }
        return () => {
            if (socket) socket.off('status_change');
        };
    }, [fetchEntities, socket, selectedFsm]);

    // Update Flow when entity state changes
    useEffect(() => {
        if (selectedEntity) {
            const { nodes: n, edges: e } = getFlowData(selectedFsm, selectedEntity.statut);
            setNodes(n);
            setEdges(e);
            setValidation(null);
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
            // 1. Validation IA
            const valRes = await axios.post(`${apiBase}/valider-transition`, {
                entite: selectedFsm,
                etat_actuel: selectedEntity.statut,
                evenement: trigger,
                etat_suivant: nextState
            });
            setValidation(valRes.data);

            if (valRes.data.valide) {
                // 2. Execution réelle
                await axios.post(`${apiBase}/automates/transition`, {
                    entite: selectedFsm,
                    id: selectedEntity.id,
                    trigger: nextState // Simplifié dans mon backend v3.0
                });
                // 3. Refresh
                setTimeout(fetchEntities, 1000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const availableTransitions = FSM_DEFS[selectedFsm].transitions.filter(t => t.from === selectedEntity?.statut);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <GitBranch className="text-indigo-500 w-8 h-8" />
                        Automates Finis & Transitions IA
                    </h2>
                    <p className="text-gray-500 mt-2">Pilotage dynamique des états opérationnels avec validation IA</p>
                </div>
                <div className="flex gap-2 p-1 bg-gray-800/40 rounded-xl border border-gray-800">
                    {['capteur', 'intervention', 'vehicule'].map(key => (
                        <button
                            key={key}
                            onClick={() => setSelectedFsm(key)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedFsm === key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px]">
                {/* Entity Selector Sidebar */}
                <div className="glass-card p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entités de la Flotte</h4>
                        <button onClick={fetchEntities} className="text-indigo-400 hover:text-indigo-300"><RefreshCcw className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-2">
                        {entities.map(e => (
                            <button
                                key={e.id}
                                onClick={() => setSelectedEntity(e)}
                                className={`w-full p-3 rounded-lg border text-left flex justify-between items-center transition-all ${selectedEntity?.id === e.id ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'border-gray-800/50 hover:border-gray-700 text-gray-500'}`}
                            >
                                <span className="text-xs font-bold">#{e.id} {selectedFsm}</span>
                                <span className="text-[8px] opacity-70 px-2 py-0.5 rounded-full bg-black/20">{e.statut}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Diagram Area */}
                <div className="lg:col-span-2 glass-card relative flex flex-col">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-gray-800">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visualisation Interactive</span>
                    </div>

                    <div className="flex-1 min-h-[400px]">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            fitView
                            nodesDraggable={false}
                            zoomOnScroll={false}
                            panOnScroll={true}
                        >
                            <Background color="#1f2937" gap={20} />
                            <Controls className="bg-gray-800 border-gray-700" />
                        </ReactFlow>
                    </div>

                    <div className="p-6 border-t border-gray-800 bg-black/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Actions disponibles</p>
                                <div className="flex gap-3">
                                    {availableTransitions.length > 0 ? availableTransitions.map((t, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleTransition(t.label, t.to)}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Play className="w-3 h-3" />
                                            Déclencher "{t.label}"
                                        </button>
                                    )) : <span className="text-xs text-gray-600 italic">Aucune transition possible depuis cet état.</span>}
                                </div>
                            </div>
                            {loading && <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold animate-pulse"><RefreshCcw className="w-3 h-3 animate-spin" /> IA Processing...</div>}
                        </div>
                    </div>
                </div>

                {/* IA Validation Sidebar */}
                <div className="glass-card p-6 flex flex-col gap-6">
                    <div>
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                            <GitBranch className="w-3 h-3" /> État Courant : {selectedEntity?.statut || 'N/A'}
                        </h4>
                        <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-800/60">
                            <p className="text-[10px] text-gray-500 uppercase font-black">Description du Statut</p>
                            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                                L'entité est actuellement en mode <b>{selectedEntity?.statut}</b>.
                                Ce stade permet {availableTransitions.length} actions opérationnelles sécurisées.
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 border-t border-gray-800 pt-6">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Validation IA
                        </h4>
                        {validation ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-4 rounded-xl border ${validation.valide ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {validation.valide ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                                    <span className={`text-[10px] font-black uppercase ${validation.valide ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {validation.valide ? 'Transition Approuvée' : 'Transition Rejetée'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-300 italic">"{validation.justification}"</p>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-30">
                                <GitBranch className="w-8 h-8 mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">En attente de transaction</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
