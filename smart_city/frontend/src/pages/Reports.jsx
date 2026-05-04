import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { aiApi } from '../api/api';
import GlassCard from '../components/GlassCard';
import { FileText, Copy, Download, Sparkles, Filter, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Reports = () => {
  const [reportType, setReportType] = useState('City Overview Report');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    { date: '2026-04-28 14:30', type: 'Air Quality Report', preview: 'Les niveaux de CO2 ont diminué de 15%...' }
  ]);

  const reportTypes = [
    { name: 'City Overview Report', icon: '🏙️', query: "Donne un rapport global sur l'état de la ville, les capteurs et les interventions en cours." },
    { name: 'Air Quality Report', icon: '🌬️', query: "Analyse les mesures de qualité de l'air des capteurs de type 'Air'." },
    { name: 'Sensor Health Report', icon: '🔧', query: "Identifie les capteurs HORS_SERVICE ou SIGNALÉ et recommande des actions." },
    { name: 'Vehicle Fleet Report', icon: '🚗', query: "Quel est l'état de la flotte des véhicules autonomes et leur niveau de batterie (niveau_batterie) ?" }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const selectedQuery = reportTypes.find(r => r.name === reportType)?.query || "";
      const res = await aiApi.generateReport(selectedQuery);
      setReport(res.data.report);
      setHistory([{ date: new Date().toLocaleString([], {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}), type: reportType, preview: res.data.report.substring(0, 50) + '...' }, ...history]);
      toast.success("AI Analytics Report generated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      toast.success("Copied to clipboard", { icon: '📋' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    const toastId = toast.loading("Generating PDF...");
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(16, 163, 127);
      doc.text("Neo-Sousse 2030 - Smart City Report", 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Type: ${reportType}`, 20, 30);
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 35);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 40, 190, 40);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(report, 170);
      doc.text(splitText, 20, 50);
      
      doc.save(`Sousse-Report-${reportType.replace(/ /g, '-')}.pdf`);
      toast.success("PDF Downloaded", { id: toastId });
    } catch (err) {
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }} className="h-full flex flex-col space-y-6">
      
      <header className="flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-rajdhani font-bold text-white">AI Analytics Reports</h1>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#10a37f]/20 text-[#10a37f] border border-[#10a37f]/30">
              <Sparkles size={12} /> Powered by GPT-4o
            </span>
          </div>
          <p className="text-slate-400">Generate actionable insights from urban data arrays.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column - Controls & History */}
        <div className="space-y-6 flex flex-col">
          <GlassCard className="shrink-0 space-y-6 border-[#a855f7]/30">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Report Type</label>
              <div className="space-y-2">
                {reportTypes.map(rt => (
                  <button
                    key={rt.name}
                    onClick={() => setReportType(rt.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                      reportType === rt.name 
                        ? 'bg-[#a855f7]/10 border-[#a855f7]/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                        : 'bg-[#0a0f1e] border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xl">{rt.icon}</span>
                    <span className="font-medium text-sm">{rt.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Time Range</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0f1e] border border-slate-700/50 rounded-lg text-slate-300 text-sm cursor-not-allowed opacity-70">
                <Calendar size={16} className="text-slate-500" /> Last 7 Days (Auto)
              </div>
            </div>

            <button
              onClick={handleGenerate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#a855f7] to-[#d946ef] hover:opacity-90 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating...</>
              ) : (
                <><Sparkles size={18} /> Generate Insights</>
              )}
            </button>
          </GlassCard>

          <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">Report History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.map((h, i) => (
                <div key={i} className="p-3 bg-[#0a0f1e] rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-[#a855f7]">{h.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{h.date}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{h.preview}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Report Display */}
        <GlassCard className="lg:col-span-2 flex flex-col p-0 overflow-hidden relative">
          {report ? (
            <>
              <div className="p-4 border-b border-slate-700/50 bg-[#0a0f1e]/80 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#a855f7]/20 rounded-lg text-[#a855f7]"><FileText size={20} /></div>
                  <div>
                    <h3 className="font-semibold text-white">{reportType}</h3>
                    <p className="text-xs text-slate-500 font-mono">Generated: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors tooltip" title="Copy to clipboard">
                    <Copy size={18} />
                  </button>
                  <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors tooltip" title="Download PDF" onClick={handleDownloadPDF}>
                    <Download size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-[#050810]">
                <div className="prose prose-invert prose-p:leading-relaxed prose-headings:text-[#00d4ff] prose-a:text-[#00ff88] max-w-none font-medium text-slate-300">
                  {report.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-4">{line}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-center text-slate-500">
              <FileText size={64} className="mb-4 opacity-20" />
              <p className="font-medium text-lg">No report generated yet</p>
              <p className="text-sm">Select a report type and click generate</p>
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default Reports;
