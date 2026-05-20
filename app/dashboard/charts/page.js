'use client';

import { useEffect, useRef, useState } from 'react';
import { market } from '../../../lib/api';
import { createChart } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';
import { sanitizeCandles, sanitizeVolume, sanitizeLine, sanitizeLinePoints } from '../../../lib/chartData';
import StockBrowsePanel from '../../../components/StockBrowsePanel';

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
];

const INDICATORS = [
  { id: 'sma20', label: 'SMA 20', color: '#f97316' },
  { id: 'sma50', label: 'SMA 50', color: '#8b5cf6' },
  { id: 'ema12', label: 'EMA 12', color: '#06b6d4' },
  { id: 'ema26', label: 'EMA 26', color: '#ec4899' },
];

export default function ChartsPage() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});

  const [symbol, setSymbol] = useState('RELIANCE');
  const [selectedExchange, setSelectedExchange] = useState('NSE');
  const [timeframe, setTimeframe] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('candlestick');
  const [quote, setQuote] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState(['sma20']);
  const [indicatorData, setIndicatorData] = useState(null);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const resizeHandlerRef = useRef(null);
  const loadRequestIdRef = useRef(0);

  const destroyChart = () => {
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current);
      resizeHandlerRef.current = null;
    }
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // chart may already be disposed
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    }
  };

  useEffect(() => {
    initChart();
    return () => destroyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  useEffect(() => {
    loadData();
    return () => {
      loadRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, selectedExchange, activeIndicators, chartType]);

  const initChart = () => {
    if (!chartContainerRef.current) return;

    destroyChart();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
      },
    });

    chartRef.current = chart;
    indicatorSeriesRef.current = {};

    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      lineSeriesRef.current = null;
    } else {
      lineSeriesRef.current = chart.addLineSeries({
        color: '#2563eb',
        lineWidth: 2,
      });
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    resizeHandlerRef.current = handleResize;
    window.addEventListener('resize', handleResize);
    handleResize();
  };

  const loadData = async () => {
    if (!symbol) return;
    if (!chartContainerRef.current) return;

    if (!chartRef.current) initChart();
    if (!chartRef.current) return;

    const requestId = ++loadRequestIdRef.current;
    const mode = chartType;
    setLoading(true);

    try {
      const [histRes, quoteRes, indicatorRes] = await Promise.all([
        market.getHistorical(symbol, timeframe),
        market.getQuote(symbol, selectedExchange),
        activeIndicators.length > 0
          ? market.getIndicators(symbol, timeframe, activeIndicators.join(','))
          : Promise.resolve({ data: null })
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      const histData = histRes.data || [];
      const candles = sanitizeCandles(histData);
      setQuote(quoteRes.data);
      setIndicatorData(indicatorRes.data);

      if (!chartRef.current || mode !== chartType) return;

      if (mode === 'candlestick' && candlestickSeriesRef.current) {
        if (candles.length === 0) return;
        candlestickSeriesRef.current.setData(candles);
        volumeSeriesRef.current?.setData(sanitizeVolume(candles));
      } else if (mode === 'line' && lineSeriesRef.current) {
        const lineData = sanitizeLine(histData);
        if (lineData.length === 0) return;
        lineSeriesRef.current.setData(lineData);
      }

      applyIndicatorSeries(indicatorRes.data, requestId);
      chartRef.current.timeScale().fitContent();
    } catch (err) {
      if (err.response?.status !== 429) {
        console.error(err);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const applyIndicatorSeries = (data, requestId) => {
    if (!chartRef.current || !data?.indicators) return;
    if (requestId != null && requestId !== loadRequestIdRef.current) return;

    Object.keys(indicatorSeriesRef.current).forEach((key) => {
      try {
        chartRef.current.removeSeries(indicatorSeriesRef.current[key]);
      } catch {
        // series may already be removed
      }
    });
    indicatorSeriesRef.current = {};

    const addIndicator = (id, color, title, points) => {
      if (!activeIndicators.includes(id)) return;
      const line = sanitizeLinePoints(points);
      if (line.length === 0) return;
      const series = chartRef.current.addLineSeries({ color, lineWidth: 2, title });
      series.setData(line);
      indicatorSeriesRef.current[id] = series;
    };

    addIndicator('sma20', '#f97316', 'SMA 20', data.indicators.sma20);
    addIndicator('sma50', '#8b5cf6', 'SMA 50', data.indicators.sma50);
    addIndicator('ema12', '#06b6d4', 'EMA 12', data.indicators.ema12);
    addIndicator('ema26', '#ec4899', 'EMA 26', data.indicators.ema26);
  };

  const toggleIndicator = (indicatorId) => {
    setActiveIndicators((prev) =>
      prev.includes(indicatorId) ? prev.filter((i) => i !== indicatorId) : [...prev, indicatorId]
    );
  };

  const handleSymbolSelect = (stock) => {
    setSymbol(stock.symbol);
    setSelectedExchange(stock.exchange || 'NSE');
  };

  const toggleChartType = (type) => {
    setChartType(type);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Charts</h1>
          <p className="text-gray-500">Analyze stock price movements</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <StockBrowsePanel
            onSelect={handleSymbolSelect}
            selectedSymbol={symbol}
            selectedExchange={selectedExchange}
          />
        </div>

        <div className="lg:col-span-9 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{symbol}</h2>
            <p className="text-sm text-gray-500">{selectedExchange}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark text-sm"
          >
            Refresh chart
          </button>
        </div>

                <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => toggleChartType('candlestick')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                chartType === 'candlestick' ? 'bg-white shadow text-groww-primary' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Candlestick
            </button>
            <button
              onClick={() => toggleChartType('line')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                chartType === 'line' ? 'bg-white shadow text-groww-primary' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Line
            </button>
          </div>

          <div className="flex gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  timeframe === tf.value ? 'bg-groww-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showIndicatorPanel ? 'bg-groww-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Indicators
          </button>
        </div>

        {showIndicatorPanel && (
          <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="w-full text-sm font-medium text-gray-600 mb-2">Moving Averages</p>
            {INDICATORS.map((ind) => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium border-2 transition ${
                  activeIndicators.includes(ind.id)
                    ? 'border-groww-primary bg-groww-primary-light text-groww-primary'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={activeIndicators.includes(ind.id) ? { borderColor: ind.color, color: ind.color } : {}}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activeIndicators.includes(ind.id) ? ind.color : '#9ca3af' }}
                  />
                  {ind.label}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative w-full h-96">
          <div ref={chartContainerRef} className="w-full h-96" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
            </div>
          )}
        </div>

        {quote && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { label: 'Last Price', value: `₹${quote.ltp?.toLocaleString()}` },
              { label: 'Change', value: `${quote.change >= 0 ? '+' : ''}${quote.change?.toFixed(2)} (${quote.changePercent?.toFixed(2)}%)` },
              { label: 'High', value: `₹${quote.high?.toLocaleString()}` },
              { label: 'Low', value: `₹${quote.low?.toLocaleString()}` },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`font-medium ${item.label === 'Change' ? (quote.change >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-800'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {indicatorData?.indicators && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Indicator Values</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {indicatorData.indicators.sma20?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">SMA 20</p>
                  <p className="font-medium text-orange-500">₹{indicatorData.indicators.sma20[indicatorData.indicators.sma20.length - 1]?.value?.toFixed(2)}</p>
                </div>
              )}
              {indicatorData.indicators.sma50?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">SMA 50</p>
                  <p className="font-medium text-purple-500">₹{indicatorData.indicators.sma50[indicatorData.indicators.sma50.length - 1]?.value?.toFixed(2)}</p>
                </div>
              )}
              {indicatorData.indicators.ema12?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">EMA 12</p>
                  <p className="font-medium text-cyan-500">₹{indicatorData.indicators.ema12[indicatorData.indicators.ema12.length - 1]?.value?.toFixed(2)}</p>
                </div>
              )}
              {indicatorData.indicators.ema26?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">EMA 26</p>
                  <p className="font-medium text-pink-500">₹{indicatorData.indicators.ema26[indicatorData.indicators.ema26.length - 1]?.value?.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}