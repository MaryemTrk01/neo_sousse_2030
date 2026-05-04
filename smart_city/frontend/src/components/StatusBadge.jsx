import React from 'react';

const StatusBadge = ({ status }) => {
  let colorClass = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  let dotClass = 'bg-slate-400';

  const s = status?.toUpperCase() || 'UNKNOWN';

  if (['ACTIF', 'ARRIVÉ', 'TERMINÉ'].includes(s)) {
    colorClass = 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]';
    dotClass = 'bg-[#00ff88]';
  } else if (['EN_ROUTE', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE', 'IA_VALIDE'].includes(s)) {
    colorClass = 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 shadow-[0_0_10px_rgba(0,212,255,0.1)]';
    dotClass = 'bg-[#00d4ff]';
  } else if (['SIGNALÉ', 'EN_MAINTENANCE', 'DEMANDE'].includes(s)) {
    colorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]';
    dotClass = 'bg-yellow-400';
  } else if (['HORS_SERVICE', 'EN_PANNE'].includes(s)) {
    colorClass = 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/30 shadow-[0_0_10px_rgba(255,68,68,0.1)]';
    dotClass = 'bg-[#ff4444]';
  }

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`}></span>
      {s}
    </span>
  );
};

export default StatusBadge;
