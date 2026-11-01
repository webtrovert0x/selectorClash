'use client';

import React, { useState, useMemo } from 'react';
import {
  extractSelectorsFromAbi,
  extractSelectorsFromRawSignatures,
  detectCollisions,
  ExtractedSelector,
  SelectorCollision,
} from '../utils/selectorExtractor';
import { RecordAuditModal } from './RecordAuditModal';
import { ReportCollisionModal } from './ReportCollisionModal';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCode,
  Zap,
  Search,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

const SAMPLE_PROXY_CLASH_ABI = `[
  {
    "name": "clash550254402",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "balanceOf",
    "type": "function",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "name": "transfer",
    "type": "function",
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  }
]`;

const SAMPLE_DIAMOND_FACET_A = `// Facet A: ERC-20 Core
function transfer(address recipient, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
function balanceOf(address account) external view returns (uint256)`;

const SAMPLE_DIAMOND_FACET_B = `// Facet B: Staking & Approvals (With Collision)
// Notice: sign_szabo_nod(uint256,bytes32) clashes with approve(address,uint256) -> 0x095ea7b3
function sign_szabo_nod(uint256 amount, bytes32 nonce) external
function stake(uint256 amount) external
function unstake(uint256 amount) external`;

export function AbiSelectorAnalyzer() {
  const [tab, setTab] = useState<'single' | 'multifacet' | 'proxyDiff'>('single');
  const [targetAddress, setTargetAddress] = useState('');
  
  // Single ABI Mode
  const [singleInput, setSingleInput] = useState(SAMPLE_PROXY_CLASH_ABI);
  const [inputType, setInputType] = useState<'abi' | 'signatures'>('abi');

  // Multi-Facet Mode
  const [facets, setFacets] = useState<Array<{ id: string; name: string; content: string }>>([
    { id: '1', name: 'Facet A (Token)', content: SAMPLE_DIAMOND_FACET_A },
    { id: '2', name: 'Facet B (Staking)', content: SAMPLE_DIAMOND_FACET_B },
  ]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'collisions' | 'safe'>('all');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCollisionPair, setSelectedCollisionPair] = useState<{
    sigA: string;
    sigB: string;
    selector: string;
  } | null>(null);

  // Copied helper
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);

  // Extraction logic
  const { allSelectors, collisions, safeSelectors, proxyWarnings } = useMemo(() => {
    let extracted: ExtractedSelector[] = [];

    if (tab === 'single') {
      try {
        if (inputType === 'abi') {
          const parsed = JSON.parse(singleInput);
          extracted = extractSelectorsFromAbi(parsed, 'SingleContract');
        } else {
          extracted = extractSelectorsFromRawSignatures(singleInput, 'SingleContract');
        }
      } catch {
        // Fallback to signature parsing if JSON parse fails
        extracted = extractSelectorsFromRawSignatures(singleInput, 'SingleContract');
      }
    } else {
      // Multi-facet mode
      for (const facet of facets) {
        let fSelectors: ExtractedSelector[] = [];
        try {
          const parsed = JSON.parse(facet.content);
          fSelectors = extractSelectorsFromAbi(parsed, facet.name);
        } catch {
          fSelectors = extractSelectorsFromRawSignatures(facet.content, facet.name);
        }
        extracted.push(...fSelectors);
      }
    }

    const { collisions, safeSelectors, proxyWarnings } = detectCollisions(
      extracted,
      tab === 'single' || tab === 'proxyDiff'
    );
    return { allSelectors: extracted, collisions, safeSelectors, proxyWarnings };
  }, [tab, singleInput, inputType, facets]);

  const filteredSelectors = useMemo(() => {
    return allSelectors.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.canonicalSignature.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const isCollision = collisions.some((c) => c.selector === s.selector);
      if (filterMode === 'collisions') return isCollision;
      if (filterMode === 'safe') return !isCollision;
      return true;
    });
  }, [allSelectors, searchQuery, filterMode, collisions]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSelector(text);
    setTimeout(() => setCopiedSelector(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Switcher */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                tab === 'single'
                  ? 'bg-zinc-200 text-zinc-900'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Single Contract / Proxy Check
            </button>
            <button
              onClick={() => setTab('multifacet')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                tab === 'multifacet'
                  ? 'bg-zinc-200 text-zinc-900'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Multi-Facet / Diamond Diff
            </button>
          </div>

          {/* Target Address Input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 font-mono shrink-0">Target Contract:</span>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x... (Botchain contract)"
              className="w-full sm:w-64 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Mode Descriptions */}
        <p className="mt-3 text-xs text-zinc-400">
          {tab === 'single'
            ? 'Extract 4-byte selectors, detect internal hash collisions, and inspect transparent proxy admin clashing vulnerabilities.'
            : 'Compare multiple Diamond facets or upgradeable implementation versions to detect conflicting selector registrations.'}
        </p>
      </div>

      {/* Input Area */}
      {tab === 'single' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-300 font-medium">Input Format:</span>
              <button
                onClick={() => setInputType('abi')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  inputType === 'abi'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                JSON ABI
              </button>
              <button
                onClick={() => setInputType('signatures')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  inputType === 'signatures'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Signatures Text
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => {
                  setInputType('abi');
                  setSingleInput(SAMPLE_PROXY_CLASH_ABI);
                }}
                className="text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700"
              >
                Load Proxy Clash Demo
              </button>
            </div>
          </div>

          <textarea
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            rows={7}
            placeholder={
              inputType === 'abi'
                ? 'Paste contract JSON ABI here...'
                : 'function transfer(address to, uint256 amount) external\nfunction approve(address spender, uint256 amount) external'
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 resize-y"
          />
        </div>
      ) : (
        /* Multi-Facet Manager */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-300 font-medium">
              Facets / Implementations to Diff:
            </span>
            <button
              onClick={() => {
                const nextId = (facets.length + 1).toString();
                setFacets([
                  ...facets,
                  { id: nextId, name: `Facet ${String.fromCharCode(65 + facets.length)}`, content: '' },
                ]);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Facet</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facets.map((facet, idx) => (
              <div key={facet.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={facet.name}
                    onChange={(e) => {
                      const updated = [...facets];
                      updated[idx].name = e.target.value;
                      setFacets(updated);
                    }}
                    className="bg-transparent border-b border-zinc-800 text-xs font-mono font-medium text-zinc-200 focus:outline-none focus:border-zinc-500 pb-0.5"
                  />
                  {facets.length > 2 && (
                    <button
                      onClick={() => setFacets(facets.filter((_, i) => i !== idx))}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea
                  value={facet.content}
                  onChange={(e) => {
                    const updated = [...facets];
                    updated[idx].content = e.target.value;
                    setFacets(updated);
                  }}
                  rows={6}
                  placeholder="Paste ABI or function signatures..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-700"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs font-mono">Total Selectors</div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
            {allSelectors.length}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs font-mono">Unique Selectors</div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
            {new Set(allSelectors.map((s) => s.selector)).size}
          </div>
        </div>

        <div
          className={`border rounded-xl p-4 ${
            collisions.length > 0
              ? 'bg-red-950/20 border-red-900/60'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div className="text-zinc-500 text-xs font-mono">Selector Clashes</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              collisions.length > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {collisions.length}
          </div>
        </div>

        <div
          className={`border rounded-xl p-4 ${
            proxyWarnings.length > 0
              ? 'bg-amber-950/20 border-amber-900/60'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div className="text-zinc-500 text-xs font-mono">Proxy Admin Clashes</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              proxyWarnings.length > 0 ? 'text-amber-400' : 'text-zinc-300'
            }`}
          >
            {proxyWarnings.length}
          </div>
        </div>
      </div>

      {/* Warnings & Action Alerts */}
      {proxyWarnings.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-900/70 rounded-xl p-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>PROXY ADMIN COLLISION DETECTED (Tincho / ERC-1967 Vector)</span>
          </div>
          <p className="text-zinc-300 mb-2">
            The analyzed implementation contains a function that produces the identical 4-byte selector as an ERC-1967 Transparent Proxy Admin function. Any transaction attempting to call this implementation function will be hijacked or intercepted by the proxy dispatcher!
          </p>
          <div className="space-y-1">
            {proxyWarnings.map((w, idx) => (
              <div key={idx} className="bg-zinc-950/80 p-2 rounded border border-amber-900/50 flex items-center justify-between">
                <span>Selector: <span className="text-amber-400 font-bold">{w.selector}</span> ({w.entries.map(e => e.canonicalSignature).join(' vs ')})</span>
                <button
                  onClick={() => {
                    setSelectedCollisionPair({
                      sigA: w.entries[0]?.canonicalSignature || '',
                      sigB: 'proxy_owner()',
                      selector: w.selector,
                    });
                    setShowReportModal(true);
                  }}
                  className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded text-[11px]"
                >
                  Report on Botchain (Gas Fee)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {collisions.length > 0 && (
        <div className="bg-red-950/30 border border-red-900/70 rounded-xl p-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-red-300 font-semibold mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>CRITICAL: {collisions.length} FUNCTION SELECTOR COLLISION(S)</span>
          </div>
          <p className="text-zinc-300 mb-2">
            Different Solidity signatures produce the exact same four bytes. In Diamond (ERC-2535) or custom dispatchers, only one of these functions can be routed, leading to silent overwrites or unexpected execution.
          </p>
          <div className="space-y-2">
            {collisions.map((c, idx) => (
              <div key={idx} className="bg-zinc-950/80 p-2.5 rounded border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-red-400 font-bold">{c.selector}</span>
                  <span className="text-zinc-500 ml-2">Type: {c.type}</span>
                  <div className="text-zinc-300 text-[11px] mt-0.5">
                    {c.entries.map((e) => `[${e.sourceName}] ${e.canonicalSignature}`).join(' ⚡ ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCollisionPair({
                      sigA: c.entries[0]?.canonicalSignature || '',
                      sigB: c.entries[1]?.canonicalSignature || '',
                      selector: c.selector,
                    });
                    setShowReportModal(true);
                  }}
                  className="self-start sm:self-auto px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded text-[11px] shrink-0"
                >
                  Report Collision (Gas Fee)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Toolbar & Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search selector or signature..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-600"
              />
            </div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Selectors ({allSelectors.length})</option>
              <option value="collisions">Collisions Only ({collisions.length})</option>
              <option value="safe">Clean / Safe Only ({safeSelectors.length})</option>
            </select>
          </div>

          {/* Action Buttons: Record Audit / Report Collision */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report Collision</span>
            </button>
            <button
              onClick={() => setShowRecordModal(true)}
              disabled={allSelectors.length === 0}
              className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-medium text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Record Audit to Botchain (Gas Fee)</span>
            </button>
          </div>
        </div>

        {/* Selectors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-2 font-medium">4-Byte Selector</th>
                <th className="pb-2 font-medium">Canonical Function Signature</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredSelectors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-600">
                    No function selectors found. Paste an ABI or signature above.
                  </td>
                </tr>
              ) : (
                filteredSelectors.map((item, idx) => {
                  const isColliding = collisions.some((c) => c.selector === item.selector);
                  const isProxyClash = proxyWarnings.some((w) => w.selector === item.selector);

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isColliding
                          ? 'bg-red-950/20'
                          : isProxyClash
                          ? 'bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isColliding
                                ? 'text-red-400'
                                : isProxyClash
                                ? 'text-amber-400'
                                : 'text-zinc-200'
                            }`}
                          >
                            {item.selector}
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.selector)}
                            className="text-zinc-600 hover:text-zinc-400"
                            title="Copy Selector"
                          >
                            {copiedSelector === item.selector ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 pr-3 text-zinc-300">
                        <span className="text-zinc-100 font-medium">{item.name}</span>
                        <span className="text-zinc-500">
                          {item.canonicalSignature.slice(item.name.length)}
                        </span>
                      </td>

                      <td className="py-2.5 pr-3 text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                          {item.sourceName || 'Contract'}
                        </span>
                      </td>

                      <td className="py-2.5 pr-3">
                        {isColliding ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-[11px]">
                            <ShieldAlert className="w-3 h-3" />
                            <span>COLLISION</span>
                          </span>
                        ) : isProxyClash ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>PROXY CLASH</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => copyToClipboard(item.canonicalSignature)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors text-[11px]"
                        >
                          Copy Sig
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Audit Modal */}
      <RecordAuditModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        targetAddress={targetAddress}
        archType={tab === 'multifacet' ? 3 : 0}
        selectors={allSelectors}
        collisions={collisions}
      />

      {/* Report Collision Modal */}
      <ReportCollisionModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedCollisionPair(null);
        }}
        initialSignatureA={selectedCollisionPair?.sigA || ''}
        initialSignatureB={selectedCollisionPair?.sigB || ''}
        initialSelector={selectedCollisionPair?.selector || ''}
      />
    </div>
  );
}

