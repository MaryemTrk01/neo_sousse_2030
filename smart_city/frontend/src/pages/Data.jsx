import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Data = () => {
  const [activeTab, setActiveTab] = useState('timeseries');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    try {
      let res;
      switch(tab) {
        case 'timeseries': res = await dataApi.getTimeseries(); break;
        case 'sensors': res = await dataApi.getSensors(); break;
        case 'interventions': res = await dataApi.getInterventions(); break;
        case 'citizens': res = await dataApi.getCitizens(); break;
        case 'vehicles': res = await dataApi.getVehicles(); break;
        default: res = { data: [] };
      }
      setData(res.data);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'timeseries', label: 'TimescaleDB (Mesures)' },
    { id: 'sensors', label: 'Capteurs' },
    { id: 'interventions', label: 'Interventions' },
    { id: 'citizens', label: 'Citoyens' },
    { id: 'vehicles', label: 'Véhicules' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold text-white mb-2">Data Explorer</h2>
      
      <div className="flex space-x-2 border-b border-slate-700 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg transition-colors font-medium text-sm ${
              activeTab === tab.id 
                ? 'bg-cardDark text-cyanAccent border-t border-l border-r border-slate-700' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-cardDark flex-1 rounded-xl rounded-tl-none border border-slate-700 overflow-hidden flex flex-col p-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        ) : (
          <>
            {activeTab === 'timeseries' ? (
              <div className="h-96 w-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-white">Average Sensor Measurements (Last 7 Days)</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="bucket" 
                        stroke="#cbd5e1" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString()}
                      />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Line type="monotone" dataKey="avg_valeur" stroke="#00F0FF" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0">
                    <tr>
                      {data.length > 0 && Object.keys(data[0]).map(key => (
                        <th key={key} className="px-6 py-3">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i} className="border-b border-slate-700 hover:bg-slate-800/50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr>
                        <td className="px-6 py-4 text-center" colSpan="100%">No data found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Data;
