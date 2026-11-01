'use client';

import React, { useState } from 'react';
import { inspectDiamondOnChain, DiamondInspectionResult } from '../utils/diamondLoupe';
import { RecordAuditModal } from './RecordAuditModal';
import { Layers, Search, AlertTriangle, CheckCircle2, ShieldAlert, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { ExtractedSelector, SelectorCollision } from '../utils/selectorExtractor';

export function DiamondInspector() {
  const [diamondAddress, setDiamondAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://rpc.bohr.life');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiamondInspectionResult | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const handleInspect = async () => {
    if (!diamondAddress.trim()) return;
    setIsLoading(true);
    try {
      const res = await inspectDiamondOnChain(diamondAddress.trim(), rpcUrl.trim());
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert facet selectors into ExtractedSelector format for recording
  const extractedSelectors: ExtractedSelector[] = [];
  const collisions: SelectorCollision[] = [];

  if (result && result.facets) {
    for (const facet of result.facets) {
      for (const sel of facet.selectors) {
        extractedSelectors.push({
          name: sel,
          signature: sel,
          canonicalSignature: sel,
          selector: sel,
          sourceName: `${facet.facetAddress.slice(0, 6)}...${facet.facetAddress.slice(-4)}`,
        });
      }
    }

    for (const dup of result.duplicateSelectors) {
      collisions.push({
        selector: dup.selector,
        entries: dup.facets.map((f) => ({
          name: dup.selector,
          signature: dup.selector,
          canonicalSignature: dup.selector,
          selector: dup.selector,
          sourceName: f,
        })),
        type: 'MultiFacetOverlap',
        description: `Overlapping selector ${dup.selector} assigned to multiple facets: ${dup.facets.join(', ')}`,
        severity: 'CRITICAL',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-zinc-300" />
          <h2 className="text-sm font-semibold font-mono text-zinc-100">
            ERC-2535 Diamond Loupe Inspector
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Query on-chain Diamond contracts via IDiamondLoupe on Botchain Testnet to detect facet routing overlap and selector collisions.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={diamondAddress}
              onChange={(e) => setDiamondAddress(e.target.value)}
              placeholder="Diamond Contract Address (0x...)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="w-full sm:w-60">
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="RPC URL (default: https://rpc.bohr.life)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-400 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button
            onClick={handleInspect}
            disabled={isLoading || !diamondAddress.trim()}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-medium text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Querying RPC...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Inspect Loupe</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-4">
          {!result.isLoupeCompliant ? (
            <div className="bg-red-950/20 border border-red-900/60 rounded-xl p-5 text-xs font-mono">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Diamond Loupe Query Failed</span>
              </div>
              <p className="text-zinc-300">
                {result.error || 'The specified address did not respond to ERC-2535 IDiamondLoupe interface.'}
              </p>
              <p className="text-zinc-500 mt-2">
                Make sure the contract is deployed on Botchain Testnet and implements <code>facets()</code>.
              </p>
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-500 text-xs font-mono">Total Facets</div>
                  <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
                    {result.facets.length}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-500 text-xs font-mono">Total Selectors</div>
                  <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
                    {result.totalSelectors}
                  </div>
                </div>

                <div
                  className={`border rounded-xl p-4 ${
                    result.duplicateSelectors.length > 0
                      ? 'bg-red-950/20 border-red-900/60'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="text-zinc-500 text-xs font-mono">Facet Overlaps</div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      result.duplicateSelectors.length > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {result.duplicateSelectors.length}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-zinc-500 text-xs font-mono">On-Chain Attestation</div>
                  <button
                    onClick={() => setShowRecordModal(true)}
                    className="mt-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Record (Gas Fee)</span>
                  </button>
                </div>
              </div>

              {/* Overlap Warning */}
              {result.duplicateSelectors.length > 0 && (
                <div className="bg-red-950/30 border border-red-900/70 rounded-xl p-4 text-xs font-mono">
                  <div className="flex items-center gap-2 text-red-300 font-semibold mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>CRITICAL DIAMOND ROUTING CONFLICT</span>
                  </div>
                  <p className="text-zinc-300 mb-3">
                    The Diamond contains duplicate function selectors assigned to more than one facet. EVM caller transactions will produce undefined behavior or route to unintended facets!
                  </p>
                  <div className="space-y-1.5">
                    {result.duplicateSelectors.map((dup, i) => (
                      <div key={i} className="bg-zinc-950 p-2 rounded border border-red-900 flex justify-between">
                        <span className="text-red-400 font-bold">{dup.selector}</span>
                        <span className="text-zinc-400">Claimed by {dup.facets.length} facets</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facet Cards */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-zinc-400 font-semibold">
                  Registered Facets & Selectors:
                </div>
                {result.facets.map((facet, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500">Facet #{idx + 1}:</span>
                        <a
                          href={`https://scan.bohr.life/address/${facet.facetAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-zinc-200 hover:text-zinc-100 flex items-center gap-1 underline"
                        >
                          {facet.facetAddress}
                          <ExternalLink className="w-3 h-3 text-zinc-500" />
                        </a>
                      </div>
                      <span className="text-xs font-mono text-zinc-400">
                        {facet.selectors.length} selector(s)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {facet.selectors.map((sel, sIdx) => {
                        const isDuplicate = result.duplicateSelectors.some(
                          (d) => d.selector === sel
                        );
                        return (
                          <span
                            key={sIdx}
                            className={`px-2 py-0.5 rounded font-mono text-xs border ${
                              isDuplicate
                                ? 'bg-red-950 border-red-800 text-red-300'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                            }`}
                          >
                            {sel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Record Audit Modal */}
      <RecordAuditModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        targetAddress={diamondAddress}
        archType={3} // ERC2535Diamond
        selectors={extractedSelectors}
        collisions={collisions}
      />
    </div>
  );
}

