'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getScanResult } from '@/api/scanner';
import { submitForAnalyzer } from '@/api/analyzer';
import { 
  Shield, 
  Search, 
  Filter, 
  Loader, 
  Check, 
  Globe, 
  Zap, 
  Mail, 
  Activity, 
  Bug, 
  Target, 
  ShieldCheck,
  Cpu,
  CheckCircle2
} from 'lucide-react';

interface LoadingScanProps {
  domain: string;
  scanId: string;
  onComplete: (scanId: string) => void;
}

type ScanStageType = 
  | 'dns' 
  | 'http' 
  | 'ssl' 
  | 'headers' 
  | 'discovery' 
  | 'email' 
  | 'intel' 
  | 'ports' 
  | 'ai';

export const LoadingScan: React.FC<LoadingScanProps> = ({ domain, scanId, onComplete }) => {
  const [currentStage, setCurrentStage] = useState<ScanStageType>('dns');
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [realScanDone, setRealScanDone] = useState(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  const stages = [
    { id: 'dns', label: 'DNS Reconnaissance', icon: <Globe size={18} /> },
    { id: 'http', label: 'HTTP & Technology', icon: <Cpu size={18} /> },
    { id: 'ssl', label: 'SSL/TLS Analysis', icon: <Shield size={18} /> },
    { id: 'headers', label: 'Security Headers', icon: <ShieldCheck size={18} /> },
    { id: 'discovery', label: 'Subdomain Discovery', icon: <Search size={18} /> },
    { id: 'email', label: 'Email Security', icon: <Mail size={18} /> },
    { id: 'intel', label: 'Reputation & Intel', icon: <Activity size={18} /> },
    { id: 'ports', label: 'Port Scanning', icon: <Target size={18} /> },
    { id: 'ai', label: 'AI Risk Scoring', icon: <Zap size={18} /> },
  ];

  useEffect(() => {
    let isMounted = true;
    const pollScan = async () => {
      try {
        const result = await getScanResult(scanId);
        // The scan is done when the webhook has overwritten the initial
        // {"status":"pending","progress":0} payload with the real scan data.
        // After the Go worker finishes, results will contain a "data" key.
        if (result && result.status !== 'pending' && result.data) {
          if (isMounted) setRealScanDone(true);
        } else {
          if (isMounted) setTimeout(pollScan, 3000);
        }
      } catch (e) {
        if (isMounted) setTimeout(pollScan, 3000);
      }
    };
    pollScan();
    return () => { isMounted = false; };
  }, [scanId]);

  useEffect(() => {
    let currentIdx = 0;
    const scrollInterval = setInterval(() => {
      if (currentIdx < stages.length - 1) {
        currentIdx++;
        setCurrentStage(stages[currentIdx].id as ScanStageType);
        setProgress(Math.floor((currentIdx / stages.length) * 100));
      } else {
        clearInterval(scrollInterval);
        setProgress(99); // Wait for real scan if taking longer
      }
    }, 1200);

    return () => clearInterval(scrollInterval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (progress === 99 && realScanDone && !isDone && !analyzerError) {
      submitForAnalyzer(scanId)
        .then(() => {
          setProgress(100);
          setIsDone(true);
          setTimeout(() => onComplete(scanId), 1500);
        })
        .catch(err => {
          setAnalyzerError(err.message || 'Analysis failed');
        });
    }
  }, [progress, realScanDone, isDone, scanId, onComplete, analyzerError]);

  const activeIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full space-y-12 py-8">
      {/* 3-Column Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stages.map((s, index) => {
          const isActive = index === activeIndex && !isDone;
          const isCompleted = index < activeIndex || isDone;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-4 rounded-2xl border transition-all duration-500 overflow-hidden ${
                isActive ? 'bg-blue-50 border-blue-200 shadow-sm' :
                isCompleted ? 'bg-white border-slate-100/50' :
                'bg-slate-50 border-transparent opacity-40'
              }`}
            >
              <div className="flex items-center space-x-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  isActive ? 'bg-white text-blue-600 shadow-sm' :
                  isCompleted ? 'bg-green-50 text-green-600' :
                  'bg-white text-slate-400'
                }`}>
                  {isCompleted ? <Check size={18} /> : s.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-[11px] font-black uppercase tracking-tight truncate ${
                    isActive ? 'text-blue-900' : 
                    isCompleted ? 'text-slate-600' : 
                    'text-slate-400'
                  }`}>
                    {s.label}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {isActive && <Loader className="w-2.5 h-2.5 text-blue-500 animate-spin" />}
                    <span className={`text-[9px] font-bold uppercase tracking-tight ${
                      isActive ? 'text-blue-600/60' :
                      isCompleted ? 'text-green-600/60' :
                      'text-slate-400/60'
                    }`}>
                      {isActive ? 'Active' : isCompleted ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Progress Bar */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.5, ease: "linear" }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Global Progress Bar */}
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Aggregate Synthesis</span>
            <p className="text-slate-900 text-xs font-bold uppercase">
              {analyzerError ? 'Error: ' + analyzerError : isDone ? 'Sequence Completed' : progress === 99 ? 'Awaiting Backend Processing' : `Sector ${activeIndex + 1}/${stages.length} Active`}
            </p>
          </div>
          <span className="text-2xl font-black text-blue-600 tracking-tighter">{progress}%</span>
        </div>
        
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-600 rounded-full shadow-sm"
          />
        </div>

        {isDone && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center space-x-2 text-green-600 font-bold text-[10px] bg-green-50 px-4 py-2 rounded-full border border-green-100 uppercase tracking-widest">
              <CheckCircle2 size={12} />
              <span>Assessment Complete</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
