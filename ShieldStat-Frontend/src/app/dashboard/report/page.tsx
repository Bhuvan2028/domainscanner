'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  Globe,
  Shield,
  Zap,
  Search,
  Activity,
  Lock,
  MessageSquare,
  Database,
  Users,
  Loader2
} from 'lucide-react';

import { submitForAnalyzer, type GeneratedScoreResponse, type VulnerabilityEntry } from '@/api/analyzer';

// ─── All 10 security factor definitions ──────────────────────────────────────
const ALL_FACTORS: { id: string; icon: React.ReactNode }[] = [
  { id: 'Network Security',     icon: <Globe size={14} /> },
  { id: 'Application Security', icon: <Shield size={14} /> },
  { id: 'DNS Health',           icon: <Zap size={14} /> },
  { id: 'TLS Security',         icon: <Lock size={14} /> },
  { id: 'Patching',             icon: <Activity size={14} /> },
  { id: 'IP Reputation',        icon: <Search size={14} /> },
  { id: 'Cubit Score',          icon: <ShieldCheck size={14} /> },
  { id: 'Hacker Chatter',       icon: <MessageSquare size={14} /> },
  { id: 'Information Leak',     icon: <Database size={14} /> },
  { id: 'Social Eng.',          icon: <Users size={14} /> },
];

interface SecurityFactor {
  id: string;
  count: number;
  score: number;
  icon: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

function SecurityReportContent() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain') || 'unknown.com';
  const scanId = searchParams.get('scan_id');

  const [globalScore, setGlobalScore] = useState(0);
  const [activeFactor, setActiveFactor] = useState('');
  const [activeIssueCategory, setActiveIssueCategory] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isFixing, setIsFixing] = useState<number | null>(null);
  const [fixedIssues, setFixedIssues] = useState<number[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);

  const [dynamicIssuesData, setDynamicIssuesData] = useState<Record<string, any[]>>({});
  const [dynamicSecurityFactors, setDynamicSecurityFactors] = useState<SecurityFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [totalSubdomains, setTotalSubdomains] = useState(0);
  const [scanDate, setScanDate] = useState('');

  useEffect(() => {
    if (!scanId) {
      setIsLoading(false);
      setReportError('No scan_id provided. Please start a scan first.');
      return;
    }
    setIsLoading(true);
    submitForAnalyzer(scanId).then((res) => {
        setGlobalScore(res.domain_score);
        
        const newIssuesData: Record<string, any[]> = {};
        const activeFactorCounts: Record<string, number> = {};
        
        // Count unique subdomains across all vulnerabilities
        const allSubdomains = new Set<string>();
        
        // Add getPort helper for non-network issues
        const getPort = (vulnName: string): string => {
            if (vulnName.includes('443')) return '443';
            if (vulnName.includes('HTTP without')) return '80';
            if (vulnName.includes('port')) return 'Various';
            return '—';
        };

        Object.entries(res.categorized_vulnerabilities).forEach(([factorName, vulnerabilities]) => {
           const factorIssues: any[] = [];
           let factorIssueCount = 0;
           
           Object.entries(vulnerabilities as Record<string, VulnerabilityEntry[]>).forEach(([vulnName, targets]) => {
               const findingTargets = Array.isArray(targets) ? targets : [];
               if (findingTargets.length === 0) return;
               
               findingTargets.forEach((t: VulnerabilityEntry) => allSubdomains.add(t.subdomain || (t as any)));
               factorIssueCount++;
               factorIssues.push({
                   id: Math.floor(Math.random() * 1000000), 
                   title: vulnName,
                   severity: getSeverity(vulnName),
                   category: factorName,
                   desc: getDescription(vulnName, findingTargets.length),
                   remediation: getRemediation(vulnName),
                   breachRisk: getSeverity(vulnName),
                   impact: getImpact(vulnName),
                   findings: findingTargets.map((t: any) => ({
                       status: 'Open',
                       target: t.subdomain || (t as any),
                       ip: t.ip || '—',
                       port: t.port != null ? t.port : getPort(vulnName),
                       severity: t.severity || getSeverity(vulnName),
                       cvss: t.abuse_score ? (t.abuse_score / 10).toFixed(1) : getCVSS(vulnName),
                       abuse_score: t.abuse_score,
                       country: t.country,
                       usage_type: t.usage_type,
                       isp: t.isp,
                       observation: new Date().toLocaleDateString()
                   })).sort((a: any, b: any) => (b.abuse_score || 0) - (a.abuse_score || 0))
               });
           });
           
           if (factorIssues.length > 0) {
               newIssuesData[factorName] = factorIssues;
               activeFactorCounts[factorName] = factorIssueCount;
           }
        });
        
        // Build all 10 factors using API category_scores
        const apiScores = res.category_scores || {};
        const newFactors: SecurityFactor[] = ALL_FACTORS.map(f => ({
          id: f.id,
          count: activeFactorCounts[f.id] || 0,
          score: apiScores[f.id] ?? 100,
          icon: f.icon,
        }));
        
        setTotalSubdomains(allSubdomains.size);
        setScanDate(new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
        setDynamicIssuesData(newIssuesData);
        setDynamicSecurityFactors(newFactors);
        
        const firstActive = Object.keys(newIssuesData)[0];
        if (firstActive) setActiveFactor(firstActive);
        
        setIsLoading(false);
    }).catch((err: Error) => {
        setReportError(err.message);
        setIsLoading(false);
    });
  }, [scanId]);

  // Counts
  const totalVulns = dynamicSecurityFactors.reduce((sum, f) => sum + f.count, 0);

  const handleFix = (issueId: number) => {
    setIsFixing(issueId);
    setTimeout(() => {
      setFixedIssues(prev => [...prev, issueId]);
      setIsFixing(null);
      setGlobalScore(prev => Math.min(100, prev + 2));
    }, 2000);
  };

  useEffect(() => {
    if (isLoading || globalScore === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.score-counter',
        { innerHTML: 0 },
        { innerHTML: globalScore, duration: 2, snap: { innerHTML: 1 }, ease: 'power2.out' }
      );
      gsap.fromTo('.factor-bar',
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 1.2, stagger: 0.1, ease: 'power2.out', delay: 0.8 }
      );
    }, mainRef);
    return () => ctx.revert();
  }, [isLoading, globalScore]);

  const factorIssues = (dynamicIssuesData[activeFactor] || []).filter(i => !fixedIssues.includes(i.id));
  const factorSubCategories = ['All', ...Array.from(new Set(factorIssues.map((i: any) => i.category)))];
  const activeIssues = activeIssueCategory === 'All'
    ? factorIssues
    : factorIssues.filter((i: any) => i.category === activeIssueCategory);

  // Score label
  const scoreLabel = globalScore >= 90 ? 'Excellent' : globalScore >= 75 ? 'Fair' : globalScore >= 60 ? 'Needs Work' : 'Critical';

  // ─── Loading State ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-[#f8fbff] gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-12 h-12 text-blue-600" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Generating Security Report</h2>
          <p className="text-sm text-slate-500 font-medium">Analyzing scan data for <span className="font-bold text-slate-700">{domain}</span></p>
        </div>
      </div>
    );
  }

  if (reportError) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-[#f8fbff] gap-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100">
          <AlertCircle size={32} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Report Error</h2>
          <p className="text-sm text-red-500 font-medium">{reportError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col gap-6 p-8 bg-[#f8fbff]" ref={mainRef}>

      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">{domain}</h1>
            <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded border border-slate-800 uppercase tracking-tighter">Verified</span>
          </div>
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">
            Tier-1 Security Assessment — {totalSubdomains} Subdomains Scanned · Last run: {scanDate}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-5 py-2.5 border border-slate-200 text-[10px] font-black text-slate-600 bg-white hover:bg-slate-50 transition-all rounded-lg uppercase tracking-widest shadow-sm">
            Generate Report
          </button>
          <button className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black hover:bg-blue-700 transition-all flex items-center space-x-2 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20">
            <Clock className="w-3.5 h-3.5 stroke-[3]" />
            <span>Recalibrate Scan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Score Card */}
        <div className="xl:col-span-12 bg-white rounded-2xl p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50/50 rounded-full -mr-40 -mt-40 group-hover:scale-110 transition-transform duration-1000" />

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="text-9xl font-black text-slate-900 score-counter leading-none tracking-tighter">{globalScore}</div>
              <div className={`absolute top-0 -right-16 px-2 py-0.5 text-[10px] font-black rounded border-2 border-white shadow-xl ${
                globalScore >= 75 ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
              }`}>
                {scoreLabel}
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-400 mt-4 tracking-[0.4em] uppercase">Global Security Health Index</p>
          </div>

          <div className="flex-1 w-full space-y-10">
            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Security Score Progress</span>
                <span className="text-[10px] font-black text-blue-600 px-2 py-1 bg-blue-50 rounded uppercase tracking-tighter">Target 98%</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-sm overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${globalScore}%` }}
                  transition={{ duration: 1.5, ease: 'circOut' }}
                  className="h-full bg-slate-900 rounded-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Analysis Explorer */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Deep Analysis Explorer</h3>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Scan completed {scanDate} · {totalSubdomains} subdomains · {totalVulns} issues</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* Vertical Factor Sidebar */}
          <div className="lg:col-span-3 bg-slate-50/50 border-r border-slate-50 p-6 space-y-2 overflow-y-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Security Factors</p>
            {dynamicSecurityFactors.map((factor) => (
              <motion.button
                key={factor.id}
                onClick={() => {
                  setActiveFactor(factor.id);
                  setActiveIssueCategory('All');
                  setSelectedIssue(null);
                }}
                animate={{
                  backgroundColor: activeFactor === factor.id ? '#0f172a' : 'rgba(255, 255, 255, 1)',
                  borderColor: activeFactor === factor.id ? '#1e293b' : '#f1f5f9',
                  x: activeFactor === factor.id ? 4 : 0
                }}
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative flex items-center justify-between p-4 rounded-xl border mb-2 overflow-hidden shadow-sm"
              >
                <AnimatePresence>
                  {activeFactor === factor.id && (
                    <motion.div
                      layoutId="active-indicator"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 z-10"
                    />
                  )}
                </AnimatePresence>
                <div className="flex items-center space-x-3 relative z-20">
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeFactor === factor.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {factor.icon}
                  </div>
                  <div className="text-left">
                    <motion.span
                      animate={{ color: activeFactor === factor.id ? '#ffffff' : '#0f172a' }}
                      className="block text-[11px] font-black tracking-tight"
                    >
                      {factor.id}
                    </motion.span>
                    <motion.span
                      animate={{ color: activeFactor === factor.id ? 'rgba(96,165,250,0.8)' : '#94a3b8' }}
                      className="text-[8.5px] font-black uppercase tracking-[0.1em]"
                    >
                      {factor.count > 0 ? `${factor.count} issue${factor.count > 1 ? 's' : ''} found` : 'No issues'}
                    </motion.span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 relative z-20">
                  <div className="flex items-center space-x-1">
                    <motion.span
                      animate={{ color: activeFactor === factor.id ? '#93c5fd' : '#0f172a' }}
                      className="text-[12px] font-black"
                    >
                      {factor.score}
                    </motion.span>
                    <span className={`text-[8px] font-bold ${activeFactor === factor.id ? 'text-slate-500' : 'text-slate-400'}`}>/100</span>
                  </div>
                  {factor.count > 0 && (
                    <div className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                      activeFactor === factor.id ? 'bg-blue-500/20 text-blue-400' : 'bg-red-50 text-red-500'
                    }`}>
                      {factor.count} {factor.count === 1 ? 'Vulnerability' : 'Vulnerabilities'}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Issues List */}
          <div className="lg:col-span-9 p-8 bg-slate-50/20 relative">
            <AnimatePresence mode="wait">
              {!selectedIssue ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <div className="flex items-center justify-between mb-8 px-2">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Issues · {activeFactor}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{domain}</p>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Critical</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">High</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-category filters */}
                  <div className="flex space-x-3 mb-8 overflow-x-auto no-scrollbar pb-2">
                    {factorSubCategories.map((cat) => {
                      const countInCat = cat === 'All' ? factorIssues.length : factorIssues.filter((i: any) => i.category === cat).length;
                      const isActive = activeIssueCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveIssueCategory(cat)}
                          className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 whitespace-nowrap ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-800 shadow-xl shadow-slate-900/10'
                              : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <span className="text-[13px] font-black">{cat}</span>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-slate-500'}`}>({countInCat})</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    {activeIssues.length > 0 ? (
                      activeIssues.map((issue) => (
                        <div
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className="group bg-white rounded-[24px] border border-slate-100 p-6 hover:shadow-lg hover:border-slate-200 transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                  issue.severity === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  issue.severity === 'High'     ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                  issue.severity === 'Medium'   ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                                                   'bg-blue-50 text-blue-600 border border-blue-100'
                                }`}>
                                  {issue.severity}
                                </span>
                                <h5 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{issue.title}</h5>
                              </div>
                              <p className="text-[13px] text-slate-500 font-medium leading-relaxed max-w-2xl line-clamp-2">{issue.desc}</p>
                              <div className="flex items-center space-x-2 pt-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Affected:</span>
                                <span className="text-[10px] font-bold text-blue-600">{issue.findings.length} {issue.findings.length === 1 ? 'host' : 'hosts'}</span>
                                <span className="text-[9px] text-slate-300">·</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score impact:</span>
                                <span className="text-[10px] font-bold text-red-500">−{issue.impact} pts</span>
                              </div>
                              {/* IP & Port badges */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                {issue.findings.slice(0, 4).map((f: any, fi: number) => (
                                  <span key={fi} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-bold text-slate-500">
                                    <Globe size={9} className="text-slate-400" />
                                    <span className="font-mono">{f.ip !== '—' ? f.ip : f.target}</span>
                                    {f.port !== '—' && <span className="text-slate-300">:{f.port}</span>}
                                  </span>
                                ))}
                                {issue.findings.length > 4 && (
                                  <span className="text-[9px] font-black text-slate-400">+{issue.findings.length - 4} more</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-4">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleFix(issue.id); }}
                                disabled={isFixing === issue.id}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center space-x-2 ${
                                  isFixing === issue.id
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm'
                                }`}
                              >
                                {isFixing === issue.id ? (
                                  <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /><span>Resolving...</span></>
                                ) : (
                                  <><ShieldCheck size={12} /><span>Fix</span></>
                                )}
                              </button>
                              <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 border border-green-100">
                          <ShieldCheck size={32} />
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-lg font-black text-slate-900 uppercase">Sector Secure</h5>
                          <p className="text-sm text-slate-400 font-medium">No active vulnerabilities detected in this sector.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  {/* Detail Header */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => setSelectedIssue(null)}
                      className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors group mb-2"
                    >
                      <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{activeFactor}</span>
                    </button>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedIssue.title}</h3>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Threat Level',  value: selectedIssue.severity,   sub: 'Expert Calibration' },
                      { label: 'Breach Risk',   value: selectedIssue.breachRisk, sub: 'Vector Likelihood' },
                      { label: 'Score Delta',   value: `−${selectedIssue.impact}`, sub: 'Per-Subdomain Impact' },
                    ].map((card, i) => (
                      <div key={i} className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-2 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{card.label}</p>
                        <p className={`text-xl font-black ${
                          card.value === 'Critical' || card.value.startsWith('−2') ? 'text-red-500' :
                          card.value === 'High'     || card.value.startsWith('−1') ? 'text-orange-500' :
                          card.value === 'Medium'   ? 'text-yellow-400' : 'text-white'
                        }`}>{card.value}</p>
                        <p className="text-[8px] text-slate-600 font-extrabold uppercase tracking-tighter">{card.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-3 shadow-sm">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <AlertCircle size={14} className="stroke-[3]" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em]">Vector Description</p>
                    </div>
                    <p className="text-[13px] text-slate-600 font-medium leading-relaxed">{selectedIssue.desc}</p>
                  </div>

                  {/* Remediation */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-3 shadow-2xl">
                    <div className="flex items-center space-x-2 text-blue-500">
                      <ShieldCheck size={14} className="stroke-[3]" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em]">Remediation Strategy</p>
                    </div>
                    <p className="text-[13px] text-slate-300 font-medium leading-relaxed">{selectedIssue.remediation}</p>
                  </div>

                  {/* Findings Table */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                      Findings ({selectedIssue.findings.length} hosts)
                    </h4>
                    <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="sticky top-0 bg-slate-900">
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="px-6 py-4 font-black uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest">Target</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest">IP Address</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest">{activeFactor === 'IP Reputation' ? 'Abuse Score' : 'Port'}</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest">{activeFactor === 'IP Reputation' ? 'Country' : 'CVSS'}</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest">Last Observed</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          {selectedIssue.findings.map((f: any, i: number) => (
                            <tr key={i} className="group hover:bg-white/5 transition-colors border-b border-slate-800/50 last:border-0">
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full border border-orange-500/30 text-orange-500 bg-orange-500/5 font-bold uppercase text-[9px]">
                                  {f.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-400 text-[10px]">{f.target}</td>
                              <td className="px-6 py-4 font-mono text-blue-400 text-[10px]">{f.ip}</td>
                              <td className="px-6 py-4 font-bold">
                                {activeFactor === 'IP Reputation' ? (
                                  <span className={`px-2 py-0.5 rounded ${
                                    f.abuse_score > 50 ? 'bg-red-500/20 text-red-500' :
                                    f.abuse_score > 20 ? 'bg-orange-500/20 text-orange-500' :
                                    'bg-green-500/20 text-green-500'
                                  }`}>
                                    {f.abuse_score}%
                                  </span>
                                ) : f.port}
                              </td>
                              <td className="px-6 py-4 font-black text-white">
                                {activeFactor === 'IP Reputation' ? (
                                  <span className="flex items-center space-x-1.5 font-bold text-slate-400">
                                    <span className="text-[10px]">{f.country || '—'}</span>
                                  </span>
                                ) : f.cvss}
                              </td>
                              <td className="px-6 py-4 text-slate-500 font-medium uppercase text-[10px]">{f.observation}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleFix(selectedIssue.id)}
                                  disabled={isFixing === selectedIssue.id}
                                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center space-x-2 ${
                                    isFixing === selectedIssue.id
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm'
                                  }`}
                                >
                                  {isFixing === selectedIssue.id ? (
                                    <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /><span>Resolving...</span></>
                                  ) : (
                                    <><ShieldCheck size={12} /><span>Fix</span></>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper functions for enriching vulnerability display ─────────────────────

function getSeverity(vulnName: string): string {
  const critical = ['HTTP without HTTPS', '443 open without TLS'];
  const high = ['Missing CSP header', 'Missing HSTS header', 'Missing NS record', 'Missing TXT record', 'Risky port exposed', 'Malicious IP Activity Detected'];
  const medium = ['Missing X-Frame-Options', 'Missing X-Content-Type-Options', 'Missing MX record', 'Unexpected open port'];
  if (critical.some(k => vulnName.includes(k))) return 'Critical';
  if (high.some(k => vulnName.includes(k))) return 'High';
  if (medium.some(k => vulnName.includes(k))) return 'Medium';
  return 'High';
}

function getImpact(vulnName: string): number {
  const impactMap: Record<string, number> = {
    'HTTP without HTTPS': 20,
    '443 open without TLS': 20,
    'Missing HSTS header': 4,
    'Missing CSP header': 3,
    'Missing X-Frame-Options': 2,
    'Missing X-Content-Type-Options': 2,
    'Missing NS record': 2,
    'Missing TXT record': 1,
    'Missing MX record': 1,
    'Risky port exposed': 10,
    'Unexpected open port': 8,
    'Malicious IP Activity Detected': 15,
  };
  for (const [key, val] of Object.entries(impactMap)) {
    if (vulnName.includes(key)) return val;
  }
  return 5;
}

function getDescription(vulnName: string, affectedCount: number): string {
  const descriptions: Record<string, string> = {
    'HTTP without HTTPS': `Traffic is served over unencrypted HTTP with no HTTPS redirect. All data — including credentials and session tokens — is transmitted in plain text. Affects ${affectedCount} host(s).`,
    '443 open without TLS': `Port 443 is open but TLS is not properly configured. This means HTTPS connections will fail or expose traffic. Affects ${affectedCount} host(s).`,
    'Missing CSP header': `The Content-Security-Policy header is absent, leaving browsers unable to restrict which resources may be loaded. This enables XSS and data injection attacks. Affects ${affectedCount} host(s).`,
    'Missing HSTS header': `Strict-Transport-Security is missing despite TLS being present. Without HSTS, browsers may allow downgrade attacks, stripping HTTPS to HTTP. Affects ${affectedCount} host(s).`,
    'Missing X-Frame-Options': `The X-Frame-Options header is absent, leaving sites vulnerable to clickjacking attacks where a malicious page embeds your site in an invisible iframe. Affects ${affectedCount} host(s).`,
    'Missing X-Content-Type-Options': `X-Content-Type-Options: nosniff is missing. Without it, browsers may perform MIME-type sniffing, which can allow certain injection attacks. Affects ${affectedCount} host(s).`,
    'Missing NS record': `NS (Name Server) records are missing, which can cause DNS resolution failures and indicates subdomains may not have proper authoritative delegation. Affects ${affectedCount} host(s).`,
    'Missing TXT record': `TXT records are absent, meaning no SPF or DMARC policies are in place. This leaves the domain open to email spoofing and phishing attacks. Affects ${affectedCount} host(s).`,
    'Missing MX record': `MX records are absent. While mail delivery may not be intended, missing MX records can indicate incomplete DNS configuration. Affects ${affectedCount} host(s).`,
    'Risky port exposed': `A risky port (e.g., 8080, 3306, 21) is open and publicly accessible. These ports are frequently targeted by scanners and automated attack tools. Affects ${affectedCount} host(s).`,
    'Unexpected open port': `An unexpected port is open. Ports not explicitly needed increase the attack surface and may indicate running services that should be firewalled. Affects ${affectedCount} host(s).`,
    'Malicious IP Activity Detected': `Infrastructure is associated with IPs known for malicious activity (spam, hacking, DDoS). We detected ${affectedCount} high-risk IP(s) in your configuration.`,
  };
  for (const [key, val] of Object.entries(descriptions)) {
    if (vulnName.includes(key)) return val;
  }
  return `Automated vulnerability finding: ${vulnName}. Affects ${affectedCount} host(s). Review findings for details.`;
}

function getRemediation(vulnName: string): string {
  const remediations: Record<string, string> = {
    'HTTP without HTTPS': 'Configure a permanent 301 redirect from HTTP to HTTPS and enable HSTS on all affected hosts.',
    '443 open without TLS': 'Provision a TLS certificate (Let\'s Encrypt is free) and configure the server to terminate TLS on port 443. Force HTTPS redirect on port 80.',
    'Missing CSP header': 'Add a Content-Security-Policy header via your web server or CDN. A restrictive policy like default-src \'self\' should be the baseline.',
    'Missing HSTS header': 'Set Strict-Transport-Security: max-age=31536000; includeSubDomains on your server or CDN settings.',
    'Missing X-Frame-Options': 'Add X-Frame-Options: SAMEORIGIN (or DENY) to all HTTP responses across all subdomains.',
    'Missing X-Content-Type-Options': 'Add X-Content-Type-Options: nosniff globally via reverse proxy, CDN rules, or framework middleware.',
    'Missing NS record': 'Review DNS zone configuration and ensure each subdomain has valid NS records pointing to authoritative servers.',
    'Missing TXT record': 'Publish SPF TXT record: v=spf1 include:... -all. Add DMARC policy at _dmarc: v=DMARC1; p=quarantine.',
    'Missing MX record': 'If mail is not intended for these subdomains, publish a null MX record to explicitly indicate this and prevent abuse.',
    'Risky port exposed': 'Close the risky port on all affected hosts or restrict access via firewall rules to trusted IPs only.',
    'Unexpected open port': 'Audit the open port and close it if the running service is not needed. Otherwise restrict access via firewall.',
    'Malicious IP Activity Detected': 'Contact your infrastructure provider to rotate IPs or investigate potential account compromise. Ensure all egress/ingress is restricted to legitimate traffic only.',
  };
  for (const [key, val] of Object.entries(remediations)) {
    if (vulnName.includes(key)) return val;
  }
  return 'Review and remediate immediately. Consult your security team for detailed remediation steps.';
}

function getPort(vulnName: string): string {
  if (vulnName.includes('443')) return '443';
  if (vulnName.includes('HTTP without')) return '80';
  if (vulnName.includes('port')) return 'Various';
  return 'N/A';
}

function getCVSS(vulnName: string): string {
  const cvssMap: Record<string, string> = {
    'HTTP without HTTPS': '9.1',
    '443 open without TLS': '9.8',
    'Missing CSP header': '6.1',
    'Missing HSTS header': '6.5',
    'Missing X-Frame-Options': '5.4',
    'Missing X-Content-Type-Options': '4.3',
    'Missing NS record': '6.8',
    'Missing TXT record': '7.1',
    'Missing MX record': '5.0',
    'Risky port exposed': '7.5',
    'Unexpected open port': '6.5',
    'Malicious IP Activity Detected': '8.2',
  };
  for (const [key, val] of Object.entries(cvssMap)) {
    if (vulnName.includes(key)) return val;
  }
  return 'N/A';
}

export default function SecurityReport() {
  return (
    <Suspense fallback={<div className="min-h-full flex items-center justify-center bg-[#f8fbff] text-slate-500 font-bold uppercase tracking-widest text-sm">Loading Report...</div>}>
      <SecurityReportContent />
    </Suspense>
  );
}
