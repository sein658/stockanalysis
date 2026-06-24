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
            background: { type: 'solid', color: '#0b0f19' },
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
        loadNews(ticker, info.name, info.sector || '주식', info.industry || '시장');

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

function getMarketForTicker(ticker) {
    if (!ticker) return 'US';
    const upper = ticker.toUpperCase();
    if (upper.endsWith('.KS') || upper.endsWith('.KQ') || upper.startsWith('^KS') || upper.startsWith('^KQ')) {
        return 'KR';
    }
    return 'US';
}

function startTickSimulator() {
    // Clear any existing simulator interval
    if (state.tickIntervalId) {
        clearInterval(state.tickIntervalId);
        state.tickIntervalId = null;
    }

    // Set up tick simulation running every 1.5 seconds for a live feel
    state.tickIntervalId = setInterval(() => {
        const marketStatus = getMarketStatus();
        const krOpen = marketStatus.kr.phase !== 'closed';
        const usOpen = marketStatus.us.phase !== 'closed';

        // 1. Simulate tick for activeStock
        if (state.activeStock && state.activeStock.currentPrice) {
            const ticker = state.activeStock.ticker;
            const market = getMarketForTicker(ticker);
            const isMarketOpen = (market === 'KR' && krOpen) || (market === 'US' && usOpen);

            if (isMarketOpen) {
                const delta = (Math.random() - 0.5) * 0.0016; // Random fluctuation up to ±0.08%
                const newPrice = state.activeStock.currentPrice * (1 + delta);
                updatePriceInAllCaches(ticker, newPrice, delta);
            }
        }

        // 2. Simulate tick for a random Watchlist item (excluding active)
        if (state.watchlistCachedData && state.watchlistCachedData.length > 0) {
            if (Math.random() < 0.8) {
                const candidates = state.watchlistCachedData.filter(s => {
                    const market = getMarketForTicker(s.ticker);
                    const isMarketOpen = (market === 'KR' && krOpen) || (market === 'US' && usOpen);
                    return isMarketOpen && (!state.activeStock || s.ticker !== state.activeStock.ticker);
                });
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    const idx = state.watchlistCachedData.findIndex(s => s.ticker === target.ticker);
                    if (idx > -1) {
                        const delta = (Math.random() - 0.5) * 0.0016;
                        const newPrice = target.currentPrice * (1 + delta);
                        updatePriceInAllCaches(target.ticker, newPrice, delta);
                    }
                }
            }
        }

        // 3. Simulate tick for a random Portfolio item (excluding active)
        if (state.portfolioCachedData && state.portfolioCachedData.length > 0) {
            if (Math.random() < 0.8) {
                const candidates = state.portfolioCachedData.filter(s => {
                    const market = getMarketForTicker(s.ticker);
                    const isMarketOpen = (market === 'KR' && krOpen) || (market === 'US' && usOpen);
                    return isMarketOpen && (!state.activeStock || s.ticker !== state.activeStock.ticker);
                });
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    const delta = (Math.random() - 0.5) * 0.0016;
                    const newPrice = target.currentPrice * (1 + delta);
                    updatePriceInAllCaches(target.ticker, newPrice, delta);
                }
            }
        }

        // 4. Simulate tick for a random Market Overview index
        if (state.marketData && state.marketData.length > 0) {
            if (Math.random() < 0.8) {
                const candidates = state.marketData.map((item, idx) => ({ item, idx })).filter(c => {
                    const market = getMarketForTicker(c.item.ticker);
                    return (market === 'KR' && krOpen) || (market === 'US' && usOpen);
                });
                if (candidates.length > 0) {
                    const { item, idx } = candidates[Math.floor(Math.random() * candidates.length)];
                    const delta = (Math.random() - 0.5) * 0.001; // up to ±0.05%
                    item.price = item.price * (1 + delta);
                    item.change = item.change + (item.price * delta);
                    item.changePercent = (item.change / (item.price - item.change)) * 100;
                    renderMarketOverviewFromCache(idx, delta >= 0);
                }
            }
        }
    }, 1500);
}


// ----------------------
// Load News & Sentiment
// ----------------------
async function loadNews(ticker, companyName, sector, industry) {
    if (!newsContainer) return;
    newsContainer.innerHTML = `<div style="text-align:center; width:100%; grid-column: 1 / -1; padding:2rem; color:var(--text-muted); font-size:0.875rem;"><div class="spinner" style="width:20px; height:20px; margin:0 auto 10px auto;"></div>Loading...</div>`;
    
    try {
        const url = ticker ? `${API_BASE}/api/stock/${ticker}/news` : `${API_BASE}/api/news`;
        const res = await fetch(url);
        let data = await res.json();
        
        // Fallback to global news if stock news is empty
        if ((!data || data.length === 0) && ticker) {
            const globalRes = await fetch(`${API_BASE}/api/news`);
            data = await globalRes.json();
        }
        
        // Fallback to local mock news if still empty
        if (!data || data.length === 0) {
            data = getMockNews(companyName, sector, industry);
        }
        
        newsContainer.innerHTML = '';
        data.slice(0, 4).forEach(item => {
            let badgeText = state.currentLang === 'ko' ? '중립' : 'Neutral';
            let badgeClass = 'sentiment-neu';
            if (item.sentiment === 'pos') {
                badgeText = state.currentLang === 'ko' ? '호재' : 'Positive';
                badgeClass = 'sentiment-pos';
            } else if (item.sentiment === 'neg') {
                badgeText = state.currentLang === 'ko' ? '악재' : 'Negative';
                badgeClass = 'sentiment-neg';
            }
            
            const card = document.createElement('div');
            card.className = 'news-card';
            const titleHtml = item.link ? `<a href="${item.link}" target="_blank" style="text-decoration:none; color:inherit; display:block;" class="news-title-link">${item.title}</a>` : `<span class="news-title-link">${item.title}</span>`;
            
            card.innerHTML = `
                <div class="news-meta">
                    <span>${item.publisher || 'Yahoo Finance'}</span>
                    <span class="sentiment-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="news-title">${titleHtml}</div>
                <div class="news-summary">${item.summary || ''}</div>
            `;
            newsContainer.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading news:", e);
        const data = getMockNews(companyName, sector, industry);
        newsContainer.innerHTML = '';
        data.slice(0, 3).forEach(item => {
            let badgeText = state.currentLang === 'ko' ? '중립' : 'Neutral';
            let badgeClass = 'sentiment-neu';
            if (item.sentiment === 'pos') {
                badgeText = state.currentLang === 'ko' ? '호재' : 'Positive';
                badgeClass = 'sentiment-pos';
            } else if (item.sentiment === 'neg') {
                badgeText = state.currentLang === 'ko' ? '악재' : 'Negative';
                badgeClass = 'sentiment-neg';
            }
            
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <div class="news-meta">
                    <span>${state.currentLang === 'ko' ? '경제연합뉴스' : 'Financial News'}</span>
                    <span class="sentiment-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="news-title">${item.title}</div>
                <div class="news-summary">${item.summary}</div>
            `;
            newsContainer.appendChild(card);
        });
    }
}

function getMockNews(companyName, sector, industry) {
    return [
        {
            title: `[분석] ${companyName}, ${sector} 분야에서의 점유율 확대와 성장 전망`,
            summary: `최근 보고서에 따르면 ${companyName}은/는 지속적인 연구 개발 투자와 안정적인 시장 수급을 바탕으로 동종 업계 경쟁사들 대비 우수한 성과를 보이고 있습니다.`,
            sentiment: 'pos',
            publisher: '시장분석팀'
        },
        {
            title: `시장 전문가, ${companyName}의 단기 Valuation 부담 완화 분석 발표`,
            summary: `금리 정책 안정과 자산 구조 재조정에 따라 ${companyName}의 주가수익비율(PER) 부담이 낮아졌으며, 장기 투자 매력도가 높아지고 있다는 분석입니다.`,
            sentiment: 'pos',
            publisher: '글로벌금융'
        },
        {
            title: `글로벌 거시 경제 불확실성에 따른 ${companyName}의 헤지 방안과 실적 변수`,
            summary: `인플레이션과 원자재 공급망 이슈가 해소되면서 ${industry} 전반의 회복세가 돋보이나, 여전히 하반기 환율 변동에 대한 세밀한 모니터링이 필요한 시점입니다.`,
            sentiment: 'neu',
            publisher: '거시경제리포트'
        }
    ];
}

// ----------------------
// Market Indices Overview
// ----------------------
async function loadMarketOverview() {
    try {
        const res = await fetch(`${API_BASE}/api/market-overview`);
        const data = await res.json();
        state.marketData = data;
        renderMarketOverviewFromCache();
    } catch (e) {
        console.error("Error loading market overview:", e);
    }
}

function renderMarketOverviewFromCache(flashIndex = -1, isUp = true) {
    if (!marketOverview) return;
    const cards = marketOverview.children;
    if (cards.length !== state.marketData.length) {
        marketOverview.innerHTML = '';
        state.marketData.forEach(item => {
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
        return;
    }

    state.marketData.forEach((item, idx) => {
        const card = cards[idx];
        if (!card) return;
        
        const isPos = item.changePercent > 0;
        const changeClass = isPos ? 'positive' : (item.changePercent < 0 ? 'negative' : 'neutral');
        const arrow = isPos ? '▲' : (item.changePercent < 0 ? '▼' : '');
        
        const priceEl = card.querySelector('.index-price');
        const changeEl = card.querySelector('.index-change');
        
        if (priceEl) priceEl.innerText = formatCurrency(item.price, item.currency);
        if (changeEl) {
            changeEl.className = `index-change ${changeClass}`;
            changeEl.innerHTML = `${arrow} ${formatCurrency(Math.abs(item.change), item.currency)} (${formatPercent(item.changePercent)})`;
        }
        
        if (idx === flashIndex) {
            card.classList.remove('flash-up-anim', 'flash-down-anim');
            void card.offsetWidth;
            card.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
        }
    });
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
    if (!state.activeStock || !watchlistToggle) return;
    const ticker = state.activeStock.ticker;
    const exists = state.watchlist.includes(ticker);
    
    const textKey = exists ? 'watchlist_remove' : 'watchlist_add';
    const textVal = (translations[state.currentLang] && translations[state.currentLang][textKey]) 
                    || (exists ? '관심 해제' : '관심 등록');

    watchlistToggle.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${exists ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <span id="watchlist-toggle-text">${textVal}</span>
    `;

    if (exists) {
        watchlistToggle.style.background = 'rgba(99, 102, 241, 0.2)';
        watchlistToggle.style.borderColor = 'var(--accent-primary)';
    } else {
        watchlistToggle.style.background = 'rgba(255, 255, 255, 0.05)';
        watchlistToggle.style.borderColor = 'var(--border-color)';
    }
}

async function renderWatchlist() {
    if (!watchlistContainer) return;
    watchlistContainer.innerHTML = '';
    
    if (state.watchlist.length === 0) {
        const emptyText = (translations[state.currentLang] && translations[state.currentLang]['watchlist_empty']) 
                          || '관심 등록된 주식이 없습니다.';
        watchlistContainer.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">${emptyText}</div>`;
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
        watchlistContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">Error loading data.</div>';
    }
}

function renderWatchlistFromCache(flashIdx = -1, isUp = true) {
    if (!watchlistContainer) return;
    
    if (state.watchlist.length === 0 || !state.watchlistCachedData || state.watchlistCachedData.length === 0) {
        const emptyText = (translations[state.currentLang] && translations[state.currentLang]['watchlist_empty']) 
                          || '관심 등록된 주식이 없습니다.';
        watchlistContainer.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">${emptyText}</div>`;
        return;
    }

    const items = watchlistContainer.children;
    if (items.length !== state.watchlistCachedData.length) {
        watchlistContainer.innerHTML = '';
        state.watchlistCachedData.forEach((info, idx) => {
            if (info.error && !info.currentPrice) {
                info.currentPrice = 0.0;
            }

            const isPos = info.changePercent > 0;
            const changeClass = isPos ? 'positive' : (info.changePercent < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (info.changePercent < 0 ? '▼' : '');

            const item = document.createElement('div');
            item.className = 'watchlist-item';
            item.innerHTML = `
                <div class="watchlist-item-left">
                    <span style="font-weight:700;">${info.ticker}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary); max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${info.name}</span>
                </div>
                <div class="watchlist-item-right">
                    <span class="watchlist-price" style="font-weight:600; font-size:0.95rem;">${info.currentPrice > 0 ? formatCurrency(info.currentPrice, info.currency) : '-'}</span>
                    <span class="watchlist-change ${changeClass}" style="font-size:0.75rem; font-weight:600;">${arrow}${formatPercent(Math.abs(info.changePercent))}</span>
                </div>
            `;
            item.onclick = () => loadStock(info.ticker);
            watchlistContainer.appendChild(item);
        });
        return;
    }

    state.watchlistCachedData.forEach((info, idx) => {
        const item = items[idx];
        if (!item) return;

        const isPos = info.changePercent > 0;
        const changeClass = isPos ? 'positive' : (info.changePercent < 0 ? 'negative' : 'neutral');
        const arrow = isPos ? '▲' : (info.changePercent < 0 ? '▼' : '');

        const priceEl = item.querySelector('.watchlist-price');
        const changeEl = item.querySelector('.watchlist-change');

        if (priceEl) priceEl.innerText = info.currentPrice > 0 ? formatCurrency(info.currentPrice, info.currency) : '-';
        if (changeEl) {
            changeEl.className = `watchlist-change ${changeClass}`;
            changeEl.innerText = `${arrow}${formatPercent(Math.abs(info.changePercent))}`;
        }

        if (idx === flashIdx) {
            item.classList.remove('flash-up-anim', 'flash-down-anim');
            void item.offsetWidth; // force reflow
            item.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
        }
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
    if (!portfolioContainer) return;
    portfolioContainer.innerHTML = '';
    
    if (state.portfolio.length === 0) {
        const emptyText = (translations[state.currentLang] && translations[state.currentLang]['portfolio_empty']) 
                          || '등록된 자산이 없습니다.';
        portfolioContainer.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">${emptyText}</div>`;
        portfolioTotalValue.innerText = formatCurrency(0, 'USD');
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
    if (!portfolioContainer) return;
    
    if (state.portfolio.length === 0 || !state.portfolioCachedData || state.portfolioCachedData.length === 0) {
        const emptyText = (translations[state.currentLang] && translations[state.currentLang]['portfolio_empty']) 
                          || '등록된 자산이 없습니다.';
        portfolioContainer.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">${emptyText}</div>`;
        portfolioTotalValue.innerText = formatCurrency(0, 'USD');
        portfolioTotalReturn.innerText = '0%';
        portfolioTotalReturn.className = 'portfolio-return neutral';
        return;
    }

    const items = portfolioContainer.children;
    if (items.length !== state.portfolio.length) {
        portfolioContainer.innerHTML = '';
        state.portfolio.forEach(asset => {
            const info = state.portfolioCachedData.find(s => s.ticker === asset.ticker);
            if (!info) return;

            const currentPrice = info.currentPrice || asset.price;
            const assetTotalInvested = asset.price * asset.qty;
            const assetTotalCurrent = currentPrice * asset.qty;
            const assetReturn = ((assetTotalCurrent - assetTotalInvested) / assetTotalInvested) * 100;
            
            const isPos = assetReturn > 0;
            const changeClass = isPos ? 'positive' : (assetReturn < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (assetReturn < 0 ? '▼' : '');

            const item = document.createElement('div');
            item.className = 'portfolio-item';
            
            item.innerHTML = `
                <div style="display:flex; flex-direction:column; flex:1;">
                    <span style="font-weight:700;">${asset.ticker}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${asset.qty}주 (평단: ${formatCurrency(asset.price, info.currency)})</span>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; margin-right:8px;">
                    <span class="portfolio-item-price" style="font-weight:600;">${formatCurrency(assetTotalCurrent, info.currency)}</span>
                    <span class="portfolio-item-return ${changeClass}" style="font-size:0.75rem; font-weight:600;">
                        ${arrow}${formatPercent(Math.abs(assetReturn))}
                    </span>
                </div>
                <button class="dialog-close" onclick="removePortfolioAsset('${asset.ticker}')" style="font-size:1.1rem; color:var(--text-muted); border:none; background:none; cursor:pointer; padding:4px;">&times;</button>
            `;
            portfolioContainer.appendChild(item);
        });
    } else {
        state.portfolio.forEach((asset, idx) => {
            const item = items[idx];
            if (!item) return;

            const info = state.portfolioCachedData.find(s => s.ticker === asset.ticker);
            if (!info) return;

            const currentPrice = info.currentPrice || asset.price;
            const assetTotalInvested = asset.price * asset.qty;
            const assetTotalCurrent = currentPrice * asset.qty;
            const assetReturn = ((assetTotalCurrent - assetTotalInvested) / assetTotalInvested) * 100;
            
            const isPos = assetReturn > 0;
            const changeClass = isPos ? 'positive' : (assetReturn < 0 ? 'negative' : 'neutral');
            const arrow = isPos ? '▲' : (assetReturn < 0 ? '▼' : '');

            const priceEl = item.querySelector('.portfolio-item-price');
            const returnEl = item.querySelector('.portfolio-item-return');

            if (priceEl) priceEl.innerText = formatCurrency(assetTotalCurrent, info.currency);
            if (returnEl) {
                returnEl.className = `portfolio-item-return ${changeClass}`;
                returnEl.innerText = `${arrow}${formatPercent(Math.abs(assetReturn))}`;
            }

            if (asset.ticker === flashTicker) {
                item.classList.remove('flash-up-anim', 'flash-down-anim');
                void item.offsetWidth; // force reflow
                item.classList.add(isUp ? 'flash-up-anim' : 'flash-down-anim');
            }
        });
    }

    let totalInvested = 0;
    let totalCurrent = 0;
    let mainCurrency = 'USD';

    state.portfolio.forEach(asset => {
        const info = state.portfolioCachedData.find(s => s.ticker === asset.ticker);
        if (!info) return;

        const currentPrice = info.currentPrice || asset.price;
        totalInvested += asset.price * asset.qty;
        totalCurrent += currentPrice * asset.qty;
        mainCurrency = info.currency || mainCurrency;
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
                    background: { type: 'solid', color: '#1e293b' },
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
                background: { type: 'solid', color: theme === 'dark' ? '#0b0f19' : '#ffffff' },
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
                background: { type: 'solid', color: theme === 'dark' ? '#1e293b' : '#ffffff' },
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
// Multi-Language Support
// ----------------------
const translations = {
    ko: {
        search_placeholder: "종목명 또는 티커 검색 (예: 삼성전자, AAPL)...",
        search_prompt: "주식을 검색하세요",
        watchlist_add: "관심 등록",
        watchlist_remove: "관심 해제",
        btn_compare: "종목 비교하기",
        metric_market_cap: "시가총액",
        metric_pe: "PER (주가수익비율)",
        metric_pb: "PBR (주가순자산비율)",
        metric_pe_short: "PER",
        metric_pb_short: "PBR",
        metric_dividend: "배당수익률",
        metric_52week: "52주 최고/최저",
        heading_summary: "기업 개요",
        summary_placeholder: "검색한 기업의 개요가 여기에 표시됩니다.",
        news_title: "실시간 글로벌 뉴스",
        watchlist_title: "관심 종목 (Watchlist)",
        portfolio_title: "내 포트폴리오",
        portfolio_total_value_label: "총 자산 평가액",
        portfolio_total_return_label: "총 수익률",
        portfolio_add_title: "포트폴리오 자산 추가",
        compare_dialog_title: "주식 상세 비교",
        compare_label_1: "비교 대상 주식 1",
        compare_label_2: "비교 대상 주식 2 검색",
        compare_placeholder_input: "종목명 또는 티커 검색...",
        compare_metric_header: "지표",
        compare_stock_1: "주식 1",
        compare_stock_2: "주식 2",
        compare_placeholder_text: "비교할 두 번째 주식을 입력해 주세요.",
        portfolio_dialog_title: "포트폴리오 자산 추가",
        port_ticker_label: "주식 티커 (예: AAPL, 005930.KS)",
        port_price_label: "평균 매수가",
        port_qty_label: "보유 수량",
        btn_cancel: "취소",
        btn_add: "추가하기",
        watchlist_empty: "관심 등록된 주식이 없습니다.",
        portfolio_empty: "등록된 자산이 없습니다.",
        market_status_title: "글로벌 시장 운영 시간",
        market_kr: "한국 시장",
        market_us: "미국 시장"
    },
    en: {
        search_placeholder: "Search stocks by name or ticker (e.g. Apple, AAPL)...",
        search_prompt: "Search for a Stock",
        watchlist_add: "Add to Watchlist",
        watchlist_remove: "Remove Watchlist",
        btn_compare: "Compare Stocks",
        metric_market_cap: "Market Cap",
        metric_pe: "PE Ratio",
        metric_pb: "PB Ratio",
        metric_pe_short: "PE",
        metric_pb_short: "PB",
        metric_dividend: "Dividend Yield",
        metric_52week: "52-Week High/Low",
        heading_summary: "Business Summary",
        summary_placeholder: "Company summary will be shown here.",
        news_title: "Real-time Global News",
        watchlist_title: "Watchlist",
        portfolio_title: "My Portfolio",
        portfolio_total_value_label: "Total Portfolio Value",
        portfolio_total_return_label: "Total Return",
        portfolio_add_title: "Add Asset to Portfolio",
        compare_dialog_title: "Detailed Stock Comparison",
        compare_label_1: "Compare Stock 1",
        compare_label_2: "Search Stock 2 to Compare",
        compare_placeholder_input: "Search name or ticker...",
        compare_metric_header: "Metric",
        compare_stock_1: "Stock 1",
        compare_stock_2: "Stock 2",
        compare_placeholder_text: "Please search and select a second stock to compare.",
        portfolio_dialog_title: "Add Asset to Portfolio",
        port_ticker_label: "Stock Ticker (e.g. AAPL, 005930.KS)",
        port_price_label: "Avg Cost Price",
        port_qty_label: "Quantity",
        btn_cancel: "Cancel",
        btn_add: "Add Asset",
        watchlist_empty: "No stocks in watchlist.",
        portfolio_empty: "No assets registered.",
        market_status_title: "Global Market Trading Hours",
        market_kr: "Korean Market",
        market_us: "US Market"
    },
    ja: {
        search_placeholder: "銘柄名またはティッカーで検索 (例: AAPL)...",
        search_prompt: "株式を検索してください",
        watchlist_add: "ウォッチリストに追加",
        watchlist_remove: "ウォッチリストから削除",
        btn_compare: "銘柄を比較する",
        metric_market_cap: "時価総額",
        metric_pe: "PER (株価収益率)",
        metric_pb: "PBR (株価純資産倍率)",
        metric_pe_short: "PER",
        metric_pb_short: "PBR",
        metric_dividend: "配当利回り",
        metric_52week: "52週高値/安値",
        heading_summary: "企業概要",
        summary_placeholder: "検索した企業の概要がここに表示されます。",
        news_title: "リアルタイム世界ニュース",
        watchlist_title: "ウォッチリスト",
        portfolio_title: "マイポートフォリオ",
        portfolio_total_value_label: "総資産評価額",
        portfolio_total_return_label: "トータルリターン",
        portfolio_add_title: "資産を追加する",
        compare_dialog_title: "銘柄詳細比較",
        compare_label_1: "比較対象株 1",
        compare_label_2: "比較対象株 2 検索",
        compare_placeholder_input: "銘柄名またはティッカーで検索...",
        compare_metric_header: "指標",
        compare_stock_1: "株 1",
        compare_stock_2: "株 2",
        compare_placeholder_text: "比較する2番目の株式を検索して選択してください。",
        portfolio_dialog_title: "ポートフォリオ追加",
        port_ticker_label: "株式ティッカー (例: AAPL, 005930.KS)",
        port_price_label: "平均買付単価",
        port_qty_label: "保有数量",
        btn_cancel: "キャンセル",
        btn_add: "追加する",
        watchlist_empty: "ウォッチリストに登録された株式はありません。",
        portfolio_empty: "登録された資産はありません。",
        market_status_title: "グローバル市場取引時間",
        market_kr: "韓国市場",
        market_us: "米国市場"
    },
    zh: {
        search_placeholder: "按名称或代码搜索股票 (例如: AAPL)...",
        search_prompt: "搜索股票",
        watchlist_add: "加入自选股",
        watchlist_remove: "取消自选",
        btn_compare: "股票对比",
        metric_market_cap: "市值",
        metric_pe: "市盈率 (PE)",
        metric_pb: "市净率 (PB)",
        metric_pe_short: "PE",
        metric_pb_short: "PB",
        metric_dividend: "股息率",
        metric_52week: "52周最高/最低",
        heading_summary: "公司简介",
        summary_placeholder: "搜索的公司简介将在此处显示。",
        news_title: "实时全球新闻",
        watchlist_title: "自选股",
        portfolio_title: "我的投资组合",
        portfolio_total_value_label: "总资产估值",
        portfolio_total_return_label: "总收益率",
        portfolio_add_title: "添加资产到投资组合",
        compare_dialog_title: "股票详细对比",
        compare_label_1: "对比股票 1",
        compare_label_2: "搜索对比股票 2",
        compare_placeholder_input: "搜索股票名称或代码...",
        compare_metric_header: "指标",
        compare_stock_1: "股票 1",
        compare_stock_2: "股票 2",
        compare_placeholder_text: "请搜索并选择第二只股票进行对比。",
        portfolio_dialog_title: "添加资产",
        port_ticker_label: "股票代码 (例如: AAPL, 005930.KS)",
        port_price_label: "平均买入价",
        port_qty_label: "持股数量",
        btn_cancel: "取消",
        btn_add: "添加",
        watchlist_empty: "自选股暂无股票。",
        portfolio_empty: "暂无添加的资产。",
        market_status_title: "全球市场交易时间",
        market_kr: "韩国市场",
        market_us: "美国市场"
    }
};

state.currentLang = localStorage.getItem('lang') || 'ko';

function getMarketStatus() {
    const now = new Date();
    
    // --- 1. Korean Market Status ---
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstTime = new Date(utc + (3600000 * 9));
    
    const krDay = kstTime.getDay();
    const krHour = kstTime.getHours();
    const krMin = kstTime.getMinutes();
    const krTimeVal = krHour * 100 + krMin;
    
    let krPhase = 'closed'; // 'pre', 'regular', 'after', 'closed'
    if (krDay >= 1 && krDay <= 5) {
        if (krTimeVal >= 830 && krTimeVal < 900) {
            krPhase = 'pre';
        } else if (krTimeVal >= 900 && krTimeVal < 1530) {
            krPhase = 'regular';
        } else if (krTimeVal >= 1530 && krTimeVal < 1800) {
            krPhase = 'after';
        }
    }
    
    // --- 2. US Market Status ---
    const year = now.getUTCFullYear();
    const dstStart = new Date(Date.UTC(year, 2, 8, 7, 0, 0));
    while (dstStart.getUTCDay() !== 0) {
        dstStart.setUTCDate(dstStart.getUTCDate() + 1);
    }
    const dstEnd = new Date(Date.UTC(year, 10, 1, 6, 0, 0));
    while (dstEnd.getUTCDay() !== 0) {
        dstEnd.setUTCDate(dstEnd.getUTCDate() + 1);
    }
    
    const isDst = (now >= dstStart && now < dstEnd);
    const etOffset = isDst ? -4 : -5;
    const etTime = new Date(utc + (3600000 * etOffset));
    
    const usDay = etTime.getDay();
    const usHour = etTime.getHours();
    const usMin = etTime.getMinutes();
    const usTimeVal = usHour * 100 + usMin;
    
    let usPhase = 'closed';
    if (usDay >= 1 && usDay <= 5) {
        if (usTimeVal >= 400 && usTimeVal < 930) {
            usPhase = 'pre';
        } else if (usTimeVal >= 930 && usTimeVal < 1600) {
            usPhase = 'regular';
        } else if (usTimeVal >= 1600 && usTimeVal < 2000) {
            usPhase = 'after';
        }
    }
    
    // US Times in KST equivalents
    const usTimesKst = isDst ? {
        pre: "17:00 ~ 22:30",
        regular: "22:30 ~ 05:00",
        after: "05:00 ~ 09:00"
    } : {
        pre: "18:00 ~ 23:30",
        regular: "23:30 ~ 06:00",
        after: "06:00 ~ 10:00"
    };
    
    // US Times in ET equivalents
    const usTimesEt = {
        pre: "04:00 ~ 09:30",
        regular: "09:30 ~ 16:00",
        after: "16:00 ~ 20:00"
    };
    
    return {
        kr: {
            phase: krPhase,
            timeStr: kstTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            times: {
                pre: "08:30 ~ 09:00",
                regular: "09:00 ~ 15:30",
                after: "15:30 ~ 18:00"
            }
        },
        us: {
            phase: usPhase,
            timeStr: etTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            isDst: isDst,
            timesKst: usTimesKst,
            timesEt: usTimesEt
        }
    };
}

function updateMarketHoursUI() {
    const status = getMarketStatus();
    const lang = state.currentLang || 'ko';
    
    // Update KRX Phase Badge
    const krPhaseBadge = document.querySelector('.kr-current-phase');
    const krPhaseNames = {
        pre: { ko: '프리마켓', en: 'Pre-Market', ja: 'プレマーケット', zh: '盘前交易' },
        regular: { ko: '정규장', en: 'Regular Market', ja: 'ザラバ', zh: '常规交易' },
        after: { ko: '애프터마켓', en: 'After-Market', ja: 'アフターマーケット', zh: '盘后交易' },
        closed: { ko: '장마감', en: 'Closed', ja: '取引終了', zh: '已收盘' }
    };
    
    if (krPhaseBadge) {
        krPhaseBadge.innerText = krPhaseNames[status.kr.phase][lang] || krPhaseNames[status.kr.phase]['ko'];
        krPhaseBadge.style.background = status.kr.phase !== 'closed' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        krPhaseBadge.style.color = status.kr.phase !== 'closed' ? 'var(--accent-primary)' : 'var(--text-muted)';
    }
    
    // Update KRX Timeline Steps
    const krSteps = {
        pre: document.querySelector('.kr-phase-pre'),
        regular: document.querySelector('.kr-phase-regular'),
        after: document.querySelector('.kr-phase-post')
    };
    
    Object.keys(krSteps).forEach(k => {
        if (krSteps[k]) {
            if (status.kr.phase === k) {
                krSteps[k].classList.add('active');
            } else {
                krSteps[k].classList.remove('active');
            }
        }
    });

    // Update US Phase Badge
    const usPhaseBadge = document.querySelector('.us-current-phase');
    const usPhaseNames = {
        pre: { ko: '프리마켓', en: 'Pre-Market', ja: 'プレマーケット', zh: '盘前交易' },
        regular: { ko: '정규장', en: 'Regular Market', ja: 'ザラバ', zh: '常规交易' },
        after: { ko: '애프터마켓', en: 'After-Market', ja: 'アフターマーケット', zh: '盘后交易' },
        closed: { ko: '장마감', en: 'Closed', ja: '取引終了', zh: '已收盘' }
    };
    
    if (usPhaseBadge) {
        usPhaseBadge.innerText = usPhaseNames[status.us.phase][lang] || usPhaseNames[status.us.phase]['ko'];
        usPhaseBadge.style.background = status.us.phase !== 'closed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        usPhaseBadge.style.color = status.us.phase !== 'closed' ? 'var(--color-positive)' : 'var(--text-muted)';
    }
    
    // Update US Timeline Steps
    const usSteps = {
        pre: document.querySelector('.us-phase-pre'),
        regular: document.querySelector('.us-phase-regular'),
        after: document.querySelector('.us-phase-post')
    };
    
    Object.keys(usSteps).forEach(k => {
        if (usSteps[k]) {
            if (status.us.phase === k) {
                usSteps[k].classList.add('active', 'us-active');
            } else {
                usSteps[k].classList.remove('active', 'us-active');
            }
            
            // For US times, show KST or ET based on language preference
            const timeEl = usSteps[k].querySelector('.phase-time');
            if (timeEl) {
                if (lang === 'ko') {
                    timeEl.innerText = status.us.timesKst[k] + " (KST)";
                } else {
                    timeEl.innerText = status.us.timesEt[k] + " (ET)";
                }
            }
        }
    });
}

function applyLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Elements translation
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });

    // Placeholders translation
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // Reload parts that render text dynamically
    renderWatchlistFromCache();
    renderPortfolioFromCache();
    updateWatchlistButtonState();
    updateMarketHoursUI();
}

function initLanguage() {
    const savedLang = localStorage.getItem('lang') || 'ko';
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = savedLang;
        langSelect.onchange = (e) => {
            applyLanguage(e.target.value);
        };
    }
    applyLanguage(savedLang);
}

// ----------------------
// Initial Startup
// ----------------------
window.onload = async () => {
    initMainChart();
    initTheme();
    initLanguage();
    
    setupSearch(searchInput, searchResults, (item) => {
        loadStock(item.ticker);
    });

    // Load initial data
    await loadMarketOverview();
    await renderWatchlist();
    await renderPortfolio();

    // Default load AAPL
    await loadStock('AAPL');

    // Periodic market data refresh (every 1 minute) and market hours update (every 10 seconds)
    setInterval(loadMarketOverview, 60000);
    setInterval(updateMarketHoursUI, 10000);
};
