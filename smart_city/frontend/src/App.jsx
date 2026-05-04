import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Lazy loading for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Compiler = React.lazy(() => import('./pages/Compiler'));
const Automata = React.lazy(() => import('./pages/Automata'));
const Reports = React.lazy(() => import('./pages/Reports'));
const DataExplorer = React.lazy(() => import('./pages/DataExplorer'));
const Vehicles = React.lazy(() => import('./pages/Vehicles'));
const AirQuality = React.lazy(() => import('./pages/AirQuality'));
const LabCompilation = React.lazy(() => import('./pages/LabCompilation'));

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#0a0f1e] text-slate-200 overflow-hidden selection:bg-[#00d4ff]/30 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 relative z-0">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin"></div>
              </div>
            }>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/compiler" element={<Compiler />} />
                  <Route path="/automata" element={<Automata />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/data" element={<DataExplorer />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/air-quality" element={<AirQuality />} />
                  <Route path="/lab" element={<LabCompilation />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </main>
        </div>
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(10, 15, 30, 0.9)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(0, 212, 255, 0.2)',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#0a0f1e' } },
          error: { iconTheme: { primary: '#ff4444', secondary: '#0a0f1e' } },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
