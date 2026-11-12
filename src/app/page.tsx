'use client';

import React, { useState } from 'react';
import { AbiSelectorAnalyzer } from '../components/AbiSelectorAnalyzer';
import { DiamondInspector } from '../components/DiamondInspector';
import { ProxyClashChecker } from '../components/ProxyClashChecker';
import { RegistryLog } from '../components/RegistryLog';
import { CollisionDatabase } from '../components/CollisionDatabase';
import {
  FileCode,
  Layers,
  Shield,
  FileText,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    'analyzer' | 'diamond' | 'proxy' | 'registry' | 'database'
  >('analyzer');

  return (
    <div className="space-y-6">
      {/* Hero / Quick Nav */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-zinc-100">
              Function Selector Collision Detector
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Extract 4-byte selectors, identify hash collisions, verify Diamond (ERC-2535) facet overlap, detect Transparent Proxy admin interception, and record verified audits on{' '}
              <span className="inline-flex items-center gap-1 text-zinc-200 font-medium">
                <img
                  src="/botchain-logo.png"
                  alt="Botchain Official Logo"
                  className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                />
                Botchain Mainnet
              </span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Gas Fee Only • 0 Protocol Fees</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-zinc-800">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'analyzer'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>ABI & Selector Analyzer</span>
          </button>

          <button
            onClick={() => setActiveTab('diamond')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'diamond'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Diamond Loupe Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('proxy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'proxy'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Proxy Dispatcher Checker</span>
          </button>

          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'registry'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>On-Chain Registry</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'database'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Collision DB & Calculator</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analyzer' && <AbiSelectorAnalyzer />}
      {activeTab === 'diamond' && <DiamondInspector />}
      {activeTab === 'proxy' && <ProxyClashChecker />}
      {activeTab === 'registry' && <RegistryLog />}
      {activeTab === 'database' && <CollisionDatabase />}
    </div>
  );
}

