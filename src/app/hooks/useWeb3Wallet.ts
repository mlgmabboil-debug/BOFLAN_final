import { useCallback, useEffect, useMemo, useState } from "react";

export interface WalletState {
  account: string | null;
  chainId: string | null;
  balanceEth: string | null;
  connecting: boolean;
  error: string | null;
  isInstalled: boolean;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function hexWeiToEth(weiHex: string): string {
  const wei = BigInt(weiHex);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}

export function useWeb3Wallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ethSource = typeof window !== "undefined" ? (window as any).ethereum : undefined;
  const isInstalled = !!ethSource;

  const refreshBalance = useCallback(async (walletAccount: string) => {
    if (!ethSource) return;
    const balance = await ethSource.request({
      method: "eth_getBalance",
      params: [walletAccount, "latest"],
    });
    setBalanceEth(hexWeiToEth(balance as string));
  }, [ethSource]);

  const refreshConnection = useCallback(async () => {
    if (!ethSource) return;
    const accounts = await ethSource.request({ method: "eth_accounts" }) as string[];
    const currentChainId = await ethSource.request({ method: "eth_chainId" }) as string;
    setChainId(currentChainId);
    if (accounts?.[0]) {
      setAccount(accounts[0]);
      await refreshBalance(accounts[0]);
    } else {
      setAccount(null);
      setBalanceEth(null);
    }
  }, [refreshBalance, ethSource]);

  const connect = useCallback(async () => {
    if (!ethSource) {
      setError("Кошелёк не найден. Установите MetaMask или другой Web3 wallet.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await ethSource.request({ method: "eth_requestAccounts" }) as string[];
      const currentChainId = await ethSource.request({ method: "eth_chainId" }) as string;
      const walletAccount = accounts?.[0] || null;
      setChainId(currentChainId);
      setAccount(walletAccount);
      if (walletAccount) await refreshBalance(walletAccount);
    } catch (e: any) {
      const msg = e?.message || "Не удалось подключить кошелёк";
      setError(
        /evm|chain|network/i.test(String(msg))
          ? `${msg} Если это OKX Wallet — включите сеть Ethereum (EVM) или используйте MetaMask только для оплат.`
          : msg
      );
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance, ethSource]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setBalanceEth(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!ethSource) return;
    refreshConnection().catch(() => {});

    const handleAccountsChanged = (accounts: string[]) => {
      const walletAccount = accounts?.[0] || null;
      setAccount(walletAccount);
      if (walletAccount) {
        refreshBalance(walletAccount).catch(() => {});
      } else {
        setBalanceEth(null);
      }
    };
    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
      if (account) refreshBalance(account).catch(() => {});
    };

    ethSource.on?.("accountsChanged", handleAccountsChanged);
    ethSource.on?.("chainChanged", handleChainChanged);
    return () => {
      ethSource.removeListener?.("accountsChanged", handleAccountsChanged);
      ethSource.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [account, refreshBalance, refreshConnection, ethSource]);

  const shortAccount = useMemo(() => (account ? formatAddress(account) : null), [account]);

  return {
    state: { account, chainId, balanceEth, connecting, error, isInstalled } as WalletState,
    shortAccount,
    connect,
    disconnect,
    refreshConnection,
  };
}

