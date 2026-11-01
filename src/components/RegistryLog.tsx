'use client';

import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import { useAppConfig } from '../context/Web3Provider';
import { SELECTOR_CLASH_REGISTRY_ABI } from '../contracts/SelectorClashRegistryABI';
import { ReportCollisionModal } from './ReportCollisionModal';
import { Address } from 'viem';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  RefreshCw,
  Plus,
  Zap,
} from 'lucide-react';

export function RegistryLog() {
  const { contractAddress } = useAppConfig();
  const [subTab, setSubTab] = useState<'audits' | 'reports'>('audits');
  const [searchAddr, setSearchAddr] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Read Recent Audits
  const {
    data: recentAudits,
    isLoading: loadingAudits,
    refetch: refetchAudits,
  } = useReadContract({
    address: contractAddress ? (contractAddress as Address) : undefined,
    abi: SELECTOR_CLASH_REGISTRY_ABI,
    functionName: 'getRecentAudits',
    args: [BigInt(20)],
    query: {
      enabled: Boolean(contractAddress),
    },
  });

  // Read Recent Reports
  const {
    data: recentReports,
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useReadContract({
    address: contractAddress ? (contractAddress as Address) : undefined,
    abi: SELECTOR_CLASH_REGISTRY_ABI,
    functionName: 'getRecentReports',
    args: [BigInt(20)],
    query: {
      enabled: Boolean(contractAddress),
    },
  });

  // Read Totals
  const { data: totalAudits } = useReadContract({
    address: contractAddress ? (contractAddress as Address) : undefined,
    abi: SELECTOR_CLASH_REGISTRY_ABI,
    functionName: 'totalAudits',
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: totalReports } = useReadContract({
    address: contractAddress ? (contractAddress as Address) : undefined,
    abi: SELECTOR_CLASH_REGISTRY_ABI,
    functionName: 'totalReports',
    query: { enabled: Boolean(contractAddress) },
  });

  const auditsList = (recentAudits as any[]) || [];
  const reportsList = (recentReports as any[]) || [];

  const filteredAudits = auditsList.filter((a) => {
    if (!searchAddr.trim()) return true;
    return (
      a.targetContract?.toLowerCase().includes(searchAddr.toLowerCase()) ||
      a.submitter?.toLowerCase().includes(searchAddr.toLowerCase())
    );
  });

  const filteredReports = reportsList.filter((r) => {
    if (!searchAddr.trim()) return true;
    return (
      r.targetContract?.toLowerCase().includes(searchAddr.toLowerCase()) ||
      r.selector?.toLowerCase().includes(searchAddr.toLowerCase()) ||
      r.signatureA?.toLowerCase().includes(searchAddr.toLowerCase()) ||
      r.signatureB?.toLowerCase().includes(searchAddr.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-300" />
              <h2 className="text-sm font-semibold font-mono text-zinc-100">
                On-Chain Collision & Audit Registry
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Live records indexed from <code>SelectorClashRegistry.sol</code> on Botchain Testnet (Chain ID 968).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refetchAudits();
                refetchReports();
              }}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Refresh Registry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Collision (Gas Fee)</span>
            </button>
          </div>
        </div>

        {/* Contract Address Notice */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span>Contract Address:</span>
            {contractAddress ? (
              <a
                href={`https://scan.bohr.life/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-200 hover:text-zinc-100 underline flex items-center gap-1"
              >
                {contractAddress}
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            ) : (
              <span className="text-amber-400">
                Deploy contract with <code>npm run deploy:contract</code> or configure address in header.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>Total Audits: <strong className="text-zinc-200">{totalAudits ? Number(totalAudits) : 0}</strong></span>
            <span>Total Reports: <strong className="text-zinc-200">{totalReports ? Number(totalReports) : 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('audits')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              subTab === 'audits'
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Audit History ({auditsList.length})
          </button>
          <button
            onClick={() => setSubTab('reports')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              subTab === 'reports'
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Collision Reports ({reportsList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Search address, selector, or signature..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Content */}
      {subTab === 'audits' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="pb-2">Target Contract</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Selectors</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Submitter</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-600">
                      {loadingAudits
                        ? 'Loading audit records from Botchain Testnet...'
                        : 'No audit records found on-chain. Record an audit from the Analyzer tab!'}
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((item, idx) => {
                    const isZeroAddr =
                      item.targetContract === '0x0000000000000000000000000000000000000000';
                    const archLabel =
                      item.archType === 1
                        ? 'ERC1967'
                        : item.archType === 2
                        ? 'UUPS'
                        : item.archType === 3
                        ? 'Diamond'
                        : 'Standard';

                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 text-zinc-200">
                          {isZeroAddr ? (
                            <span className="text-zinc-500">Raw ABI / Unlinked</span>
                          ) : (
                            <a
                              href={`https://scan.bohr.life/address/${item.targetContract}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-zinc-100 flex items-center gap-1"
                            >
                              {item.targetContract.slice(0, 6)}...{item.targetContract.slice(-4)}
                              <ExternalLink className="w-3 h-3 text-zinc-500" />
                            </a>
                          )}
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                            {archLabel}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-300">
                          {Number(item.totalSelectors)}
                        </td>
                        <td className="py-2.5">
                          {item.hasCollision ? (
                            <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{item.collidingSelectors?.length || 1} Clash</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Clean</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          <a
                            href={`https://scan.bohr.life/address/${item.submitter}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-zinc-200"
                          >
                            {item.submitter.slice(0, 6)}...{item.submitter.slice(-4)}
                          </a>
                        </td>
                        <td className="py-2.5 text-right text-zinc-500">
                          {new Date(Number(item.timestamp) * 1000).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Collision Reports List */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="pb-2">Selector</th>
                  <th className="pb-2">Signature A vs Signature B</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Impact Notes</th>
                  <th className="pb-2">Reporter</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-600">
                      {loadingReports
                        ? 'Loading reports from Botchain Testnet...'
                        : 'No collision reports found. Report a clash using the button above!'}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((item, idx) => {
                    const catLabel =
                      item.category === 1
                        ? 'ProxyAdminClash'
                        : item.category === 2
                        ? 'DiamondFacetOverlap'
                        : item.category === 3
                        ? 'IntraContract'
                        : 'UpgradeShadowing';

                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 font-bold text-red-400">{item.selector}</td>
                        <td className="py-2.5 text-zinc-200">
                          <div className="text-zinc-100 font-medium">{item.signatureA}</div>
                          <div className="text-zinc-400 text-[11px]">⚡ {item.signatureB}</div>
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                            {catLabel}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-300 max-w-xs truncate" title={item.impactNotes}>
                          {item.impactNotes || '—'}
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          <a
                            href={`https://scan.bohr.life/address/${item.reporter}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-zinc-200"
                          >
                            {item.reporter.slice(0, 6)}...{item.reporter.slice(-4)}
                          </a>
                        </td>
                        <td className="py-2.5 text-right text-zinc-500">
                          {new Date(Number(item.timestamp) * 1000).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportCollisionModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}

