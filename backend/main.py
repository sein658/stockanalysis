import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import yfinance as yf
import pandas as pd
import numpy as np
import urllib.request
import urllib.parse
import json
import time
from typing import List, Optional
import os
import math


def sanitize_float(val, precision=2) -> Optional[float]:
    if val is None:
        return None
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return None
        return round(f_val, precision)
    except BaseException:
        return None


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Stock Analyzer API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TICKER_NAMES = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "TSLA": "Tesla, Inc.",
    "NVDA": "NVIDIA Corporation",
    "AMZN": "Amazon.com, Inc.",
    "GOOGL": "Alphabet Inc.",
    "META": "Meta Platforms, Inc.",
    "NFLX": "Netflix, Inc.",
    "AMD": "Advanced Micro Devices, Inc.",
    "INTC": "Intel Corporation",
    "QCOM": "Qualcomm Incorporated",
    "AVGO": "Broadcom Inc.",
    "ASML": "ASML Holding N.V.",
    "JPM": "JPMorgan Chase & Co.",
    "V": "Visa Inc.",
    "MA": "Mastercard Incorporated",
    "LLY": "Eli Lilly and Company",
    "NVO": "Novo Nordisk A/S",
    "BRK-B": "Berkshire Hathaway Inc.",
    "COIN": "Coinbase Global, Inc.",
    "MSTR": "MicroStrategy Incorporated",
    "DIS": "The Walt Disney Company",
    "NKE": "NIKE, Inc.",
    "005930.KS": "삼성전자",
    "000660.KS": "SK하이닉스",
    "005935.KS": "삼성전자우",
    "035420.KS": "NAVER",
    "035720.KS": "카카오",
    "005380.KS": "현대자동차",
    "000270.KS": "기아",
    "051910.KS": "LG화학",
    "006400.KS": "삼성SDI",
    "207940.KS": "삼성바이오로직스",
    "068270.KS": "셀트리온",
    "005490.KS": "POSCO홀딩스",
    "012330.KS": "현대모비스",
    "066570.KS": "LG전자",
    "000810.KS": "삼성화재",
    "032830.KS": "삼성생명",
    "003550.KS": "LG",
    "017670.KS": "SK텔레콤",
    "018260.KS": "삼성SDS",
    "009150.KS": "삼성전기",
    "010950.KS": "S-Oil",
    "015760.KS": "한국전력공사",
    "000100.KS": "유한양행",
    "000080.KS": "하이트진로",
    "^KS11": "코스피 지수 (KOSPI)",
    "^KQ11": "코스닥 지수 (KOSDAQ)",
    "^GSPC": "S&P 500 지수",
    "^IXIC": "나스닥 지수 (NASDAQ)",
    "^DJI": "다우존스 지수"
}

# Cache for stock details to prevent slow yfinance scraping overhead
# Key: Ticker -> Value: {"data": InfoDict, "timestamp": unix_time}
info_cache = {}
market_cache = {"data": None, "timestamp": 0}


def search_stock_internal(q: str):
    """Internal helper to query Yahoo Finance autocomplete."""
    encoded_query = urllib.parse.quote(q)
    # Using query2 as it is more stable and less rate limited
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={encoded_query}&lang=ko-KR&region=KR"

    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))

    quotes = data.get("quotes", [])
    results = []
    for quote in quotes:
        quote_type = quote.get("quoteType", "")
        if quote_type not in ["EQUITY", "ETF"]:
            continue

        results.append({
            "ticker": quote.get("symbol"),
            "name": quote.get("longname") or quote.get("shortname") or quote.get("symbol"),
            "exchange": quote.get("exchange"),
            "type": quote_type,
            "sector": quote.get("sector", "N/A"),
            "industry": quote.get("industry", "N/A")
        })
    return results


def get_stock_info_internal(ticker: str):
    """Optimized internal helper to fetch stock details using cache and fast_info."""
    ticker = ticker.strip().upper()
    now = time.time()

    # 1. Return cache if valid (10 minutes cache)
    if ticker in info_cache and (now - info_cache[ticker]["timestamp"] < 600):
        return info_cache[ticker]["data"]

    t = yf.Ticker(ticker)

    try:
        # Use fast_info (takes < 0.8s) for all numeric parameters
        fast_info = t.fast_info

        current_price = fast_info.get("lastPrice")
        prev_close = fast_info.get("previousClose")
        market_cap = fast_info.get("marketCap")
        currency = fast_info.get("currency", "USD")
        high = fast_info.get("yearHigh")
        low = fast_info.get("yearLow")
        volume = fast_info.get("lastVolume")

        # Calculate daily change
        change = 0.0
        change_percent = 0.0
        if current_price is not None and prev_close is not None:
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100
        else:
            # Fallback to history if fast_info missing price
            hist = t.history(period="2d").dropna(subset=["Close"])
            if not hist.empty:
                current_price = float(hist["Close"].iloc[-1])
                if len(hist) > 1:
                    prev_close = float(hist["Close"].iloc[-2])
                    change = current_price - prev_close
                    change_percent = (change / prev_close) * 100

        # Get Company Name
        name = TICKER_NAMES.get(ticker)
        if not name:
            # Resolve name using autocomplete
            try:
                search_res = search_stock_internal(ticker)
                if search_res:
                    name = search_res[0]["name"]
                else:
                    name = ticker
            except BaseException:
                name = ticker

        # Optional details: PE, PB, Dividend, Summary (use defaults)
        pe_ratio = None
        pb_ratio = None
        div_yield = None
        summary = "No description available."

        # Try fetching full info lazily (if it fails, we fall back to defaults
        # gracefully)
        try:
            info = t.info
            name = info.get("longName") or info.get("shortName") or name
            pe_ratio = info.get("trailingPE") or pe_ratio
            pb_ratio = info.get("priceToBook") or pb_ratio
            div_yield = info.get("dividendYield")
            if div_yield is not None:
                div_yield = round(div_yield * 100, 2)
            summary = info.get("longBusinessSummary") or summary
            high = info.get("fiftyTwoWeekHigh") or high
            low = info.get("fiftyTwoWeekLow") or low
            volume = info.get("volume") or volume
        except Exception as e:
            logger.warning(
                f"Could not load full scraping info for {ticker} (using fast_info fallback): {e}")

        # Format output
        res_data = {
            "ticker": ticker,
            "name": name,
            "currentPrice": sanitize_float(current_price),
            "change": sanitize_float(change),
            "changePercent": sanitize_float(change_percent),
            "currency": currency,
            "marketCap": market_cap,
            "peRatio": sanitize_float(pe_ratio),
            "pbRatio": sanitize_float(pb_ratio),
            "dividendYield": sanitize_float(div_yield),
            "fiftyTwoWeekHigh": sanitize_float(high),
            "fiftyTwoWeekLow": sanitize_float(low),
            "volume": int(volume) if volume and not math.isnan(
                float(volume)) and not math.isinf(
                float(volume)) else 0,
            "summary": summary,
            "error": False}

        info_cache[ticker] = {
            "data": res_data,
            "timestamp": now
        }
        return res_data

    except Exception as e:
        logger.error(
            f"Complete failure in get_stock_info_internal for {ticker}: {e}")
        # Return structured mock fallback instead of crashing or returning error=True
        # This keeps the UI rendering the item instead of hiding it!
        return {
            "ticker": ticker,
            "name": TICKER_NAMES.get(ticker, ticker),
            "currentPrice": None,
            "change": 0.0,
            "changePercent": 0.0,
            "currency": "USD",
            "marketCap": None,
            "peRatio": None,
            "pbRatio": None,
            "dividendYield": None,
            "fiftyTwoWeekHigh": None,
            "fiftyTwoWeekLow": None,
            "volume": 0,
            "summary": f"Could not retrieve details for {ticker} due to: {e}",
            "error": True
        }


@app.get("/api/market-overview")
def get_market_overview():
    now = time.time()
    # Cache overview for 5 minutes
    if market_cache["data"] and (now - market_cache["timestamp"] < 300):
        return market_cache["data"]

    indices = {
        "KOSPI": "^KS11",
        "KOSDAQ": "^KQ11",
        "S&P 500": "^GSPC",
        "NASDAQ": "^IXIC",
        "Dow Jones": "^DJI"
    }

    result = []
    for name, ticker in indices.items():
        try:
            t = yf.Ticker(ticker)

            fi = t.fast_info
            last_close = fi.get("lastPrice")
            prev_close = fi.get("previousClose")

            # Fallback if fast_info doesn't yield valid values
            if last_close is None or prev_close is None or math.isnan(
                    last_close) or math.isnan(prev_close):
                hist = t.history(period="5d").dropna(subset=["Close"])
                if hist.empty:
                    continue
                last_close = hist["Close"].iloc[-1]
                prev_close = hist["Close"].iloc[-2] if len(
                    hist) > 1 else last_close

            # Avoid nan operations
            last_close_val = sanitize_float(last_close)
            prev_close_val = sanitize_float(prev_close)

            if last_close_val is not None and prev_close_val is not None and prev_close_val != 0:
                change = last_close_val - prev_close_val
                change_percent = (change / prev_close_val) * 100
            else:
                last_close_val = last_close_val or 0.0
                change = 0.0
                change_percent = 0.0

            result.append({
                "name": name,
                "ticker": ticker,
                "price": sanitize_float(last_close_val),
                "change": sanitize_float(change),
                "changePercent": sanitize_float(change_percent),
                "currency": "KRW" if "KS" in ticker or "KQ" in ticker else "USD"
            })
        except Exception as e:
            logger.error(f"Error fetching index {name}: {e}")
            result.append({
                "name": name,
                "ticker": ticker,
                "price": 0.0,
                "change": 0.0,
                "changePercent": 0.0,
                "error": True
            })

    market_cache["data"] = result
    market_cache["timestamp"] = now
    return result


@app.get("/api/search")
def search_stock(q: str = Query(..., min_length=1)):
    """Search stock with robust local fallback for rate limit protection."""
    try:
        return search_stock_internal(q)
    except Exception as e:
        logger.error(
            f"Error during remote search: {e}. Falling back to local search.")

        # Local search fallback in TICKER_NAMES dictionary
        results = []
        q_upper = q.upper()
        for ticker, name in TICKER_NAMES.items():
            # Match by ticker code or name containing query
            if q_upper in ticker or q_upper in name.upper() or q in name:
                results.append({
                    "ticker": ticker,
                    "name": name,
                    "exchange": "KRX" if "KS" in ticker or "KQ" in ticker else "US",
                    "type": "EQUITY",
                    "sector": "Local",
                    "industry": "Local"
                })
        return results


@app.get("/api/stock/{ticker}/info")
def get_stock_info(ticker: str):
    return get_stock_info_internal(ticker)


@app.get("/api/stocks/info")
def get_multiple_stocks_info(tickers: str = Query(...,
                                                  description="Comma separated list of tickers")):
    """Batch API to fetch basic stats for multiple symbols in a single call."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return []

    result = []
    for ticker in ticker_list:
        result.append(get_stock_info_internal(ticker))
    return result


def analyze_sentiment_mock(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    pos_words = [
        "gain",
        "rise",
        "jump",
        "surge",
        "up",
        "bull",
        "growth",
        "profit",
        "호재",
        "상승",
        "성장",
        "최고",
        "부합",
        "완화",
        "매수",
        "확대"]
    neg_words = [
        "drop",
        "fall",
        "slide",
        "plunge",
        "slump",
        "down",
        "bear",
        "loss",
        "decline",
        "악재",
        "하락",
        "손실",
        "최저",
        "우려",
        "부담",
        "리스크"]

    pos_score = sum(1 for word in pos_words if word in text)
    neg_score = sum(1 for word in neg_words if word in text)

    if pos_score > neg_score:
        return "pos"
    elif neg_score > pos_score:
        return "neg"
    else:
        return "neu"


def format_yfinance_news(raw_news) -> List[dict]:
    news_list = []
    if not raw_news:
        return news_list
    for item in raw_news:
        content = item.get("content", item)
        if not content:
            continue

        title = content.get("title")
        if not title:
            continue

        summary = content.get("summary") or content.get("description") or ""
        pub_date = content.get("pubDate") or content.get(
            "providerPublishTime") or ""
        if isinstance(pub_date, int):
            pub_date = time.strftime(
                '%Y-%m-%d %H:%M:%S',
                time.localtime(pub_date))

        publisher = content.get("provider", {}).get("displayName") if isinstance(
            content.get("provider"), dict) else content.get("publisher") or "Yahoo Finance"

        link = ""
        canonical = content.get("canonicalUrl")
        if isinstance(canonical, dict):
            link = canonical.get("url")
        elif isinstance(canonical, str):
            link = canonical

        if not link:
            clickthrough = content.get("clickThroughUrl")
            if isinstance(clickthrough, dict):
                link = clickthrough.get("url")
            elif isinstance(clickthrough, str):
                link = clickthrough

        if not link:
            link = content.get("link") or ""

        sentiment = analyze_sentiment_mock(title, summary)

        news_list.append({
            "title": title,
            "summary": summary,
            "pubDate": str(pub_date),
            "publisher": publisher,
            "link": link,
            "sentiment": sentiment
        })
    return news_list


@app.get("/api/stock/{ticker}/news")
def get_stock_news(ticker: str):
    try:
        t = yf.Ticker(ticker)
        raw_news = t.news
        return format_yfinance_news(raw_news)
    except Exception as e:
        logger.error(f"Error fetching news for {ticker}: {e}")
        return []


@app.get("/api/news")
def get_global_news():
    try:
        t = yf.Ticker("^GSPC")
        raw_news = t.news
        return format_yfinance_news(raw_news)
    except Exception as e:
        logger.error(f"Error fetching global news: {e}")
        return []


@app.get("/api/stock/{ticker}/history")
def get_stock_history(ticker: str, period: str = "1y", interval: str = "1d"):
    try:
        t = yf.Ticker(ticker)
        df = t.history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(
                status_code=404,
                detail="No historical data found")

        # Drop rows with NaN in OHLC to prevent technical indicators crash
        df = df.dropna(subset=["Open", "High", "Low", "Close"])
        if df.empty:
            raise HTTPException(
                status_code=404,
                detail="No historical data found after removing empty rows")

        df.index = pd.to_datetime(df.index)

        # Technical Indicators calculation
        df["MA5"] = df["Close"].rolling(window=5).mean()
        df["MA20"] = df["Close"].rolling(window=20).mean()
        df["MA60"] = df["Close"].rolling(window=60).mean()
        df["MA120"] = df["Close"].rolling(window=120).mean()

        delta = df["Close"].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        avg_gain = gain.ewm(com=13, adjust=False).mean()
        avg_loss = loss.ewm(com=13, adjust=False).mean()

        rs = avg_gain / np.where(avg_loss == 0, 0.00001, avg_loss)
        df["RSI"] = 100 - (100 / (1 + rs))

        ema12 = df["Close"].ewm(span=12, adjust=False).mean()
        ema26 = df["Close"].ewm(span=26, adjust=False).mean()
        df["MACD"] = ema12 - ema26
        df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
        df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]

        df = df.replace({np.nan: None})

        history_list = []
        for index, row in df.iterrows():
            date_str = index.strftime("%Y-%m-%d")
            history_list.append({
                "time": date_str,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]) if row["Volume"] is not None else 0,
                "ma5": float(row["MA5"]) if row["MA5"] is not None else None,
                "ma20": float(row["MA20"]) if row["MA20"] is not None else None,
                "ma60": float(row["MA60"]) if row["MA60"] is not None else None,
                "ma120": float(row["MA120"]) if row["MA120"] is not None else None,
                "rsi": float(row["RSI"]) if row["RSI"] is not None else None,
                "macd": float(row["MACD"]) if row["MACD"] is not None else None,
                "macdSignal": float(row["MACD_Signal"]) if row["MACD_Signal"] is not None else None,
                "macdHist": float(row["MACD_Hist"]) if row["MACD_Hist"] is not None else None,
            })

        return history_list
    except Exception as e:
        logger.error(f"Error fetching history for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/compare")
def compare_stocks(tickers: str = Query(...,
                                        description="Comma separated list of tickers")):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {}

    result = {}
    for ticker in ticker_list:
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="1y").dropna(subset=["Close"])
            if hist.empty:
                continue

            info = get_stock_info_internal(ticker)
            initial_price = float(hist["Close"].iloc[0])

            comparison_data = []
            for index, row in hist.iterrows():
                close = float(row["Close"])
                pct_return = ((close - initial_price) / initial_price) * 100
                comparison_data.append({
                    "time": index.strftime("%Y-%m-%d"),
                    "value": round(pct_return, 2),
                    "price": round(close, 2)
                })

            result[ticker] = {
                "name": info.get("name"),
                "currency": info.get("currency", "USD"),
                "marketCap": info.get("marketCap"),
                "peRatio": info.get("peRatio"),
                "pbRatio": info.get("pbRatio"),
                "dividendYield": info.get("dividendYield"),
                "data": comparison_data
            }
        except Exception as e:
            logger.error(f"Error comparing stock {ticker}: {e}")

    return result


@app.get("/")
def root_redirect():
    return RedirectResponse(url="/stock/")


# Serve Frontend static files
frontend_path = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../frontend"))
if os.path.exists(frontend_path):
    app.mount(
        "/stock",
        StaticFiles(
            directory=frontend_path,
            html=True),
        name="frontend")
else:
    logger.warning(
        f"Frontend path {frontend_path} does not exist. Static files won't be served.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8001, reload=True)
