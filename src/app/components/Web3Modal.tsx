'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, createConfig } from 'wagmi'
import { WALLET_CONNECT_PROJECT_ID, CHAINS, DEFAULT_CHAIN } from '../config/web3'

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: CHAINS as any,
  transports: CHAINS.reduce((acc, chain) => ({
    ...acc,
    [chain.id]: http(),
  }), {}),
})

createWeb3Modal({
  wagmiConfig,
  projectId: WALLET_CONNECT_PROJECT_ID,
  themeMode: 'dark',
})

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
