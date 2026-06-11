import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, CandlestickSeries, HistogramSeries, AreaSeries } from 'lightweight-charts'
import { fetchOhlcvBars, type ChartTimeframe } from '../utils/binanceKlines'
import { EXCHANGE_COLORS, exchangeChartOptions, toChartTimeSec } from '../utils/chartTheme'

interface PriceChartLWProps {
  symbol: string
  height?: number
  showVolume?: boolean
  timeframe?: ChartTimeframe
  chartType?: 'candlestick' | 'area'
}

export function PriceChartLW({
  symbol,
  height = 440,
  showVolume = true,
  timeframe = '1d',
  chartType = 'candlestick',
}: PriceChartLWProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchOhlcvBars(symbol, timeframe)
      .then((bars) => {
        if (cancelled || !chartContainerRef.current) return

        if (chartRef.current) {
          try {
            chartRef.current.remove()
          } catch {
            /* ignore */
          }
          chartRef.current = null
        }

        const containerWidth = chartContainerRef.current.clientWidth
        const chart = createChart(
          chartContainerRef.current,
          exchangeChartOptions(containerWidth, height, {
            showSeconds: timeframe === '1h' || timeframe === '4h',
          })
        )

        if (chartType === 'candlestick') {
          const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: EXCHANGE_COLORS.up,
            downColor: EXCHANGE_COLORS.down,
            borderUpColor: EXCHANGE_COLORS.up,
            borderDownColor: EXCHANGE_COLORS.down,
            wickUpColor: EXCHANGE_COLORS.up,
            wickDownColor: EXCHANGE_COLORS.down,
          })

          candleSeries.setData(
            bars.map((b) => ({
              time: toChartTimeSec(b.time) as never,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
            }))
          )

          if (showVolume) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
              priceFormat: { type: 'volume' },
              priceScaleId: '',
            })
            volumeSeries.priceScale().applyOptions({
              scaleMargins: { top: 0.82, bottom: 0 },
            })
            volumeSeries.setData(
              bars.map((b) => ({
                time: toChartTimeSec(b.time) as never,
                value: b.volume,
                color: b.close >= b.open ? `${EXCHANGE_COLORS.up}99` : `${EXCHANGE_COLORS.down}99`,
              }))
            )
          }
        } else {
          const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: EXCHANGE_COLORS.areaLine,
            topColor: EXCHANGE_COLORS.areaTop,
            bottomColor: EXCHANGE_COLORS.areaBottom,
            lineWidth: 2,
          })
          areaSeries.setData(
            bars.map((b) => ({
              time: toChartTimeSec(b.time) as never,
              value: b.close,
            }))
          )
          chart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.1, bottom: 0.08 },
          })
        }

        chart.timeScale().fitContent()
        chartRef.current = chart

        const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
          }
        }
        window.addEventListener('resize', handleResize)
        setLoading(false)

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить график')
        setLoading(false)
      })

    return () => {
      cancelled = true
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch {
          /* ignore */
        }
        chartRef.current = null
      }
    }
  }, [symbol, timeframe, chartType, showVolume, height, reloadKey])

  return (
    <div className="relative w-full">
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-[#1e2329]"
        style={{ height: `${height}px`, background: EXCHANGE_COLORS.bg }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/90 backdrop-blur-sm z-10">
            <div className="text-[#848e9c] text-xs md:text-sm">Загрузка свечей Binance…</div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e11] z-10">
            <div className="text-[#f6465d] text-sm mb-2">Ошибка загрузки</div>
            <div className="text-[#848e9c] text-xs text-center px-4">{error}</div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 px-4 py-2 bg-[#f0b90b] hover:bg-[#d9a60a] text-[#0b0e11] text-xs font-medium rounded transition-colors"
            >
              Повторить
            </button>
          </div>
        )}
      </div>
      {!loading && !error && (
        <p className="text-[#848e9c] text-[10px] mt-1.5 px-1">
          Данные: Binance / CoinGecko · {timeframe.toUpperCase()} · только просмотр
        </p>
      )}
    </div>
  )
}
