import React, { useState, useEffect } from 'react';
import { getDemoMode, setDemoMode } from '../api/api';
import toast from 'react-hot-toast';

const Navbar = () => {
  const [time, setTime] = useState(new Date());
  const [demoToggle, setDemoToggle] = useState(getDemoMode());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDemoToggle = () => {
    const newVal = !demoToggle;
    setDemoMode(newVal);
    setDemoToggle(newVal);
    if (newVal) {
      toast.success("Demo Mode Activated: Using mock data", { icon: '🧪' });
    } else {
      toast.error("Demo Mode Deactivated: Using live backend", { icon: '🔌' });
    }
  };

  return (
    <nav className="h-20 w-full glass-panel border-l-0 border-t-0 border-r-0 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
      <div className="flex items-center">
        <h2 className="text-xl font-rajdhani font-semibold text-slate-200 tracking-wide">
          <span className="text-[#00d4ff]">CMD</span> // CONTROL_CENTER
        </h2>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.05)] px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)]">
          <label className="text-sm text-slate-300 font-medium cursor-pointer flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={demoToggle}
              onChange={handleDemoToggle}
              className="accent-[#00d4ff] w-4 h-4"
            />
            Demo Mode
          </label>
        </div>

        <div className="font-mono text-[#00ff88] text-lg bg-[rgba(0,255,136,0.1)] px-4 py-2 rounded-lg border border-[rgba(0,255,136,0.2)] shadow-[0_0_10px_rgba(0,255,136,0.1)]">
          {time.toLocaleTimeString()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
