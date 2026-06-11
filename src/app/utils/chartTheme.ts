import { ColorType, CrosshairMode, DeepPartial, ChartOptions } from "lightweight-charts";

export const EXCHANGE_COLORS = {
  bg: "#0b0e11",
  grid: "#1e2329",
  text: "#848e9c",
  crosshair: "#f0b90b",
  up: "#0ecb81",
  down: "#f6465d",
  areaLine: "#f0b90b",
  areaTop: "rgba(240, 185, 11, 0.35)",
  areaBottom: "rgba(240, 185, 11, 0.02)",
} as const;

export function exchangeChartOptions(
  width: number,
  height: number,
  opts?: { showSeconds?: boolean; transparent?: boolean }
): DeepPartial<ChartOptions> {
  const isMobile = width < 768;
  return {
    width,
    height,
    layout: {
      background: {
        type: ColorType.Solid,
        color: opts?.transparent ? "transparent" : EXCHANGE_COLORS.bg,
      },
      textColor: EXCHANGE_COLORS.text,
      fontSize: isMobile ? 10 : 12,
      fontFamily: "Inter, system-ui, sans-serif",
    },
    grid: {
      vertLines: { color: EXCHANGE_COLORS.grid },
      horzLines: { color: EXCHANGE_COLORS.grid },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: EXCHANGE_COLORS.crosshair, width: 1, style: 2, labelBackgroundColor: "#2b3139" },
      horzLine: { color: EXCHANGE_COLORS.crosshair, width: 1, style: 2, labelBackgroundColor: "#2b3139" },
    },
    rightPriceScale: {
      borderColor: EXCHANGE_COLORS.grid,
      scaleMargins: { top: 0.08, bottom: 0.22 },
    },
    timeScale: {
      borderColor: EXCHANGE_COLORS.grid,
      timeVisible: true,
      secondsVisible: Boolean(opts?.showSeconds),
      rightOffset: 6,
      barSpacing: isMobile ? 4 : 6,
      fixLeftEdge: true,
      fixRightEdge: true,
    },
  };
}

export function toChartTimeSec(ms: number): number {
  return Math.floor(ms / 1000);
}
