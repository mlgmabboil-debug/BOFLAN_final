import { PLATFORM_TREASURY_TRON, USDT_TRC20_CONTRACT } from "../constants/platform";

function getTronWeb(): { contract: () => { at: (addr: string) => Promise<TronContract> } } | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.tronWeb ?? null;
}

type TronContract = {
  transfer: (to: string, amount: number | string) => { send: (opts?: { feeLimit?: number }) => Promise<string> };
};

/**
 * Отправка комиссии платформы в USDT (TRC20) на казну Tron через TronLink.
 * @param usdAmount сумма в USD (6 знаков после запятой для USDT)
 */
export async function sendPlatformFeeUsdtTrc20(usdAmount: number): Promise<string> {
  const tw = getTronWeb();
  if (!tw?.contract) {
    throw new Error("TronLink не обнаружен. Установите расширение и подключите кошелёк Tron.");
  }
  const amountSun = Math.max(1, Math.floor(usdAmount * 1e6));
  const c = await tw.contract().at(USDT_TRC20_CONTRACT);
  const txId = await c.transfer(PLATFORM_TREASURY_TRON, amountSun).send({
    feeLimit: 150_000_000,
  });
  return typeof txId === "string" ? txId : String(txId);
}

export function hasTronLink(): boolean {
  return typeof window !== "undefined" && !!(window as Window & { tronWeb?: unknown }).tronWeb;
}
