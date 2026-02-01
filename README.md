## 📘 BondInsight-AI-Assistant
BondInsight-AI-Assistant 는 PDF 형태의 채권/채권형 펀드 문서를 업로드하면 자동으로 분석하여
✔️ 문서 유형 분류
✔️ 주요 계약/리스크 항목 추출
✔ 리스크 중심 요약
✔ 최악 시나리오 분석
까지 한 번에 처리해주는 AI 기반 금융 문서 분석 도구입니다.

## 🧠 프로젝트 목적

금융 문서 (예: 채권 설명서, 펀드 설명서 등)는 매우 길고 복잡하며, 수작업으로 내용을 파악하기 어렵습니다.
이 저장소는 PDF → 텍스트 → 구조화된 데이터 → AI 분석의 전체 파이프라인을 자동화하여 분석 시간을 획기적으로 줄이고,
전문가가 핵심 리스크와 특이조건을 빠르게 이해할 수 있도록 돕습니다.

## 📂 구조
```sh
bondinsight-ai-assitant/
├─ server/                   # 백엔드 코드
│   ├─ index.js             # 서버 엔트리포인트, 분석 API 정의
│   ├─ solar.js             # Upstage API 래퍼
│   └─ package.json         # 서버 의존성
├─ client/                   # 프론트엔드 앱
│   ├─ src/
│   │   ├─ api.ts           # 서버 API 호출 함수
│   │   ├─ PdfUpload.tsx    # 파일 업로드 컴포넌트
│   │   └─ App.tsx          # 메인 UI
│   └─ package.json
├─ .gitignore
└─ 기타 설정 파일
```

- server/index.js : 업로드된 PDF 파싱하고 여러 AI 분석(정보 추출/분류/요약/리스크)를 호출하는 API 제공
- server/solar.js : Upstage AI 관련 호출 래퍼 (Solar LLM)
- client/src/ : React 기반 UI로 PDF 업로드 및 결과 표시


## ⚙️ 실행 방법
### 📌 서버
```sh
cd server
export UPSTAGE_API_KEY=발급된_API_KEY
npm install
npm start
```

### 📌 클라이언트
```sh
cd client
npm install
npm run dev
```

브라우저에서 열고 PDF 업로드 → 분석 결과 확인 흐름으로 사용합니다.

## 🚀 기능 설명

### ✔ PDF 파싱 (Document Digitization)
- Upstage API를 이용해 PDF 문서를 HTML/Text로 변환합니다.
- OCR 자동 적용으로 스캔본 PDF도 처리 가능합니다.
- 테이블/좌표 정보까지 포함하여 문서 구조를 최대한 보존합니다.

---

### ✔ 주요 정보 추출 (Information Extraction)
- 파싱된 텍스트에서 채권/펀드 핵심 정보를 구조화된 JSON으로 추출합니다.
- 추출 항목 예시:
  - **Bond Terms**
    - 만기(maturity)
    - 쿠폰(coupon)
    - 콜/풋 조건(call/put)
    - 신용 리스크(credit risk)
    - 손실 시나리오(loss scenarios)
  - **Fund Terms**
    - 전략(strategy)
    - 듀레이션 리스크(duration risk)
    - 수수료(fees)
    - 벤치마크(benchmark)
    - 주요 리스크(key risks)

---

### ✔ 문서 유형 분류 (Document Classification)
- 문서가 어떤 유형인지 자동 분류합니다.
- 현재 지원하는 분류:
  - Bond Prospectus
  - Bond Index Fund Prospectus

---

### ✔ 리스크 중심 요약 (Risk-first Summary)
- Front-office 딜러 관점으로 문서를 요약합니다.
- 요약 규칙:
  - 리스크 중심(위험요인 먼저)
  - 마케팅 톤 제거
  - 하방 리스크 강조

<img width="1878" height="1816" alt="image" src="https://github.com/user-attachments/assets/82510011-e3a3-4ddf-bf83-e6ce25c4959f" />

---

### ✔ Worst-case 시나리오 분석
- 금리 급등 / 신용 스프레드 확대 / 유동성 스트레스 등 상황을 가정하여 최악 시나리오를 시뮬레이션합니다.
- 결과는 다음 항목 중심으로 제공:
  1. 무엇이 가장 먼저 깨지는가
  2. 잠재적 손실 요인
  3. 주의해야 하는 대상/투자자 유형

<img width="919" height="901" alt="image" src="https://github.com/user-attachments/assets/ef2fdce1-c7d5-4023-ab4a-27dc57f4fcf1" />

---

### ✔ AI Agent Q&A (문서 기반 질의응답)
- 문서에서 추출한 정보만을 기반으로 질문에 답합니다.
- 문서에 없는 정보는 **“문서에 명시되어 있지 않습니다.”** 로 응답합니다.
- 투자 판단 질문에 대해서는 **추천을 하지 않고 리스크만 설명**합니다.

## 🧪 API
| Endpoint                 | 설명                |
| ------------------------ | ----------------- |
| POST `/parse`            | PDF 파싱            |
| POST `/extract`          | 텍스트 → 구조화 데이터     |
| POST `/solar/classify`   | 문서 유형 분류          |
| POST `/solar/summary`    | 리스크 중심 요약         |
| POST `/solar/worst-case` | Worst-Case 리스크 분석 |
| POST `/solar/chat`       | Q&A               |


## 🧩 개발자 참고
- 서버는 Express.js 기반
- 프론트는 React + Vite 
- Upstage API 기반 LLM 활용
