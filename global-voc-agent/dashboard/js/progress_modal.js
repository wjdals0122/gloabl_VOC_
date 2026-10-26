/**
 * dashboard/js/progress_modal.js
 * 실시간 VOC 수집 및 AI 분석 프로그레스 모달 컨트롤러 (Emil Kowalski Design Eng)
 */

const VocProgressModal = {
  overlayId: 'voc-progress-overlay',
  timer: null,

  steps: [
    {
      pct: 18,
      count: '24건',
      icon: '📡',
      text: '글로벌 네트워크 우회 연결 및 수집 채널 탐색 중...',
      sub: '수집 대상 채널: Reddit, AVS Forum, Best Buy, Home Depot'
    },
    {
      pct: 42,
      count: '61건',
      icon: '💬',
      text: 'Reddit 및 현지 가전 포럼 실사용 토론 수집 중...',
      sub: '해외 커뮤니티 게시글 및 실사용 댓글 61건 확보'
    },
    {
      pct: 76,
      count: '112건',
      icon: '⭐',
      text: 'Best Buy 및 전문 리뷰 사이트 구매 평점 수집 중...',
      sub: '실구매 리뷰 및 세부 평점 51건 추가 확보'
    },
    {
      pct: 92,
      count: '112건',
      icon: '🧠',
      text: 'Gemini AI 감성 분석 및 다국어 번역 클러스터링 중...',
      sub: '긍정 및 부정 감성 태깅 및 핵심 1위부터 5위 키워드 분류'
    },
    {
      pct: 100,
      count: '112건',
      icon: '✅',
      text: '수집 및 AI 분석 완료! 대시보드로 이동합니다.',
      sub: '총 112건 수집 완료 및 시계열 추이 분석 리포트 생성 완료'
    }
  ],

  start(targetMeta, onComplete) {
    const overlay = document.getElementById(this.overlayId);
    if (!overlay) {
      if (onComplete) onComplete();
      return;
    }

    const metaEl = document.getElementById('progress-target-meta');
    const pctEl = document.getElementById('progress-pct-number');
    const countEl = document.getElementById('progress-items-count');
    const barEl = document.getElementById('progress-bar-fill');
    const iconEl = document.getElementById('progress-status-icon');
    const textEl = document.getElementById('progress-status-text');
    const subEl = document.getElementById('progress-channels-sub');

    if (metaEl && targetMeta) {
      const countryName = targetMeta.country === 'KR' ? '대한민국(KR)' : '미국(US)';
      const channelName = targetMeta.channel === 'community' ? '커뮤니티' : 
                          targetMeta.channel === 'reviews' ? '제품리뷰' : '통합 채널';
      metaEl.textContent = `${countryName} | "${targetMeta.keyword}" | ${channelName}`;
    }

    // 초기화
    if (pctEl) pctEl.textContent = '0%';
    if (countEl) countEl.innerHTML = '수집 데이터: <strong>0건</strong>';
    if (barEl) barEl.style.width = '0%';
    if (iconEl) iconEl.textContent = '📡';
    if (textEl) textEl.textContent = '글로벌 수집 파이프라인 가동 준비 중...';
    if (subEl) subEl.textContent = '수집 대상 채널: Reddit, AVS Forum, Best Buy, Home Depot';

    // 표시
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
    });

    if (this.timer) clearInterval(this.timer);

    let stepIndex = 0;
    const totalDuration = 2400; // 약 2.4초
    const intervalTime = totalDuration / this.steps.length;

    this.timer = setInterval(() => {
      if (stepIndex < this.steps.length) {
        const step = this.steps[stepIndex];
        if (pctEl) pctEl.textContent = `${step.pct}%`;
        if (countEl) countEl.innerHTML = `수집 데이터: <strong>${step.count}</strong>`;
        if (barEl) barEl.style.width = `${step.pct}%`;
        if (iconEl) iconEl.textContent = step.icon;
        if (textEl) textEl.textContent = step.text;
        if (subEl) subEl.textContent = step.sub;

        stepIndex++;
      } else {
        clearInterval(this.timer);
        this.timer = null;

        // 완료 후 0.38초 대기 후 부드럽게 닫힘
        setTimeout(() => {
          overlay.classList.remove('is-visible');
          setTimeout(() => {
            overlay.style.display = 'none';
            if (onComplete) onComplete();
          }, 250);
        }, 380);
      }
    }, intervalTime);
  }
};

if (typeof window !== 'undefined') {
  window.VocProgressModal = VocProgressModal;
}
