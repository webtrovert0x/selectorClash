import type { Metadata } from 'next';
import './globals.css';
import './compiled-styles.css';
import { Web3Provider } from '../context/Web3Provider';
import { Header } from '../components/Header';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'SelectorClash — Function Selector Collision Detector',
  description:
    'Detect 4-byte function selector collisions in Solidity ABIs, ERC-1967 Transparent Proxies, and ERC-2535 Diamonds on Botchain Mainnet.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialReownId = process.env.REOWN_ID?.trim() || '';
  const initialContractAddress = process.env.SELECTOR_CLASH_REGISTRY_ADDRESS?.trim() || '';

  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col font-mono selection:bg-zinc-800 selection:text-zinc-100">
        <ErrorBoundary>
          <Web3Provider
            initialReownId={initialReownId}
            initialContractAddress={initialContractAddress}
          >
            <Header />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 font-mono">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/selectorclash-logo.svg"
                    alt="SelectorClash"
                    className="w-4 h-4 rounded object-contain"
                  />
                  <span>
                    SelectorClash • Solidity Function Selector Collision Detector on Botchain Mainnet (677)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-zinc-400">
                  <a
                    href="https://www.botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                    title="Official Botchain Website"
                  >
                    <img
                      src="/botchain-logo.png"
                      alt="Botchain Official Logo"
                      className="w-3.5 h-3.5 rounded-full object-contain"
                    />
                    <span>Botchain.ai</span>
                  </a>
                  <a
                    href="https://scan.botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                    title="Official BotchainScan Explorer"
                  >
                    <img
                      src="/botchain-logo.png"
                      alt="BotchainScan Logo"
                      className="w-3.5 h-3.5 rounded-full object-contain"
                    />
                    <span>BotchainScan</span>
                  </a>
                  <a
                    href="https://rpc.botchain.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                    title="Official Botchain RPC Endpoint"
                  >
                    <img
                      src="/botchain-logo.png"
                      alt="Botchain RPC"
                      className="w-3.5 h-3.5 rounded-full object-contain"
                    />
                    <span>RPC (677)</span>
                  </a>
                  <span className="text-zinc-600">Gas Fee Only (BOT)</span>
                </div>
              </div>
            </footer>
          </Web3Provider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
