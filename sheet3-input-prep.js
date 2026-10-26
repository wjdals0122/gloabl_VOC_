// 이번 단계(depth)에서 방문할 URL 목록을 정리합니다.
// 시트 1에서 처음 호출되면 depth=0 (DDG 검색 URL), 재귀 호출이면 depth>=1
const MAX_DEPTH = 6;        // 비상 브레이크: 정상적인 양판점이면 닿지 않는 깊이

const items = $input.all().map(i => i.json).filter(j => j && j.url && !j._noop);
if (!items.length) return [];

// "euro.com.pl"처럼 https:// 없이 오면 상대경로 링크를 못 붙이므로 보정
items.forEach(j => {
  j.url = String(j.url).trim();
  if (!/^https?:\/\//i.test(j.url)) j.url = 'https://' + j.url.replace(/^\/+/, '');
});

const first = items[0];
const depth = Number(first.depth || 0);
if (depth > MAX_DEPTH) return [];

const visited = new Set(first.visited || []);

// 검색 모드: 영문+숫자가 섞인 5자 이상 토큰(모델 코드)이 있으면 MODEL, 아니면 CATEGORY(제품군)
const kwSrc = String(first.original_keyword || first.keyword || '');
const isModelCode = kwSrc.split(/\s+/).some(t => t.length >= 5 && /[A-Za-z]/.test(t) && /\d/.test(t));
const searchMode = first.search_mode || (isModelCode ? 'MODEL' : 'CATEGORY');
// 한 단계에서 여는 최대 페이지 수 (크레딧 보호). 제품군은 여러 브랜드를 넓게 봐야 해서 더 많이
const MAX_PER_LEVEL = searchMode === 'CATEGORY' ? 20 : 10;

// 기준 도메인: DDG URL의 site:도메인, 없으면 URL 호스트
let rootDomain = first.root_domain || '';
if (!rootDomain) {
  try {
    const m = decodeURIComponent(first.url).match(/site:([^\s+&]+)/);
    rootDomain = (m ? m[1] : ((String(first.url).match(/^https?:\/\/([^\/?#:]+)/i) || [])[1] || '')).replace(/^www\./, '');
  } catch (e) {
    rootDomain = '';
  }
}

const picked = [];
for (const j of items) {
  const url = String(j.url).trim();
  if (visited.has(url) && !j.retry) continue;   // 차단 재시도(retry>0)는 다시 방문 허용
  visited.add(url);
  picked.push({ ...j, url });
  if (picked.length >= MAX_PER_LEVEL) break;
}

const visitedArr = [...visited];
return picked.map(j => ({
  json: {
    url: j.url,
    depth,
    root_domain: rootDomain,
    keyword: j.keyword || '',
    original_keyword: j.original_keyword || j.keyword || '',
    category: j.category || 'E-commerce',
    site_name: j.site_name || rootDomain || 'External_Site',
    country: j.country || '',
    search_mode: searchMode,
    review_hops: Number(j.review_hops || 0),
    retry: Number(j.retry || 0),
    // 시작 URL이 실패하면 순서대로 시도할 대체 URL (시트 1: [홈페이지, DDG 검색])
    fallback_urls: Array.isArray(j.fallback_urls) ? j.fallback_urls : (j.fallback_url ? [j.fallback_url] : []),
    visited: visitedArr
  }
}));
