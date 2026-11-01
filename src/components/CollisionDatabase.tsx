'use client';

import React, { useState } from 'react';
import { KNOWN_COLLISION_PAIRS, KnownCollisionPair } from '../config/knownSelectors';
import { computeSelector, canonicalizeSignatureString } from '../utils/selectorExtractor';
import { ReportCollisionModal } from './ReportCollisionModal';
import { BookOpen, Calculator, ShieldAlert, AlertTriangle, ExternalLink, Zap, Copy, Check } from 'lucide-react';

export function CollisionDatabase() {
  const [calcInput, setCalcInput] = useState('transfer(address,uint256)');
  const [selectedPair, setSelectedPair] = useState<KnownCollisionPair | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  let calcSelector = '';
  let calcCanonical = '';
  let calcError = '';

  try {
    calcCanonical = canonicalizeSignatureString(calcInput);
    calcSelector = computeSelector(calcCanonical);
  } catch (err: any) {
    calcError = err.message;
  }

  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Calculator */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-zinc-300" />
          <h2 className="text-sm font-semibold font-mono text-zinc-100">
            Real-Time 4-Byte Function Selector Calculator
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Type any Solidity function signature to compute its canonical format and 4-byte EVM selector:
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <input
              type="text"
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              placeholder="e.g. transfer(address recipient, uint amount)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono text-xs"
            />
          </div>

          {calcError ? (
            <div className="p-2.5 bg-red-950/40 border border-red-900 rounded-lg text-red-300">
              {calcError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Canonical Signature:</span>
                  <span className="text-zinc-200 font-medium">{calcCanonical}</span>
                </div>
                <button
                  onClick={() => copyText(calcCanonical)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {copied === calcCanonical ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px]">4-Byte Selector:</span>
                  <span className="text-emerald-400 font-bold text-sm">{calcSelector}</span>
                </div>
                <button
                  onClick={() => copyText(calcSelector)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {copied === calcSelector ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainer: Why 4-Byte Clashes Matter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 font-mono text-xs text-zinc-300 space-y-3">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
          <BookOpen className="w-5 h-5 text-zinc-300" />
          <span>Vulnerability Analysis: Why Function Selector Collisions Break Contracts</span>
        </div>
        <p className="leading-relaxed text-zinc-400">
          The EVM identifies which function to execute by inspecting the first 4 bytes of <code>msg.data</code>: <code className="text-zinc-200">bytes4(keccak256("func(type1,type2)"))</code>.
          Because 4 bytes is only 32 bits, there are only <span className="text-zinc-200 font-bold">4,294,967,296</span> possible selectors. Under the <em>Birthday Paradox</em>, finding a collision between two random signatures requires only ~77,000 evaluations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <h4 className="text-amber-400 font-semibold mb-1">
              1. Transparent Proxy Hijacking (Tincho Attack)
            </h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              In ERC-1967 Transparent Proxies, if a caller is an admin, calls route to the proxy; otherwise, they delegatecall to the implementation. If an implementation function shares a 4-byte selector with an admin function (e.g. <code>upgradeTo</code>), the proxy logic hijacks the execution or bricks user calls!
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <h4 className="text-red-400 font-semibold mb-1">
              2. Diamond (ERC-2535) Facet Overwriting
            </h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Diamonds map each 4-byte selector to exactly one facet address. When adding or cutting facets, if two facets export the same selector, one facet silently overwrites the other or causes <code>diamondCut</code> reverts, compromising protocol upgrades.
            </p>
          </div>
        </div>
      </div>

      {/* Catalog of Known Collision Pairs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold font-mono text-zinc-300 mb-3">
          Catalog of Documented Selector Collisions:
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {KNOWN_COLLISION_PAIRS.map((pair, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold text-sm">{pair.selector}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                    {pair.category}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pair.riskSeverity === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-900'
                        : 'bg-amber-950 text-amber-300 border border-amber-900'
                    }`}
                  >
                    {pair.riskSeverity}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedPair(pair);
                    setShowReportModal(true);
                  }}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <Zap className="w-3 h-3" />
                  <span>Report to Botchain (Gas Fee)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-200">
                <div className="bg-zinc-900/60 p-2 rounded">
                  <span className="text-zinc-500 block text-[10px]">Signature A:</span>
                  <code className="text-zinc-100">{pair.signatureA}</code>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded">
                  <span className="text-zinc-500 block text-[10px]">Signature B:</span>
                  <code className="text-zinc-100">{pair.signatureB}</code>
                </div>
              </div>

              <p className="text-zinc-400 text-[11px] leading-relaxed pt-1">
                {pair.context}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ReportCollisionModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedPair(null);
        }}
        initialSignatureA={selectedPair?.signatureA || ''}
        initialSignatureB={selectedPair?.signatureB || ''}
        initialSelector={selectedPair?.selector || ''}
      />
    </div>
  );
}

