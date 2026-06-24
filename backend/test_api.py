import unittest
from fastapi.testclient import TestClient
from main import app


class TestStockAnalyzerAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_market_overview(self):
        response = self.client.get("/api/market-overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            item = data[0]
            self.assertIn("name", item)
            self.assertIn("price", item)
            self.assertIn("changePercent", item)

    def test_search(self):
        response = self.client.get("/api/search?q=AAPL")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            item = data[0]
            self.assertIn("ticker", item)
            self.assertIn("name", item)

    def test_stock_info(self):
        response = self.client.get("/api/stock/AAPL/info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get("ticker"), "AAPL")
        self.assertIn("currentPrice", data)
        self.assertIn("marketCap", data)

    def test_stock_history(self):
        response = self.client.get("/api/stock/AAPL/history?period=1mo")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            item = data[0]
            self.assertIn("time", item)
            self.assertIn("open", item)
            self.assertIn("close", item)
            # Check if MA5 indicator is calculated
            self.assertIn("ma5", item)

    def test_compare(self):
        response = self.client.get("/api/compare?tickers=AAPL,MSFT")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, dict)
        self.assertIn("AAPL", data)
        self.assertIn("MSFT", data)
        self.assertIn("data", data["AAPL"])

    def test_multiple_stocks_info(self):
        response = self.client.get("/api/stocks/info?tickers=AAPL,005930.KS")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["ticker"], "AAPL")
        self.assertEqual(data[1]["ticker"], "005930.KS")
        self.assertIn("currentPrice", data[0])


if __name__ == "__main__":
    unittest.main()
