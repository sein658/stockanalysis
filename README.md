# 📈 Premium Stock Analyzer

이 프로젝트는 국내(KOSPI, KOSDAQ) 및 해외(S&P 500, NASDAQ, DOW 등) 주요 시장 지수, 개별 종목의 가격 정보, 실시간 차트 분석, 상세 재무 지표, 관심 종목 및 포트폴리오 관리 기능을 제공하는 프리미엄 다크 모드 주식 분석 대시보드입니다.

This project is a premium dark-mode stock analysis dashboard that provides real-time market indices for domestic (KOSPI, KOSDAQ) and international (S&P 500, NASDAQ, DOW, etc.) markets, individual stock price data, interactive charts, financial metrics, watchlists, and portfolio management.

---

## 🌐 Language Select / 언어 선택
Choose your language to view the detailed documentation:

* [🇰🇷 한국어 (Korean)](#-한국어-korean)
* [🇺🇸 English (English)](#-english)
* [🇯🇵 日本語 (Japanese)](#-日本語-japanese)
* [🇨🇳 简体中文 (Chinese)](#-简体中文-chinese)
* [🇹🇭 ภาษาไทย (Thai)](#-ภาษาไทย-thai)
* [🇮🇳 हिन्दी (Hindi)](#-हिन्दी-hindi)

---

## 🇰🇷 한국어 (Korean)

### 🌟 주요 기능
1. **실시간 시장 지수 모니터링**: KOSPI, KOSDAQ, S&P 500, NASDAQ, DOW 등 글로벌 지수의 동적 시세 조회
2. **기술 분석 차트 (TradingView)**: Lightweight Charts v4를 연동하여 봉 차트, 거래량, 이동평균선(MA5, MA20, MA60, MA120) 및 RSI, MACD 보조 지표 렌더링 (마우스 휠 줌/드래그 지원)
3. **상세 글로벌 시장 운영 시간 (Pre/Regular/After)**: 한국(KRX) 및 미국(US) 시장의 거래 단계를 **프리마켓**, **정규장**, **애프터마켓**으로 세분화하여 타임라인 형태로 시각화
4. **시장 마감 시 실시간 틱 동결 (Price Freeze)**: 장마감 상태가 된 국가의 주식 종목은 불필요한 가격 요동 및 깜빡임 효과를 멈추고 최종 종가로 유지
5. **동적 주식 비교**: 2개 종목을 동시에 비교하여 1년 기준 상대 수익률 변동 차트 및 핵심 지표 병렬 비교
6. **관심 종목(Watchlist) & 포트폴리오**: 종목 추가/제거 및 평단가, 수량을 입력하여 수익률 및 평가 손익을 실시간 계산 (`localStorage` 연동)
7. **다국어 UI 지원**: 한국어(KO), 영어(EN), 일본어(JA), 중국어(ZH)를 실시간 지원하는 다국어 번역 셀렉터 제공

### 📁 프로젝트 구조
```text
stock-analyzer/
├── backend/
│   ├── main.py          # FastAPI 서버 및 Yahoo Finance API 엔드포인트
│   └── requirements.txt # Python 패키지 의존성 (FastAPI, yfinance 등)
├── frontend/
│   ├── index.html       # 프론트엔드 HTML 구조
│   ├── style.css        # 프리미엄 다크 모드/글래스모피즘 CSS 스타일시트
│   └── app.js           # Lightweight Charts 바인딩, 실시간 틱 및 다국어 로직
├── run.sh               # 간편 실행 쉘 스크립트 (가상환경 자동 셋업)
└── README.md            # 안내 문서 (본 파일)
```

### 🚀 시작하기
프로젝트 루트 디렉토리에서 아래 명령어를 실행하면 필요한 가상환경 설치 및 서버 실행이 한 번에 진행됩니다:
```bash
./run.sh
```
서버 구동 후 브라우저에서 아래 주소로 접속해 주세요:
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**

---

## 🇺🇸 English

### 🌟 Key Features
1. **Real-time Market Indices**: Monitor global indices dynamically including KOSPI, KOSDAQ, S&P 500, NASDAQ, and DOW.
2. **Technical Analysis Charts**: Integrated TradingView Lightweight Charts v4 featuring candlesticks, volume, moving averages (MA5, MA20, MA60, MA120), RSI, and MACD (Supports zoom/drag).
3. **Global Market Hours (Pre/Regular/After)**: Visualizes transaction phases for KRX and US markets partitioned into **Pre-market**, **Regular Session**, and **After-market** timelines.
4. **Closing Price Freeze**: Once a specific market closes, ticks and blink animations for the respective region's stocks are frozen to maintain the final closing price.
5. **Dynamic Stock Comparison**: Search and compare two stocks side-by-side with 1-year relative performance charts and financial metrics.
6. **Watchlist & Portfolio Management**: Add/remove symbols and compute profits/losses in real-time using `localStorage` persistence.
7. **Multi-language Interface**: Instantly switch between Korean (KO), English (EN), Japanese (JA), and Chinese (ZH).

### 📁 Structure
Same as documented in the Korean section.

### 🚀 How to Run
Execute the startup script in the project root directory:
```bash
./run.sh
```
Once started, access the dashboard in your web browser:
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**

---

## 🇯🇵 日本語 (Japanese)

### 🌟 主な機能
1. **リアルタイム市場指数**: KOSPI、KOSDAQ、S&P 500、NASDAQ、DOWなどの主要指数を動的にモニタリング。
2. **テクニカル分析チャート**: TradingView Lightweight Charts v4との連携により、ローソク足、出来高、移動平均線（MA5、MA20、MA60、MA120）、RSI、MACD指標を表示（ズーム・ドラッグ操作対応）。
3. **グローバル市場取引時間 (Pre/Regular/After)**: 韓国（KRX）および米国（US）市場의 거래 단계를 **プレマーケット**、**正規市場**、**アフターマーケット**に細分化してタイムラインで可視化。
4. **市場クローズ時の価格固定**: 取引所が閉まると、該当地域の銘柄の価格変動と点滅エフェクトを自動停止し、最終終値を維持。
5. **動的銘柄比較**: 2つの銘柄を検索し、1年間の相対収益率チャートと主要財務指標を並べて比較。
6. **ウォッチリスト＆ポートフォリオ**: 銘柄の追加・削除、および平均取得単価・数量の入力によるリアルタイム評価損益計算（`localStorage`対応）。
7. **多言語UIサポート**: 韓国語（KO）、英語（EN）、日本語（JA）、中国語（ZH）のリアルタイム切り替えに対応。

### 🚀 開始方法
プロジェクトのルートディレクトリで以下のスクリプトを実行します：
```bash
./run.sh
```
起動後、ブラウザで以下のURLを開いてください：
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**

---

## 🇨🇳 简体中文 (Chinese)

### 🌟 核心功能
1. **实时市场指数监控**: 动态查询韩国（KOSPI、KOSDAQ）和美国（S&P 500、NASDAQ、DOW）等全球主要指数的行情。
2. **技术分析图表**: 整合 TradingView Lightweight Charts v4，渲染K线图、交易量、移动平均线（MA5, MA20, MA60, MA120）以及 RSI、MACD 辅助指标（支持鼠标缩放/拖拽）。
3. **详尽的全球市场交易时间 (Pre/Regular/After)**: 将韩国（KRX）与美国（US）市场的交易阶段细分为**盘前**、**常规交易**及**盘后**，并以时间轴形式可视化呈现。
4. **收盘价格自动冻结**: 当特定国家市场收盘时，该地区股票的实时价格跳动和闪烁动画将自动停止，维持最终收盘价。
5. **动态股票对比**: 支持同时搜索两只股票，生成1年期相对收益率变动对比图，并并排展示核心财务指标。
6. **自选股与投资组合**: 添加/删除自选股，输入持仓成本和数量，实时计算收益率与持仓盈亏（数据保存在本地 `localStorage`）。
7. **多语言 UI 支持**: 提供韩语 (KO)、英语 (EN)、日语 (JA)、中文 (ZH) 的实时无缝切换。

### 🚀 如何启动
在项目根目录下，运行以下命令即可自动创建虚拟环境并启动服务器：
```bash
./run.sh
```
服务器运行后，请通过浏览器访问以下地址：
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**

---

## 🇹🇭 ภาษาไทย (Thai)

### 🌟 คุณสมบัติหลัก
1. **ตรวจสอบดัชนีตลาดแบบเรียลไทม์**: แสดงข้อมูลดัชนีหลักทั่วโลกแบบไดนามิก เช่น KOSPI, KOSDAQ, S&P 500, NASDAQ และ DOW
2. **กราฟวิเคราะห์ทางเทคนิค (TradingView)**: เชื่อมต่อ Lightweight Charts v4 เพื่อแสดงกราฟแท่งเทียน, ปริมาณการซื้อขาย, เส้นค่าเฉลี่ยเคลื่อนที่ (MA5, MA20, MA60, MA120) รวมถึงตัวชี้วัด RSI และ MACD (รองรับการย่อขยายและลากกราฟด้วยเมาส์)
3. **แสดงเวลาการซื้อขายโดยละเอียด (Pre/Regular/After)**: แสดงสถานะการซื้อขายในตลาดเกาหลี (KRX) และตลาดสหรัฐฯ (US) แบบแบ่งเป็น 3 ช่วงเวลาหลัก ได้แก่ **ช่วงก่อนตลาดเปิด (Pre-market)**, **ช่วงเวลาทำการปกติ (Regular Session)** และ **ช่วงหลังตลาดปิด (After-market)** ในรูปแบบไทม์ไลน์
4. **การหยุดนิ่งของราคาเมื่อตลาดปิด**: เมื่อตลาดใดปิดทำการ การขยับของราคาและการกระพริบของหุ้นในโซนนั้นจะหยุดลงโดยอัตโนมัติ เพื่อรักษาข้อมูลราคาปิดล่าสุดไว้อย่างถูกต้อง
5. **การเปรียบเทียบหุ้นแบบไดนามิก**: ค้นหาและเปรียบเทียบหุ้น 2 ตัวควบคู่กัน พร้อมกราฟแสดงผลตอบแทนเปรียบเทียบในรอบ 1 ปีและเมทริกซ์การเงินที่สำคัญ
6. **รายการเฝ้าดู (Watchlist) & พอร์ตโฟลิโอ**: เพิ่ม/ลบหุ้นที่สนใจ และป้อนราคาทุนรวมถึงจำนวนหุ้นเพื่อคำนวณผลตอบแทนและกำไรขาดทุนตามเวลาจริง (บันทึกข้อมูลผ่าน `localStorage` ในตัวเครื่อง)
7. **รองรับอินเทอร์เฟซหลายภาษา**: ปรับเปลี่ยนการแสดงผลได้ทันทีระหว่างภาษาเกาหลี (KO), อังกฤษ (EN), ญี่ปุ่น (JA) และจีน (ZH)

### 🚀 วิธีเริ่มต้นใช้งาน
รันคำสั่งต่อไปนี้ในโฟลเดอร์หลักของโปรเจกต์เพื่อตั้งค่าสภาพแวดล้อมเสมือนและเริ่มทำงานของเซิร์ฟเวอร์ในขั้นตอนเดียว:
```bash
./run.sh
```
หลังจากเซิร์ฟเวอร์ทำงานเรียบร้อยแล้ว ให้เข้าใช้งานผ่านเว็บเบราว์เซอร์ที่:
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**

---

## 🇮🇳 हिन्दी (Hindi)

### 🌟 मुख्य विशेषताएं
1. **रीयल-टाइम मार्केट इंडेक्स मॉनिटरिंग**: KOSPI, KOSDAQ, S&P 500, NASDAQ और DOW जैसे प्रमुख वैश्विक सूचकांकों की लाइव स्थिति को गतिशील रूप से ट्रैक करें।
2. **तकनीकी विश्लेषण चार्ट (TradingView)**: कैंडल्स, वॉल्यूम, मूविंग एवरेज (MA5, MA20, MA60, MA120), RSI और MACD इंडिकेटर्स को प्रदर्शित करने के लिए Lightweight Charts v4 का एकीकरण (माउस से ज़ूम/ड्रैग समर्थित)।
3. **विस्तृत वैश्विक बाजार समय (Pre/Regular/After)**: दक्षिण कोरिया (KRX) और संयुक्त राज्य अमेरिका (US) के बाजारों के लिए ट्रेडिंग चरणों को **प्री-मार्केट (बाजार से पहले)**, **नियमित सत्र**, और **आफ्टर-मार्केट (बाजार के बाद)** टाइमलाइन में विभाजित करके देखें।
4. **बाजार बंद होने पर मूल्य फ्रीज**: जब कोई विशिष्ट बाजार बंद हो जाता है, तो उस क्षेत्र के शेयरों की लाइव टिक और ब्लिंक एनिमेशन स्वचालित रूप से अंतिम क्लोजिंग प्राइस पर स्थिर हो जाते हैं।
5. **डायनेमिक स्टॉक तुलना**: एक साथ दो शेयरों की खोज करें, 1-वर्षीय सापेक्ष रिटर्न चार्ट और प्रमुख वित्तीय मेट्रिक्स की समानांतर तुलना करें।
6. **वॉचलिस्ट और पोर्टफोलियो प्रबंधन**: शेयरों को जोड़ें/हटाएं और अपने खरीद मूल्य तथा मात्रा को दर्ज करके रीयล-टाइम लाभ/हानि की गणना करें (`localStorage` के माध्यम से डेटा सुरक्षित रहता है)।
7. **बहुभाषी यूजर इंटरफेस**: कोरियन (KO), इंग्लिश (EN), जैपनीज (JA), और चाइनीज (ZH) के बीच तुरंत स्विच करने की सुविधा।

### 🚀 कैसे शुरू करें
सॉफ्टवेयर पैकेज स्थापित करने और सर्वर शुरू करने के लिए प्रोजेक्ट रूट डायरेक्टरी में रन स्क्रिप्ट चलाएं:
```bash
./run.sh
```
सर्वर शुरू होने के बाद, अपने वेब ब्राउज़र में इस पते पर जाएं:
👉 **[http://localhost:8001/stock](http://localhost:8001/stock)**
