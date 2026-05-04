import React, { useEffect, useState } from 'react';
import GlassCard from './GlassCard';
import { motion } from 'framer-motion';

const KPICard = ({ title, value, icon: Icon, colorClass, delay = 0 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const duration = 1000;
    const incrementTime = 20;
    const step = Math.max(1, Math.ceil(end / (duration / incrementTime)));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  // Extract color for glow (e.g. from text-[#00d4ff] to #00d4ff)
  const glowColor = colorClass.includes('#') ? colorClass.match(/#\w+/)[0] : 'rgba(99,102,241,0.5)';

  return (
    <GlassCard delay={delay} className="relative overflow-hidden group border-white/5 hover:border-white/10">
      {/* Background Glow */}
      <div 
        className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        style={{ backgroundColor: glowColor }}
      ></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{title}</p>
          <motion.div 
            key={count}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-baseline gap-1"
          >
            <span className={`text-4xl font-rajdhani font-bold tracking-tight text-white`}>
              {count.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${colorClass}`}>●</span>
          </motion.div>
        </div>
        
        <div className={`p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${colorClass}`}>
          <Icon size={26} strokeWidth={2.5} />
        </div>
      </div>
    </GlassCard>
  );
};

export default KPICard;
