/**
 * CARTESINTERACTIVES.JSX — Carte globale avec couches dynamiques
 * Filtres par zone, type, statut + couches : capteurs, interventions, qualité de l'air
 */
import { useState, useEffect } from 'react'
import { Map, Layers, Filter, RefreshCw, Cpu, Wrench, Wind } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'

const STATUS_COLORS = {
    ACTIF: '#22c55e', INACTIF: '#64748b', SIGNALE: '#f59e0b',
    EN_MAINTENANCE: '#f97316', HORS_SERVICE: '#ef4444',
    DEMANDE: '#94a3b8', TECH1_ASSIGNE: '#3b82f6', TECH2_VALIDE: '#8b5cf6',
    IA_VALIDE: '#06b6d4', TERMINE: '#22c55e',
}

export default function CartesInteractives({ api }) {
    const [capteurs, setCapteurs] = useState([])
    const [interventions, setInterventions] = useState([])
    const [zones, setZones] = useState([])
    const [loading, setLoading] = useState(true)

    // Filtres
    const [filterZone, setFilterZone] = useState('all')
    const [filterType, setFilterType] = useState('all')
    const [filterStatut, setFilterStatut] = useState('all')

    // Couches
    const [showCapteurs, setShowCapteurs] = useState(true)
    const [showInterventions, setShowInterventions] = useState(true)
    const [showAir, setShowAir] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [cRes, iRes, aRes] = await Promise.all([
                axios.get(`${api}/capteurs`),
                axios.get(`${api}/interventions`),
                axios.get(`${api}/qualite_air`),
            ])
            setCapteurs(cRes.data.capteurs || [])
            setInterventions(iRes.data.interventions || [])
            setZones(aRes.data.zones || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [api])

    // Extraction des valeurs uniques pour les filtres
    const allZones = [...new Set(capteurs.map(c => c.zone).filter(Boolean))]
    const allTypes = [...new Set(capteurs.map(c => c.type).filter(Boolean))]
    const allStatuts = [...new Set(capteurs.map(c => c.statut).filter(Boolean))]

    // Filtrage des capteurs
    const filteredCapteurs = capteurs.filter(c => {
        if (filterZone !== 'all' && c.zone !== filterZone) return false
        if (filterType !== 'all' && c.type !== filterType) return false
        if (filterStatut !== 'all' && c.statut !== filterStatut) return false
        return true
    })

    // Filtrage des interventions par zone
    const filteredInterventions = interventions.filter(i => {
        if (filterZone !== 'all' && i.zone !== filterZone) return false
        return true
    })

    if (loading) return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold gradient-text">Cartes Interactives</h2>
            <div className="glass-card h-[500px] loading-shimmer rounded-2xl" />
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold gradient-text">Cartes Interactives</h2>
                    <p className="text-sm text-slate-500 mt-1">Vue globale de Neo-Sousse avec couches dynamiques</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                    <RefreshCw className="w-4 h-4" /> Actualiser
                </button>
            </div>

            {/* Filtres + Couches */}
            <div className="glass-card p-5">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Couches */}
                    <div className="flex items-center gap-1 mr-4">
                        <Layers className="w-4 h-4 text-blue-400 mr-1" />
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={showCapteurs} onChange={e => setShowCapteurs(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-emerald-500" />
                            <Cpu className="w-3 h-3 text-emerald-400" /> Capteurs
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer ml-3">
                            <input type="checkbox" checked={showInterventions} onChange={e => setShowInterventions(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-purple-500" />
                            <Wrench className="w-3 h-3 text-purple-400" /> Interventions
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer ml-3">
                            <input type="checkbox" checked={showAir} onChange={e => setShowAir(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-cyan-500" />
                            <Wind className="w-3 h-3 text-cyan-400" /> Qualité Air
                        </label>
                    </div>

                    <div className="h-6 w-px bg-slate-700" />

                    {/* Filtres */}
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select value={filterZone} onChange={e => setFilterZone(e.target.value)}
                        className="bg-[#0b0f1a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <option value="all">Toutes les zones</option>
                        {allZones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="bg-[#0b0f1a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <option value="all">Tous les types</option>
                        {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                        className="bg-[#0b0f1a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <option value="all">Tous les statuts</option>
                        {allStatuts.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                </div>
            </div>

            {/* Carte principale */}
            <div className="glass-card overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
                <MapContainer center={[35.8256, 10.6084]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />

                    {/* Couche Capteurs */}
                    {showCapteurs && filteredCapteurs.map(c => (
                        <CircleMarker key={`c-${c.id}`} center={[c.lat, c.lng]} radius={7}
                            fillColor={STATUS_COLORS[c.statut] || '#6366f1'} fillOpacity={0.85} stroke={true}
                            color={STATUS_COLORS[c.statut] || '#6366f1'} weight={1}>
                            <Popup>
                                <div className="text-xs min-w-[140px]">
                                    <p className="font-bold text-sm mb-1">🔌 Capteur #{c.id}</p>
                                    <p><b>Type:</b> {c.type}</p>
                                    <p><b>Zone:</b> {c.zone}</p>
                                    <p><b>Statut:</b> <span style={{ color: STATUS_COLORS[c.statut] }}>{c.statut?.replace(/_/g, ' ')}</span></p>
                                    <p><b>Installation:</b> {c.date_installation || '—'}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Couche Interventions */}
                    {showInterventions && filteredInterventions.map(itv => (
                        <CircleMarker key={`i-${itv.id}`} center={[itv.lat, itv.lng]} radius={6}
                            fillColor="#8b5cf6" fillOpacity={0.7} stroke={true} color="#8b5cf6" weight={1.5} dashArray="4">
                            <Popup>
                                <div className="text-xs min-w-[140px]">
                                    <p className="font-bold text-sm mb-1">🔧 Intervention #{itv.id}</p>
                                    <p><b>Capteur:</b> #{itv.capteur_id}</p>
                                    <p><b>Zone:</b> {itv.zone || '—'}</p>
                                    <p><b>Statut:</b> {itv.statut}</p>
                                    <p><b>Date:</b> {itv.date || '—'}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Couche Qualité de l'Air */}
                    {showAir && zones.map((z, i) => (
                        <CircleMarker key={`a-${i}`} center={[z.lat, z.lng]}
                            radius={z.moyenne > 60 ? 22 : 15}
                            fillColor={z.couleur} fillOpacity={0.3}
                            color={z.couleur} weight={2}>
                            <Popup>
                                <div className="text-xs min-w-[140px]">
                                    <p className="font-bold text-sm mb-1">🌫️ {z.zone}</p>
                                    <p><b>Moyenne:</b> {z.moyenne}</p>
                                    <p><b>Niveau:</b> <span style={{ color: z.couleur }}>{z.niveau}</span></p>
                                    <p><b>Mesures:</b> {z.nb_mesures}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>

            {/* Légende */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <span className="text-slate-500 font-medium">Légende :</span>
                {showCapteurs && (
                    <>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" />Actif</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Signalé</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500" />Maintenance</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Hors Service</span>
                    </>
                )}
                {showInterventions && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500" />Intervention</span>}
                {showAir && (
                    <>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 opacity-40" />Air Bon</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 opacity-40" />Modéré</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 opacity-40" />Critique</span>
                    </>
                )}
            </div>
        </div>
    )
}
