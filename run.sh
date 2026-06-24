#!/bin/bash

# Exit on error
set -e

# Set working directory to script location
cd "$(dirname "$0")"

echo "=== Stock Analyzer 시작 스크립트 ==="

# 1. 파이썬 가상환경 확인 및 활성화
if [ ! -d "venv" ]; then
    echo "[1/3] 파이썬 가상환경을 생성하는 중..."
    python3 -m venv venv
fi

echo "[2/3] 가상환경 활성화 및 패키지 확인..."
source venv/bin/activate

# 2. 패키지 설치
echo "종속성 설치 확인 중..."
pip install -r backend/requirements.txt

# 3. FastAPI 백엔드 서버 구동
echo "[3/3] FastAPI 백엔드 서버 구동 중..."
echo "서버가 구동되면 브라우저에서 아래 주소로 접속해 주세요:"
echo "👉 http://127.0.0.1:8001/stockanalysis"
echo "==================================="

# Run uvicorn
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
