/**
 * RAPPORTSIA.JSX — Page Rapports IA
 * Rapport journalier, recommandations, export PDF/Excel, impression
 */
import { useState, useEffect, useRef } from 'react'
import { FileText, Lightbulb, Download, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react'
import axios from 'axios'

const PRIORITY_STYLES = {
    haute: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
    moyenne: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
    basse: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
}

export default function RapportsIA({ api }) {
    const [rapport, setRapport] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [loadingR, setLoadingR] = useState(false)
    const [loadingS, setLoadingS] = useState(false)
    const rapportRef = useRef(null)

    const fetchRapport = async () => {
        setLoadingR(true)
        try { const r = await axios.get(`${api}/rapport`); setRapport(r.data.rapport || 'Aucun rapport') }
        catch { setRapport('❌ Erreur de connexion') }
        finally { setLoadingR(false) }
    }

    const fetchSuggestions = async () => {
        setLoadingS(true)
        try { const r = await axios.get(`${api}/suggestions`); setSuggestions(r.data.suggestions || []) }
        catch { setSuggestions([{ priorite: 'haute', message: '❌ Erreur de connexion', type: 'error' }]) }
        finally { setLoadingS(false) }
    }

    useEffect(() => { fetchRapport(); fetchSuggestions() }, [api])

    // ── Télécharger en PDF ──
    const downloadPDF = async () => {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('Smart City Neo-Sousse 2030', 20, 20)
        doc.setFontSize(12)
        doc.text('Rapport Journalier', 20, 30)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)

        // Découper le rapport en lignes
        const lines = doc.splitTextToSize(rapport, 170)
        let y = 45
        for (const line of lines) {
            if (y > 280) { doc.addPage(); y = 20 }
            doc.text(line, 20, y)
            y += 6
        }

        // Ajouter suggestions
        if (suggestions.length > 0) {
            y += 10
            if (y > 260) { doc.addPage(); y = 20 }
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(12)
            doc.text('Recommandations', 20, y)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            y += 10

            for (const s of suggestions) {
                const sLines = doc.splitTextToSize(`[${s.priorite?.toUpperCase()}] ${s.message}`, 170)
                for (const sl of sLines) {
                    if (y > 280) { doc.addPage(); y = 20 }
                    doc.text(sl, 20, y)
                    y += 6
                }
                y += 3
            }
        }

        doc.save(`rapport_neo_sousse_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    // ── Télécharger en CSV/Excel ──
    const downloadExcel = () => {
        let csv = 'Priorité,Type,Message\n'
        for (const s of suggestions) {
            csv += `"${s.priorite}","${s.type || ''}","${s.message?.replace(/"/g, '""')}"\n`
        }
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `suggestions_neo_sousse_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // ── Imprimer ──
    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
      <html><head><title>Rapport Neo-Sousse 2030</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { color: #3b82f6; font-size: 22px; }
        h2 { color: #475569; font-size: 16px; margin-top: 24px; }
        pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; }
        .suggestion { padding: 8px 12px; margin: 6px 0; border-left: 3px solid; border-radius: 4px; }
        .haute { border-color: #ef4444; background: #fef2f2; }
        .moyenne { border-color: #f59e0b; background: #fffbeb; }
        .basse { border-color: #22c55e; background: #f0fdf4; }
      </style></head><body>
      <h1>🏙️ Smart City Neo-Sousse 2030</h1>
      <h2>Rapport Journalier</h2>
      <pre>${rapport}</pre>
      <h2>Recommandations</h2>
      ${suggestions.map(s => `<div class="suggestion ${s.priorite}">[${s.priorite?.toUpperCase()}] ${s.message}</div>`).join('')}
      <p style="margin-top:24px; color:#94a3b8; font-size:12px;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
      </body></html>
    `)
        printWindow.document.close()
        printWindow.print()
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold gradient-text">Rapports IA</h2>
                    <p className="text-sm text-slate-500 mt-1">Rapports et recommandations générés par Gemini</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={downloadPDF}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all">
                        <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={downloadExcel}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                        <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                </div>
            </div>

            {/* Rapport Journalier */}
            <div className="glass-card p-6" ref={rapportRef}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-cyan-400" /> Rapport Journalier
                    </h3>
                    <button onClick={fetchRapport} disabled={loadingR}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingR ? 'animate-spin' : ''}`} /> Régénérer
                    </button>
                </div>
                {loadingR ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 loading-shimmer rounded" style={{ width: `${85 - i * 12}%` }} />)}</div>
                ) : (
                    <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">{rapport}</pre>
                )}
            </div>

            {/* Recommandations stratégiques */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" /> Recommandations Stratégiques
                    </h3>
                    <button onClick={fetchSuggestions} disabled={loadingS}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingS ? 'animate-spin' : ''}`} /> Actualiser
                    </button>
                </div>
                {loadingS ? (
                    [...Array(3)].map((_, i) => <div key={i} className="glass-card h-16 loading-shimmer rounded-xl mb-3" />)
                ) : (
                    <div className="space-y-3">
                        {suggestions.map((s, i) => {
                            const style = PRIORITY_STYLES[s.priorite] || PRIORITY_STYLES.basse
                            return (
                                <div key={i} className={`p-4 rounded-xl ${style.bg} border ${style.border} animate-slide-up`}
                                    style={{ animationDelay: `${i * 80}ms` }}>
                                    <div className="flex items-start gap-3">
                                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 ${style.badge}`}>
                                            {s.priorite}
                                        </span>
                                        <p className={`text-sm leading-relaxed ${style.text}`}>{s.message}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
