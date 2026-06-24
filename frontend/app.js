let state = {
    activeStock: null,
    activePeriod: '1y',
    watchlist: JSON.parse(localStorage.getItem('watchlist')) || ['AAPL', '005930.KS', 'TSLA', '000660.KS'],
    portfolio: JSON.parse(localStorage.getItem('portfolio')) || [],
    marketData: [],
    
    // Real-time Simulation Engine Data
    watchlistCachedData: [],
    portfolioCachedData: [],
    activeHistory: [],
    activeStockPrevClose: 0,
    tickIntervalId: null
};

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const marketOverview = document.getElementById('market-overview');
const timeframeBtns = document.querySelectorAll('.timeframe-btn');

// Active Stock DOM Elements
const activeName = document.getElementById('active-name');
const activeTicker = document.getElementById('active-ticker');
const activePrice = document.getElementById('active-price');
const activeChange = document.getElementById('active-change');
const watchlistToggle = document.getElementById('btn-watchlist-toggle');

// Metrics DOM Elements
const metricMarketCap = document.getElementById('metric-market-cap');
const metricPE = document.getElementById('metric-pe');
const metricPB = document.getElementById('metric-pb');
const metricDividend = document.getElementById('metric-dividend');
const metric52Week = document.getElementById('metric-52week');
const activeSummary = document.getElementById('active-summary');
const newsContainer = document.getElementById('news-container');

// Watchlist & Portfolio DOM
const watchlistContainer = document.getElementById('watchlist-container');
const portfolioContainer = document.getElementById('portfolio-container');
const portfolioTotalValue = document.getElementById('portfolio-total-value');
const portfolioTotalReturn = document.getElementById('portfolio-total-return');

// Dialogs DOM
const compareDialog = document.getElementById('compare-dialog');
const btnCompareOpen = document.getElementById('btn-compare-open');
const btnCompareClose = document.getElementById('btn-compare-close');
const compareTicker1 = document.getElementById('compare-ticker-1');
const compareTicker2 = document.getElementById('compare-ticker-2');
const compareSearchResults = document.getElementById('compare-search-results');
const comparePlaceholder = document.getElementById('compare-placeholder');
const compareChartDiv = document.getElementById('compare-chart');
const compareDataTable = document.getElementById('compare-data-table');

const portfolioDialog = document.getElementById('portfolio-dialog');
const btnPortfolioAdd = document.getElementById('btn-portfolio-add');
const btnPortfolioClose = document.getElementById('btn-portfolio-close');
const portfolioForm = document.getElementById('portfolio-form');
const portTickerInput = document.getElementById('port-ticker');
const portPriceInput = document.getElementById('port-price');
const portQtyInput = document.getElementById('port-qty');
const btnPortCancel = document.getElementById('btn-port-cancel');

// Charts variables
let mainChart = null;
let candlestickSeries = null;
let volumeSeries = null;
let ma5Series = null;
let ma20Series = null;
let ma60Series = null;
let ma120Series = null;

let compareChart = null;
let compareSeries1 = null;
let compareSeries2 = null;

const API_BASE = '';

// Helper: Formatting numbers
function formatCurrency(val, currency = 'USD') {
    if (val === null || val === undefined) return '-';
    
    if (currency === 'KRW' || currency === '원') {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
    }
    
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
}

function formatLargeNumber(val, currency = 'USD') {
    if (val === null || val === undefined) return '-';
    
    if (currency === 'KRW') {
        const trillion = Math.floor(val / 1000000000000);
        const billion = Math.floor((val % 1000000000000) / 100000000);
        if (trillion > 0) {
            return `${trillion}조 ${billion > 0 ? billion + '억' : ''} 원`;
        }
        return `${billion}억 원`;
    } else {
        if (val >= 1e12) {
            return (val / 1e12).toFixed(2) + ' T';
        } else if (val >= 1e9) {
            return (val / 1e9).toFixed(2) + ' B';
        } else if (val >= 1e6) {
            return (val / 1e6).toFixed(2) + ' M';
        }
        return val.toLocaleString();
    }
}

function formatPercent(val) {
    if (val === null || val === undefined) return '-';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
}

// ----------------------
// Charts Initialization
// ----------------------
function initMainChart() {
    const chartDiv = document.getElementById('stock-chart');
    
    if (typeof LightweightCharts === 'undefined') {
        console.error("LightweightCharts is not loaded.");
        chartDiv.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:0.875rem;">차트 라이브러리를 로드하지 못했습니다. 오프라인 상태이거나 파일 경로를 확인해 주세요.</div>';
        return;
    }
    
    mainChart = LightweightCharts.createChart(chartDiv, {
        layout: {
            backgroundColor: '#0b0f19',
            textColor: '#94a3b8',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        priceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    candlestickSeries = mainChart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderDownColor: '#f43f5e',
        borderUpColor: '#10b981',
        wickDownColor: '#f43f5e',
        wickUpColor: '#10b981',
    });

    ma5Series = mainChart.addLineSeries({
        color: '#ffc107',
        lineWidth: 1.2,
        title: 'MA5',
    });
    ma20Series = mainChart.addLineSeries({
        color: '#e040fb',
        lineWidth: 1.2,
        title: 'MA20',
    });
    ma60Series = mainChart.addLineSeries({
        color: '#00e5ff',
        lineWidth: 1.2,
        title: 'MA60',
    });
    ma120Series = mainChart.addLineSeries({
        color: '#3f51b5',
        lineWidth: 1.2,
        title: 'MA120',
    });

    volumeSeries = mainChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
    });

    mainChart.priceScale('').applyOptions({
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });

    const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || !mainChart) return;
        const { width, height } = entries[0].contentRect;
        mainChart.resize(width, height);
    });
    resizeObserver.observe(chartDiv);
}

// ----------------------
// Load Stock Data
// ----------------------
async function loadStock(ticker) {
    const loader = document.getElementById('chart-loader');
    try {
        if (loader) loader.classList.remove('hidden');
        
        // 1. Fetch Stock Info
        const infoRes = await fetch(`${API_BASE}/api/stock/${ticker}/info`);
        const info = await infoRes.json();
        
        if (info.error && !info.currentPrice) {
            alert(`주식 정보를 불러올 수 없습니다: ${ticker}`);
            if (loader) loader.classList.add('hidden');
            return;
        }

        state.activeStock = info;
        state.activeStockPrevClose = (info.currentPrice || 0) - (info.change || 0);
        
        // Update header UI
        activeName.innerText = info.name;
        activeTicker.innerText = info.ticker;
        
        if (info.currentPrice) {
            activePrice.innerText = formatCurrency(info.currentPrice, info.currency);
            const isPos = info.changePercent > 0;
            const changeClass = isPos ? 'positive' : (info.changePercent < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (info.changePercent < 0 ? '▼' : '');
            activeChange.innerHTML = `<span class="${changeClass}">${arrow} ${formatCurrency(Math.abs(info.change), info.currency)} (${formatPercent(info.changePercent)})</span>`;
        } else {
            activePrice.innerText = '-';
            activeChange.innerText = '-';
        }
        
        updateWatchlistButtonState();

        // Update metrics
        metricMarketCap.innerText = formatLargeNumber(info.marketCap, info.currency);
        metricPE.innerText = info.peRatio ? `${info.peRatio}x` : 'N/A';
        metricPB.innerText = info.pbRatio ? `${info.pbRatio}x` : 'N/A';
        metricDividend.innerText = info.dividendYield ? `${info.dividendYield}%` : '0.00%';
        
        if (info.fiftyTwoWeekHigh) {
            const high = formatCurrency(info.fiftyTwoWeekHigh, info.currency);
            const low = formatCurrency(info.fiftyTwoWeekLow, info.currency);
            metric52Week.innerText = `${high} / ${low}`;
        } else {
            metric52Week.innerText = '-';
        }
        
        activeSummary.innerText = info.summary;

        // 2. Fetch Chart History
        const histRes = await fetch(`${API_BASE}/api/stock/${ticker}/history?period=${state.activePeriod}`);
        const historyData = await histRes.json();
        
        const candles = historyData.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));
        
        const volumes = historyData.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'
        }));

        if (mainChart) {
            candlestickSeries.setData(candles);
            volumeSeries.setData(volumes);

            ma5Series.setData(historyData.map(d => ({ time: d.time, value: d.ma5 })).filter(d => d.value !== null));
            ma20Series.setData(historyData.map(d => ({ time: d.time, value: d.ma20 })).filter(d => d.value !== null));
            ma60Series.setData(historyData.map(d => ({ time: d.time, value: d.ma60 })).filter(d => d.value !== null));
            ma120Series.setData(historyData.map(d => ({ time: d.time, value: d.ma120 })).filter(d => d.value !== null));

            mainChart.timeScale().fitContent();
        }

        // 3. Load News & Sentiments
        loadNews(info.name, info.sector || '주식', info.industry || '시장');

        state.activeHistory = historyData;
        startTickSimulator();

        if (loader) loader.classList.add('hidden');

    } catch (e) {
        console.error("Error loading stock:", e);
        if (loader) loader.classList.add('hidden');
    }
}

// ----------------------
// Real-time Tick Simulator & Cache Synchronization
// ----------------------
function updatePriceInAllCaches(ticker, newPrice, delta) {
    const isUp = delta >= 0;

    // 1. Update in activeStock if matches
    if (state.activeStock && state.activeStock.ticker === ticker) {
        state.activeStock.currentPrice = newPrice;
        state.activeStock.change = newPrice - state.activeStockPrevClose;
        state.activeStock.changePercent = (state.activeStock.change / state.activeStockPrevClose) * 100;
        
        // Update active UI
        if (activePrice) {
            activePrice.innerText = formatCurrency(newPrice, state.activeStock.currency);
            activePrice.classList.remove('flash-up-anim', 'flash-down-anim');
            void activePrice.offsetWidth; // force reflow
            activePrice.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
        }
        if (activeChange) {
            const isPos = state.activeStock.changePercent > 0;
            const changeClass = isPos ? 'positive' : (state.activeStock.changePercent < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (state.activeStock.changePercent < 0 ? '▼' : '');
            activeChange.innerHTML = `<span class="${changeClass}">${arrow} ${formatCurrency(Math.abs(state.activeStock.change), state.activeStock.currency)} (${formatPercent(state.activeStock.changePercent)})</span>`;
        }
        
        // Update metrics (Market Cap)
        if (state.activeStock.marketCap) {
            state.activeStock.marketCap = state.activeStock.marketCap * (1 + delta);
            if (metricMarketCap) {
                metricMarketCap.innerText = formatLargeNumber(state.activeStock.marketCap, state.activeStock.currency);
            }
        }

        // Update chart
        if (mainChart && candlestickSeries && state.activeHistory && state.activeHistory.length > 0) {
            const lastBar = state.activeHistory[state.activeHistory.length - 1];
            lastBar.close = newPrice;
            lastBar.high = Math.max(lastBar.high, newPrice);
            lastBar.low = Math.min(lastBar.low, newPrice);
            candlestickSeries.update({
                time: lastBar.time,
                open: lastBar.open,
                high: lastBar.high,
                low: lastBar.low,
                close: lastBar.close
            });
        }
    }

    // 2. Update in watchlist cache
    if (state.watchlistCachedData && state.watchlistCachedData.length > 0) {
        const idx = state.watchlistCachedData.findIndex(s => s.ticker === ticker);
        if (idx > -1) {
            const item = state.watchlistCachedData[idx];
            const prevClose = item.currentPrice - item.change;
            item.currentPrice = newPrice;
            item.change = newPrice - prevClose;
            item.changePercent = (item.change / prevClose) * 100;
            renderWatchlistFromCache(idx, isUp);
        }
    }

    // 3. Update in portfolio cache
    if (state.portfolioCachedData && state.portfolioCachedData.length > 0) {
        const idx = state.portfolioCachedData.findIndex(s => s.ticker === ticker);
        if (idx > -1) {
            const item = state.portfolioCachedData[idx];
            const prevClose = item.currentPrice - item.change;
            item.currentPrice = newPrice;
            item.change = newPrice - prevClose;
            item.changePercent = (item.change / prevClose) * 100;
            renderPortfolioFromCache(ticker, isUp);
        }
    }
}

function startTickSimulator() {
    // Clear any existing simulator interval
    if (state.tickIntervalId) {
        clearInterval(state.tickIntervalId);
        state.tickIntervalId = null;
    }

    // Set up tick simulation running every 2.5 seconds
    state.tickIntervalId = setInterval(() => {
        // 1. Simulate tick for activeStock
        if (state.activeStock && state.activeStock.currentPrice) {
            const ticker = state.activeStock.ticker;
            const delta = (Math.random() - 0.5) * 0.0015; // Random fluctuation up to ±0.075%
            const newPrice = state.activeStock.currentPrice * (1 + delta);
            updatePriceInAllCaches(ticker, newPrice, delta);
        }

        // 2. Simulate tick for a random Watchlist item (excluding the active stock if it was already updated)
        if (state.watchlistCachedData && state.watchlistCachedData.length > 0) {
            // 70% chance to tick a watchlist item
            if (Math.random() < 0.7) {
                const candidates = state.watchlistCachedData.filter(s => !state.activeStock || s.ticker !== state.activeStock.ticker);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    const delta = (Math.random() - 0.5) * 0.0015;
                    const newPrice = target.currentPrice * (1 + delta);
                    updatePriceInAllCaches(target.ticker, newPrice, delta);
                }
            }
        }

        // 3. Simulate tick for a random Portfolio item (excluding the active stock)
        if (state.portfolioCachedData && state.portfolioCachedData.length > 0) {
            // 70% chance to tick a portfolio item
            if (Math.random() < 0.7) {
                const candidates = state.portfolioCachedData.filter(s => !state.activeStock || s.ticker !== state.activeStock.ticker);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    const delta = (Math.random() - 0.5) * 0.0015;
                    const newPrice = target.currentPrice * (1 + delta);
                    updatePriceInAllCaches(target.ticker, newPrice, delta);
                }
            }
        }
    }, 2500);
}


// ----------------------
// Load News & Sentiment
// ----------------------
function loadNews(companyName, sector, industry) {
    const templates = [
        {
            title: `[분석] ${companyName}, ${sector} 분야에서의 점유율 확대와 성장 전망`,
            summary: `최근 보고서에 따르면 ${companyName}은/는 지속적인 연구 개발 투자와 안정적인 시장 수급을 바탕으로 동종 업계 경쟁사들 대비 우수한 성과를 보이고 있습니다.`,
            sentiment: 'pos'
        },
        {
            title: `시장 전문가, ${companyName}의 단기 Valuation 부담 완화 분석 발표`,
            summary: `금리 정책 안정과 자산 구조 재조정에 따라 ${companyName}의 주가수익비율(PER) 부담이 낮아졌으며, 장기 투자 매력도가 높아지고 있다는 분석입니다.`,
            sentiment: 'pos'
        },
        {
            title: `글로벌 거시 경제 불확실성에 따른 ${companyName}의 헤지 방안과 실적 변수`,
            summary: `인플레이션과 원자재 공급망 이슈가 해소되면서 ${industry} 전반의 회복세가 돋보이나, 여전히 하반기 환율 변동에 대한 세밀한 모니터링이 필요한 시점입니다.`,
            sentiment: 'neu'
        },
        {
            title: `${companyName}, 신규 분기 실적 가이드라인 달성 가능성은?`,
            summary: `증권사 애널리스트들은 ${companyName}의 분기 영업 이익이 시장 기대치(컨센서스)에 부합할 것으로 보고 있으며 배당 증가 여부에 초점을 맞추고 있습니다.`,
            sentiment: 'neu'
        },
        {
            title: `[우려] ${industry} 산업 규제 리스크 증가에 따른 ${companyName}의 하방 압력`,
            summary: `각국 정부의 규제 수위 확대 및 유동성 축소 움직임으로 인해 ${companyName}의 단기 수익성 둔화 및 재무 비용 증가 우려가 제기되고 있습니다.`,
            sentiment: 'neg'
        }
    ];

    newsContainer.innerHTML = '';
    const chosen = templates.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    chosen.forEach(item => {
        let badgeText = '중립';
        let badgeClass = 'sentiment-neu';
        if (item.sentiment === 'pos') {
            badgeText = '호재 (Positive)';
            badgeClass = 'sentiment-pos';
        } else if (item.sentiment === 'neg') {
            badgeText = '악재 (Negative)';
            badgeClass = 'sentiment-neg';
        }

        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-meta">
                <span>경제연합뉴스</span>
                <span class="sentiment-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="news-title">${item.title}</div>
            <div class="news-summary">${item.summary}</div>
        `;
        newsContainer.appendChild(card);
    });
}

// ----------------------
// Market Indices Overview
// ----------------------
async function loadMarketOverview() {
    try {
        const res = await fetch(`${API_BASE}/api/market-overview`);
        const data = await res.json();
        
        marketOverview.innerHTML = '';
        data.forEach(item => {
            const isPos = item.changePercent > 0;
            const changeClass = isPos ? 'positive' : (item.changePercent < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (item.changePercent < 0 ? '▼' : '');
            
            const card = document.createElement('div');
            card.className = 'index-card';
            card.innerHTML = `
                <div class="index-name">${item.name}</div>
                <div class="index-price">${formatCurrency(item.price, item.currency)}</div>
                <div class="index-change ${changeClass}">${arrow} ${formatCurrency(Math.abs(item.change), item.currency)} (${formatPercent(item.changePercent)})</div>
            `;
            
            card.onclick = () => loadStock(item.ticker);
            marketOverview.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading market overview:", e);
    }
}

// ----------------------
// Search Autocomplete
// ----------------------
let searchTimeout = null;

function setupSearch(inputEl, resultsEl, onClickCallback) {
    inputEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = inputEl.value.trim();
        
        if (query.length === 0) {
            resultsEl.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                if (data.length === 0) {
                    resultsEl.innerHTML = '<div style="padding:10px; color:var(--text-muted); font-size:0.875rem;">검색 결과가 없습니다.</div>';
                    resultsEl.style.display = 'block';
                    return;
                }

                resultsEl.innerHTML = '';
                data.slice(0, 8).forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'search-item';
                    itemEl.innerHTML = `
                        <div>
                            <span class="ticker">${item.ticker}</span>
                            <span class="name">${item.name}</span>
                        </div>
                        <span class="exchange">${item.exchange || 'EQUITY'}</span>
                    `;
                    itemEl.onclick = () => {
                        onClickCallback(item);
                        resultsEl.style.display = 'none';
                        inputEl.value = '';
                    };
                    resultsEl.appendChild(itemEl);
                });
                resultsEl.style.display = 'block';
            } catch (e) {
                console.error("Search error:", e);
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
            resultsEl.style.display = 'none';
        }
    });
}

// ----------------------
// Watchlist Logic (Optimized Batch Mode)
// ----------------------
function updateWatchlistButtonState() {
    if (!state.activeStock) return;
    const ticker = state.activeStock.ticker;
    const exists = state.watchlist.includes(ticker);
    
    if (exists) {
        watchlistToggle.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            관심 해제
        `;
        watchlistToggle.style.background = 'rgba(99, 102, 241, 0.2)';
        watchlistToggle.style.borderColor = 'var(--accent-primary)';
    } else {
        watchlistToggle.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            관심 등록
        `;
        watchlistToggle.style.background = 'rgba(255, 255, 255, 0.05)';
        watchlistToggle.style.borderColor = 'var(--border-color)';
    }
}

async function renderWatchlist() {
    watchlistContainer.innerHTML = '';
    
    if (state.watchlist.length === 0) {
        watchlistContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">관심 등록된 주식이 없습니다.</div>';
        return;
    }

    try {
        const tickersQuery = state.watchlist.join(',');
        const res = await fetch(`${API_BASE}/api/stocks/info?tickers=${encodeURIComponent(tickersQuery)}`);
        const stocks = await res.json();
        
        state.watchlistCachedData = stocks;
        renderWatchlistFromCache();
    } catch (e) {
        console.error("Watchlist render error:", e);
        watchlistContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">데이터를 불러오는 데 실패했습니다.</div>';
    }
}

function renderWatchlistFromCache(flashIdx = -1, isUp = true) {
    watchlistContainer.innerHTML = '';
    
    if (!state.watchlistCachedData || state.watchlistCachedData.length === 0) {
        watchlistContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">관심 등록된 주식이 없습니다.</div>';
        return;
    }

    state.watchlistCachedData.forEach((info, idx) => {
        if (info.error && !info.currentPrice) {
            info.currentPrice = 0.0;
        }

        const isPos = info.changePercent > 0;
        const changeClass = isPos ? 'positive' : (info.changePercent < 0 ? 'negative' : 'neutral');
        const arrow = isPos ? '▲' : (info.changePercent < 0 ? '▼' : '');

        const item = document.createElement('div');
        item.className = 'watchlist-item';
        
        if (idx === flashIdx) {
            item.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
        }

        item.innerHTML = `
            <div class="watchlist-item-left">
                <span style="font-weight:700;">${info.ticker}</span>
                <span style="font-size:0.75rem; color:var(--text-secondary); max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${info.name}</span>
            </div>
            <div class="watchlist-item-right">
                <span style="font-weight:600; font-size:0.95rem;">${info.currentPrice > 0 ? formatCurrency(info.currentPrice, info.currency) : '-'}</span>
                <span class="${changeClass}" style="font-size:0.75rem; font-weight:600;">${arrow}${formatPercent(Math.abs(info.changePercent))}</span>
            </div>
        `;
        item.onclick = () => loadStock(info.ticker);
        watchlistContainer.appendChild(item);
    });
}

watchlistToggle.onclick = () => {
    if (!state.activeStock) return;
    const ticker = state.activeStock.ticker;
    const idx = state.watchlist.indexOf(ticker);
    
    if (idx > -1) {
        state.watchlist.splice(idx, 1);
    } else {
        state.watchlist.push(ticker);
    }
    
    localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
    updateWatchlistButtonState();
    renderWatchlist();
};

// ----------------------
// Portfolio Logic (Optimized Batch Mode)
// ----------------------
async function renderPortfolio() {
    portfolioContainer.innerHTML = '';
    
    if (state.portfolio.length === 0) {
        portfolioContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">등록된 자산이 없습니다.</div>';
        portfolioTotalValue.innerText = '$0.00';
        portfolioTotalReturn.innerText = '0%';
        portfolioTotalReturn.className = 'portfolio-return neutral';
        return;
    }

    try {
        const tickersQuery = state.portfolio.map(item => item.ticker).join(',');
        const res = await fetch(`${API_BASE}/api/stocks/info?tickers=${encodeURIComponent(tickersQuery)}`);
        const stocks = await res.json();
        
        state.portfolioCachedData = stocks;
        renderPortfolioFromCache();
    } catch (e) {
        console.error("Portfolio render error:", e);
    }
}

function renderPortfolioFromCache(flashTicker = null, isUp = true) {
    portfolioContainer.innerHTML = '';
    
    if (state.portfolio.length === 0 || !state.portfolioCachedData || state.portfolioCachedData.length === 0) {
        portfolioContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">등록된 자산이 없습니다.</div>';
        portfolioTotalValue.innerText = '$0.00';
        portfolioTotalReturn.innerText = '0%';
        portfolioTotalReturn.className = 'portfolio-return neutral';
        return;
    }

    let totalInvested = 0;
    let totalCurrent = 0;
    let mainCurrency = 'USD';

    state.portfolio.forEach(asset => {
        const info = state.portfolioCachedData.find(s => s.ticker === asset.ticker);
        if (!info) return;

        const currentPrice = info.currentPrice || asset.price;
        const assetTotalInvested = asset.price * asset.qty;
        const assetTotalCurrent = currentPrice * asset.qty;
        const assetReturn = ((assetTotalCurrent - assetTotalInvested) / assetTotalInvested) * 100;
        
        totalInvested += assetTotalInvested;
        totalCurrent += assetTotalCurrent;
        mainCurrency = info.currency || mainCurrency;

        const isPos = assetReturn > 0;
        const changeClass = isPos ? 'positive' : (assetReturn < 0 ? 'negative' : 'neutral');
        const arrow = isPos ? '▲' : (assetReturn < 0 ? '▼' : '');

        const item = document.createElement('div');
        item.className = 'portfolio-item';
        
        if (asset.ticker === flashTicker) {
            item.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
        }

        item.innerHTML = `
            <div style="display:flex; flex-direction:column; flex:1;">
                <span style="font-weight:700;">${asset.ticker}</span>
                <span style="font-size:0.75rem; color:var(--text-secondary);">${asset.qty}주 (평단: ${formatCurrency(asset.price, info.currency)})</span>
            </div>
            <div style="text-align:right; display:flex; flex-direction:column; margin-right:8px;">
                <span style="font-weight:600;">${formatCurrency(assetTotalCurrent, info.currency)}</span>
                <span class="${changeClass}" style="font-size:0.75rem; font-weight:600;">
                    ${arrow}${formatPercent(Math.abs(assetReturn))}
                </span>
            </div>
            <button class="dialog-close" onclick="removePortfolioAsset('${asset.ticker}')" style="font-size:1.1rem; color:var(--text-muted); border:none; background:none; cursor:pointer; padding:4px;">&times;</button>
        `;
        portfolioContainer.appendChild(item);
    });

    const totalReturnPercent = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
    portfolioTotalValue.innerText = formatCurrency(totalCurrent, mainCurrency);
    portfolioTotalReturn.innerText = formatPercent(totalReturnPercent);
    portfolioTotalReturn.className = `portfolio-return ${totalReturnPercent > 0 ? 'positive' : (totalReturnPercent < 0 ? 'negative' : 'neutral')}`;
}

window.removePortfolioAsset = function(ticker) {
    state.portfolio = state.portfolio.filter(item => item.ticker !== ticker);
    localStorage.setItem('portfolio', JSON.stringify(state.portfolio));
    renderPortfolio();
};

btnPortfolioAdd.onclick = () => {
    if (!state.activeStock) {
        alert("먼저 추가할 주식을 검색해 주세요.");
        return;
    }
    portTickerInput.value = state.activeStock.ticker;
    portPriceInput.value = state.activeStock.currentPrice || 0;
    portQtyInput.value = 1;
    portfolioDialog.showModal();
};

btnPortfolioClose.onclick = () => portfolioDialog.close();
btnPortCancel.onclick = () => portfolioDialog.close();

portfolioForm.onsubmit = (e) => {
    e.preventDefault();
    const ticker = portTickerInput.value;
    const price = parseFloat(portPriceInput.value);
    const qty = parseFloat(portQtyInput.value);

    if (price <= 0 || qty <= 0) return;

    const existing = state.portfolio.find(item => item.ticker === ticker);
    if (existing) {
        const totalQty = existing.qty + qty;
        const totalCost = (existing.price * existing.qty) + (price * qty);
        existing.price = totalCost / totalQty;
        existing.qty = totalQty;
    } else {
        state.portfolio.push({ ticker, price, qty });
    }

    localStorage.setItem('portfolio', JSON.stringify(state.portfolio));
    portfolioDialog.close();
    renderPortfolio();
};

// ----------------------
// Stock Comparison Logic
// ----------------------
btnCompareOpen.onclick = () => {
    if (!state.activeStock) return;
    compareTicker1.value = state.activeStock.ticker;
    compareTicker2.value = '';
    
    comparePlaceholder.style.display = 'block';
    compareChartDiv.style.display = 'none';
    compareDataTable.style.display = 'none';
    
    compareDialog.showModal();
};

btnCompareClose.onclick = () => {
    if (compareChart) {
        compareChart.remove();
        compareChart = null;
    }
    compareDialog.close();
};

setupSearch(compareTicker2, compareSearchResults, async (item) => {
    compareTicker2.value = item.ticker;
    await runComparison(state.activeStock.ticker, item.ticker);
});

async function runComparison(ticker1, ticker2) {
    try {
        comparePlaceholder.style.display = 'none';
        
        const res = await fetch(`${API_BASE}/api/compare?tickers=${ticker1},${ticker2}`);
        const data = await res.json();
        
        const s1 = data[ticker1];
        const s2 = data[ticker2];
        
        if (!s1 || !s2) {
            alert("두 주식의 비교 데이터를 가져올 수 없습니다.");
            comparePlaceholder.style.display = 'block';
            return;
        }

        document.getElementById('compare-name-1').innerText = s1.name;
        document.getElementById('compare-name-2').innerText = s2.name;

        document.getElementById('comp-cap-1').innerText = formatLargeNumber(s1.marketCap, s1.currency);
        document.getElementById('comp-cap-2').innerText = formatLargeNumber(s2.marketCap, s2.currency);

        document.getElementById('comp-pe-1').innerText = s1.peRatio ? `${s1.peRatio}x` : 'N/A';
        document.getElementById('comp-pe-2').innerText = s2.peRatio ? `${s2.peRatio}x` : 'N/A';

        document.getElementById('comp-pb-1').innerText = s1.pbRatio ? `${s1.pbRatio}x` : 'N/A';
        document.getElementById('comp-pb-2').innerText = s2.pbRatio ? `${s2.pbRatio}x` : 'N/A';

        const d1 = s1.dividendYield ? `${(s1.dividendYield).toFixed(2)}%` : '0.00%';
        const d2 = s2.dividendYield ? `${(s2.dividendYield).toFixed(2)}%` : '0.00%';
        document.getElementById('comp-div-1').innerText = d1;
        document.getElementById('comp-div-2').innerText = d2;

        compareDataTable.style.display = 'table';

        if (typeof LightweightCharts !== 'undefined') {
            compareChartDiv.style.display = 'block';
            if (compareChart) {
                compareChart.remove();
            }

            compareChart = LightweightCharts.createChart(compareChartDiv, {
                layout: {
                    backgroundColor: '#1e293b',
                    textColor: '#94a3b8',
                    fontSize: 11,
                    fontFamily: 'Inter, sans-serif',
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                priceScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                timeScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                },
            });

            compareSeries1 = compareChart.addLineSeries({
                color: '#6366f1',
                lineWidth: 2,
                title: ticker1,
            });

            compareSeries2 = compareChart.addLineSeries({
                color: '#10b981',
                lineWidth: 2,
                title: ticker2,
            });

            compareSeries1.setData(s1.data);
            compareSeries2.setData(s2.data);
            
            compareChart.timeScale().fitContent();
        } else {
            compareChartDiv.style.display = 'none';
        }

    } catch (e) {
        console.error("Comparison failed:", e);
    }
}

// ----------------------
// Timeframe Selection
// ----------------------
timeframeBtns.forEach(btn => {
    btn.onclick = (e) => {
        timeframeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        state.activePeriod = e.target.dataset.period;
        if (state.activeStock) {
            loadStock(state.activeStock.ticker);
        }
    };
});

// ----------------------
// Theme Toggle Logic (Light / Dark Mode)
// ----------------------
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (theme === 'light') {
            // Moon icon
            themeIcon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        } else {
            // Sun icon
            themeIcon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        }
    }
    
    // Dynamically apply styles to TradingView Chart
    if (mainChart) {
        mainChart.applyOptions({
            layout: {
                backgroundColor: theme === 'dark' ? '#0b0f19' : '#ffffff',
                textColor: theme === 'dark' ? '#94a3b8' : '#475569',
            },
            grid: {
                vertLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)' },
                horzLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)' },
            }
        });
    }

    if (compareChart) {
        compareChart.applyOptions({
            layout: {
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                textColor: theme === 'dark' ? '#94a3b8' : '#475569',
            },
            grid: {
                vertLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)' },
                horzLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)' },
            }
        });
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.onclick = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        };
    }
}

// ----------------------
// Initial Startup
// ----------------------
window.onload = async () => {
    initMainChart();
    initTheme();
    
    setupSearch(searchInput, searchResults, (item) => {
        loadStock(item.ticker);
    });

    // Load initial data
    await loadMarketOverview();
    await renderWatchlist();
    await renderPortfolio();

    // Default load AAPL
    await loadStock('AAPL');

    // Periodic market data refresh (every 1 minute)
    setInterval(loadMarketOverview, 60000);
};
