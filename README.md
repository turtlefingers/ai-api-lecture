# AI API 실습 및 시각화 웹 애플리케이션 (AI API Lecture)

이 웹 애플리케이션은 디자인과 학생들에게 **AI API 요청의 핵심 구성 요소, 데이터 흐름, 그리고 Function Calling의 동작 원리**를 직관적이고 시각적으로 가르치기 위해 만들어진 프론트엔드 실습 도구입니다.

Vite + React 기반으로 제작되었으며, 매터리얼 디자인 기반의 세련되고 가독성 높은 라이트 모드 디자인과 인터랙티브한 시각화 요소를 탑재하고 있습니다.

## 🌟 주요 기능

### 1. 💬 AI Chat (채팅 탭)
- **AI 채팅창**: 마크다운 렌더링(Markdown 토글) 및 일반 텍스트 모드 전환을 제공합니다.
- **실시간 Request Payload (우측 패널)**: AI API 요청 시 실제로 전달되는 JSON 데이터의 구조를 투명하게 볼 수 있어, 데이터 흐름을 직관적으로 이해할 수 있습니다.
- **System Instruction 및 History 관리**: AI에게 내릴 시스템 지시문(System Instruction)을 목록에 추가할 수 있고, 대화 이력(History)을 유지하여 연속 대화를 할지 여부를 손쉽게 제어할 수 있습니다.
- **도구 시각화 팝업**: AI가 로컬 함수를 실행(`Function Calling`)하면 화면 중앙에 예쁜 **시각화 모달 팝업**이 뜹니다.

### 2. 🛠 Tools (도구 탭)
AI가 필요할 때 스스로 판단하여 실행할 수 있는 세 가지 로컬 도구들을 정의하고 온/오프할 수 있습니다.
- **날씨 정보 가져오기 (`getWeather`)**: Open-Meteo API를 연동하여 특정 위치의 기온, 풍속 등을 시각화된 파스텔톤 날씨 모달로 띄워줍니다.
- **국가 정보 가져오기 (`getCountry`)**: RestCountries API를 연동하여 실제 국기 이미지, 인구수, 수도 정보를 카드 형태로 띄워줍니다.
- **신디사이저 멜로디 연주 (`playMelody`)**: Tone.js를 활용하여 AI가 추천한 계이름을 재생하며, **2옥타브 가상 피아노 건반이 소리에 맞게 실시간으로 점등**됩니다. 팝업 상태에서 마우스로 건반을 클릭해 직접 연주하거나 멜로디를 다시 재생해볼 수도 있습니다.

### 3. ⚙️ Settings (설정 탭)
- **보안 중심 API Key 관리**: `localstorage-api-key-security` 설계 기법을 적용해 API Key를 브라우저 로컬 저장소에 안전하게 마스킹 보관합니다.
- **모델 선택**: `gemini-3.1-flash-lite`, `gemini-2.5-pro` 등 사용 가능한 5종의 Gemini 모델 상세 제원을 테이블로 비교해 보며 간편하게 바꿀 수 있습니다.
- **고급 제어 토글**: Structured Output, Code Execution, Search Grounding 등의 옵션을 토글하여 요청에 포함시킬 수 있습니다.

---

## 🛠 기술 스택
- **Core**: React 19, Vite 8, JavaScript
- **Libraries**:
  - `tone` (Tone.js 오디오 합성 및 피아노 건반 사운드 연주)
  - `marked` (마크다운 파싱 및 렌더링)
  - `dompurify` (안전한 마크다운 HTML 렌더링을 위한 XSS 차단 필터)
  - `lucide-react` (깔끔한 UI 아이콘 셋)
- **Styling**: Vanilla CSS (CSS Variables 기반 라이트 모드 & 매터리얼 디자인 블루 포인트 테마)

---

## 🚀 로컬 실행 방법

1. **의존성 라이브러리 설치**
   ```bash
   npm install
   ```

2. **개발용 로컬 서버 실행**
   ```bash
   npm run dev
   ```
   실행 후 브라우저에서 `http://localhost:5173/` 에 접속합니다.

3. **설정 탭 API Key 입력**
   AI Studio에서 발급받은 Gemini API Key를 **Settings** 탭에 입력하고 대화를 시작하세요.

---

## 🌐 GitHub Pages 배포 자동화 (GitHub Actions)

본 저장소는 깃허브에 업로드하는 순간 **GitHub Actions가 작동하여 자동으로 배포**되도록 구성되어 있습니다.

1. **코드 push 하기**
   ```bash
   git init
   git add .
   git commit -m "feat: AI API Lecture 실습 웹앱 업로드"
   git branch -M main
   git remote add origin <사용자_저장소_주소>
   git push -u origin main
   ```
   *참고: `.gitignore` 설정에 의해 기획서 등이 포함된 `blueprint/` 폴더는 커밋에서 자동으로 제외됩니다.*

2. **GitHub Pages 빌드 소스 변경**
   - 사용자 저장소 웹페이지의 **Settings** -> **Pages** 탭으로 이동합니다.
   - **Build and deployment** 섹션의 **Source**를 **`GitHub Actions`**로 변경합니다.
   - 1~2분 뒤 자동으로 제공되는 도메인 주소로 배포 완료됩니다!
