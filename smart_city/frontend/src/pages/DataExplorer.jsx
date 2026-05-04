import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dataApi } from '../api/api';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Search, Download, Database, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

const DataExplorer = () => {
  const [activeTab, setActiveTab] = useState('capteurs');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'capteurs', label: 'Capteurs', icon: '📡' },
    { id: 'interventions', label: 'Interventions', icon: '🔧' },
    { id: 'vehicules', label: 'Véhicules', icon: '🚗' },
    { id: 'citoyens', label: 'Citoyens', icon: '👥' },
    { id: 'mesures', label: 'Mesures (TSDB)', icon: '📈' }
  ];

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    setSearchTerm('');
    try {
      let res;
      switch(tab) {
        case 'capteurs': res = await dataApi.getSensors(); break;
        case 'interventions': res = await dataApi.getInterventions(); break;
        case 'vehicules': res = await dataApi.getVehicles(); break;
        case 'citoyens': res = await dataApi.getCitizens(); break;
        case 'mesures': res = await dataApi.getTimeseries(); break;
        default: res = { data: [] };
      }
      setData(res.data);
    } catch (err) {
      toast.error(`Failed to load ${tab}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const exportCSV = () => {
    if (!filteredData.length) return;
    const keys = Object.keys(filteredData[0]).join(',');
    const rows = filteredData.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
    const csv = `${keys}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_data.csv`;
    a.click();
    toast.success(`Exported ${activeTab} data`);
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }} className="h-full flex flex-col space-y-6">
      
      <header className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-white mb-2">Urban Data Explorer</h1>
          <p className="text-slate-400">Direct access to PostgreSQL and TimescaleDB relational/time-series data.</p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-[#0a0f1e]/80 flex flex-wrap justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Filter current view..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#050810] border border-slate-700 rounded-lg text-slate-200 focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              {filteredData.length} records
            </span>
            <button 
              onClick={exportCSV} 
              className="flex items-center gap-2 text-sm bg-[rgba(0,255,136,0.1)] hover:bg-[rgba(0,255,136,0.2)] text-[#00ff88] px-4 py-2.5 rounded-lg border border-[rgba(0,255,136,0.3)] transition-colors font-medium"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#050810] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <div className="w-10 h-10 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin"></div>
              <p>Fetching from Database...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <Database size={48} className="opacity-20" />
              <p>No records found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  {Object.keys(filteredData[0]).map(key => (
                    <th key={key} className="px-6 py-4 font-bold border-b border-slate-700">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/80 transition-colors">
                    {Object.entries(row).map(([key, val], j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        {key === 'etat' ? (
                          <StatusBadge status={String(val)} />
                        ) : (
                          <span className={typeof val === 'number' ? 'text-[#00d4ff] font-mono' : ''}>
                            {String(val)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default DataExplorer;
