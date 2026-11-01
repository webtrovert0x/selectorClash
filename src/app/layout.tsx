import type { Metadata } from 'next';
import './globals.css';
import './compiled-styles.css';
import { Web3Provider } from '../context/Web3Provider';
import { Header } from '../components/Header';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'SelectorClash — Function Selector Collision Detector',
  description:
    'Detect 4-byte function selector collisions in Solidity ABIs, ERC-1967 Transparent Proxies, and ERC-2535 Diamonds on Botchain Testnet.',
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
                <div>
                  SelectorClash • Function Selector Collision Detector on Botchain Testnet (Chain ID 968)
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <a
                    href="https://scan.bohr.life"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-200 transition-colors"
                  >
                    BohrScan
                  </a>
                  <a
                    href="https://rpc.bohr.life"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-200 transition-colors"
                  >
                    RPC
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
