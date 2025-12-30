# PWA (Progressive Web App) 개발 계획서

## 1. 개요

**목표:** Wallet Card Dashboard를 PWA로 전환하여 모바일에서 네이티브 앱처럼 동작하도록 함

**주요 기능:**
- 홈 화면에 앱 아이콘 추가
- 전체화면 모드 (주소창 숨김)
- 오프라인 지원 (캐싱)
- 앱 설치 프롬프트

---

## 2. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| PWA 프레임워크 | next-pwa | Next.js와 완벽한 호환, 자동 Service Worker 생성 |
| 아이콘 생성 | 수동 생성 | 간단한 SVG 기반 아이콘 |
| 설치 프롬프트 | beforeinstallprompt API | 표준 Web API 활용 |

---

## 3. 구현 단계

### Phase 1: 기본 PWA 설정

#### 3.1 패키지 설치
```bash
npm install next-pwa
```

#### 3.2 Web App Manifest 생성
- `public/manifest.json` 파일 생성
- 앱 이름, 아이콘, 테마 색상, 디스플레이 모드 설정

#### 3.3 next.config.ts 수정
- next-pwa 플러그인 추가
- Service Worker 설정

### Phase 2: 메타 태그 및 아이콘

#### 3.4 layout.tsx 메타 태그 추가
- Apple Touch Icon
- Theme Color
- Apple Mobile Web App 설정
- Viewport 설정 (standalone 모드)

#### 3.5 앱 아이콘 생성
- 192x192 PNG
- 512x512 PNG
- Apple Touch Icon 180x180
- Favicon

### Phase 3: 앱 설치 기능

#### 3.6 PWA 설치 훅 생성
- `usePWAInstall` 훅 생성
- beforeinstallprompt 이벤트 핸들링
- 설치 상태 관리

#### 3.7 설정 메뉴에 앱 설치 버튼 추가
- SettingsSheet.tsx에 "앱 설치" 메뉴 추가
- 설치 가능 여부에 따른 UI 분기
- iOS용 안내 메시지 (수동 설치 필요)

---

## 4. 파일 구조

```
public/
├── manifest.json          # Web App Manifest
├── icons/
│   ├── icon-192x192.png   # Android/PWA 아이콘
│   ├── icon-512x512.png   # 스플래시 스크린용
│   ├── apple-touch-icon.png  # iOS 아이콘
│   └── favicon.ico        # 파비콘
└── sw.js                  # Service Worker (자동 생성)

src/
├── hooks/
│   └── usePWAInstall.ts   # PWA 설치 훅
├── components/
│   └── settings/
│       └── SettingsSheet.tsx  # 앱 설치 버튼 추가
└── app/
    └── layout.tsx         # PWA 메타 태그 추가
```

---

## 5. manifest.json 스펙

```json
{
  "name": "가계부 - Wallet Dashboard",
  "short_name": "가계부",
  "description": "부부의 금융 결제 내역을 통합 관리하는 가계부 앱",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#3182F6",
  "orientation": "portrait",
  "icons": [...]
}
```

---

## 6. 플랫폼별 설치 방식

### Android / Chrome
- `beforeinstallprompt` 이벤트로 자동 설치 프롬프트
- "앱 설치" 버튼 클릭 시 네이티브 설치 다이얼로그

### iOS / Safari
- 수동 설치 필요 (Safari의 "홈 화면에 추가")
- 설치 안내 메시지 표시

### Desktop Chrome / Edge
- `beforeinstallprompt` 지원
- 브라우저 주소창의 설치 아이콘 또는 버튼 클릭

---

## 7. 체크리스트

- [ ] next-pwa 패키지 설치
- [ ] manifest.json 생성
- [ ] next.config.ts PWA 설정
- [ ] 앱 아이콘 생성 (192, 512, apple-touch)
- [ ] layout.tsx 메타 태그 추가
- [ ] usePWAInstall 훅 생성
- [ ] SettingsSheet에 앱 설치 버튼 추가
- [ ] iOS 설치 안내 다이얼로그
- [ ] 테스트 (Android, iOS, Desktop)
- [ ] Current_Status.md 업데이트

---

## 8. 예상 소요 시간

| 단계 | 작업 |
|------|------|
| Phase 1 | 기본 PWA 설정 |
| Phase 2 | 메타 태그 및 아이콘 |
| Phase 3 | 앱 설치 기능 |
| 테스트 | 크로스 플랫폼 테스트 |

---

*작성일: 2025-12-30*
