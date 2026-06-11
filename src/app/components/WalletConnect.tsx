'use client'

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Wallet, LogOut, Copy, ExternalLink, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react'
import { useWalletAuth } from '../hooks/useWalletAuth'
import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { useTransactions } from '../hooks/useTransactions'
import { CHAINS, DEFAULT_CHAIN } from '../config/web3'

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const { switchChain } = useSwitchChain()
  const { connectWallet, disconnectWallet, isConnecting, error } = useWalletAuth()
  const { user } = useUser()
  const { transactions, isLoading: txLoading } = useTransactions(address)
  const [showTx, setShowTx] = useState(false)

  const isWalletVerified = user?.wallet_address && user?.wallet_verified && user?.wallet_address === address?.toLowerCase()
  const isSupportedChain = CHAINS.some(c => c.id === chain?.id)

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
      // Auto-switch to supported chain if needed
      if (chain && !isSupportedChain) {
        await switchChain({ chainId: DEFAULT_CHAIN.id })
      }
    } catch (error) {
      console.error('Connection error:', error)
    }
  }

  if (isConnected && address) {
    return (
      <Card className="bg-[#111111] border-[#1e1e1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Connected Wallet
            {isWalletVerified && (
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            )}
          </CardTitle>
          <CardDescription className="text-white/60">
            {chain?.name} Network
            {!isSupportedChain && (
              <span className="text-yellow-400 ml-2">
                (Unsupported)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-white/60">Address</div>
            <div className="flex items-center gap-2">
              <code className="text-white font-mono text-sm bg-[#1a1a1a] px-2 py-1 rounded">
                {address.slice(0, 6)}...{address.slice(-4)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-[#00D084] hover:bg-[#1a1a1a]"
                onClick={() => navigator.clipboard.writeText(address)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-[#00D084] hover:bg-[#1a1a1a]"
                onClick={() => window.open(`https://etherscan.io/address/${address}`, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {balance && (
            <div className="space-y-2">
              <div className="text-sm text-white/60">Balance</div>
              <div className="text-white font-mono">
                {(Number(balance.value) / Math.pow(10, balance.decimals)).toFixed(4)} {balance.symbol}
              </div>
            </div>
          )}
          
          {/* Chain Switch Warning */}
          {!isSupportedChain && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex items-start gap-2">
              <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
              <div className="text-yellow-400/70 text-xs">
                <p className="font-medium mb-1">Unsupported Network</p>
                <p>Please switch to a supported EVM network:</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {CHAINS.map((chain) => (
                    <Button
                      key={chain.id}
                      variant="outline"
                      size="sm"
                      onClick={() => switchChain({ chainId: chain.id })}
                      className="border-[#00D084]/50 text-[#00D084] hover:bg-[#00D084]/10 hover:text-[#00D084] text-xs bg-[#1a1a1a]"
                    >
                      {chain.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Verification Status */}
          <div className="space-y-2">
            <div className="text-sm text-white/60">Verification Status</div>
            {isWalletVerified ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Verified & Connected</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm">Not Verified</span>
                </div>
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting || !isSupportedChain}
                  className="w-full bg-[#00D084] hover:bg-[#00b876] text-white font-medium"
                >
                  {isConnecting ? 'Verifying...' : 'Verify & Connect to Profile'}
                </Button>
                {error && (
                  <div className="text-red-400 text-xs">{error}</div>
                )}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">Recent Transactions</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTx(!showTx)}
                className="text-white hover:text-[#00D084] hover:bg-[#1a1a1a] text-xs"
              >
                {showTx ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            {showTx && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {txLoading ? (
                  <div className="text-white/40 text-xs">Loading transactions...</div>
                ) : transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx) => (
                    <div key={tx.hash} className="bg-[#1a1a1a] p-2 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">{tx.type}</span>
                        <span className="text-white/40">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-white font-mono">
                        {tx.value} ETH
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}
                        className="text-[#00D084] hover:text-[#00b876] hover:bg-[#1a1a1a] text-xs p-0 h-auto"
                      >
                        View on Etherscan
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 text-xs">No transactions found</div>
                )}
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              disconnect()
              if (isWalletVerified) {
                disconnectWallet()
              }
            }}
            className="w-full border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:border-red-500/50 hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111111] border-[#1e1e1e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </CardTitle>
        <CardDescription className="text-white/60">
          Connect your Web3 wallet to access premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            variant="outline"
            onClick={() => handleConnect(connector)}
            disabled={isPending}
            className="w-full border-[#2a2a2a] text-white bg-[#1a1a1a] hover:bg-[#2a2a2a] hover:border-[#00D084] hover:text-white justify-start"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#2a2a2a] flex items-center justify-center text-xs text-white">
                {connector.name.charAt(0)}
              </div>
              <span className="text-white">{connector.name}</span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
