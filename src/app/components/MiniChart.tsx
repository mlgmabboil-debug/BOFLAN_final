'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, IChartApi, LineSeries } from 'lightweight-charts'
import { fetchOhlcvBars, type ChartTimeframe } from '../utils/binanceKlines'
import { EXCHANGE_COLORS, exchangeChartOptions, toChartTimeSec } from '../utils/chartTheme'

interface MiniChartProps {
  symbol: string
  height?: number
  width?: number
  timeframe?: ChartTimeframe
}

export function MiniChart({
  symbol,
  height = 120,
  width = 200,
  timeframe = '1d',
}: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchOhlcvBars(symbol, timeframe)
      .then((bars) => {
        if (cancelled || !chartContainerRef.current || bars.length === 0) return

        if (chartRef.current) {
          try {
            chartRef.current.remove()
          } catch {
            /* ignore */
          }
          chartRef.current = null
        }

        const containerWidth = chartContainerRef.current.clientWidth || width
        const chart = createChart(
          chartContainerRef.current,
          exchangeChartOptions(containerWidth, height, { transparent: true })
        )

        chart.applyOptions({
          grid: { vertLines: { visible: false }, horzLines: { visible: false } },
          crosshair: { mode: CrosshairMode.Hidden },
          rightPriceScale: { visible: false },
          timeScale: { visible: false },
        })

        const first = bars[0].close
        const last = bars[bars.length - 1].close
        const up = last >= first

        const lineSeries = chart.addSeries(LineSeries, {
          color: up ? EXCHANGE_COLORS.up : EXCHANGE_COLORS.down,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        })

        lineSeries.setData(
          bars.map((b) => ({
            time: toChartTimeSec(b.time) as never,
            value: b.close,
          }))
        )

        chart.timeScale().fitContent()
        chartRef.current = chart
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Ошибка')
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
  }, [symbol, timeframe, height, width])

  return (
    <div className="relative">
      <div
        ref={chartContainerRef}
        className="rounded-lg overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/60">
            <div className="text-[#848e9c] text-xs">…</div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]">
            <div className="text-[#f6465d]/70 text-xs">—</div>
          </div>
        )}
      </div>
    </div>
  )
}
