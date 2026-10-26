// 스크래핑 결과 정리. DDG 검색결과는 AI 없이 코드로 링크를 뽑습니다.
const src = $('입력 정리').item.json;
const md = $json.markdown || '';
// ScrapingAnt 마크다운은 80자 근처에서 줄을 바꾸면서 링크 URL 중간에도 줄바꿈을 넣음 → (…) 안의 줄바꿈 제거
const mdn = md.replace(/\]\(([^)]*)\)/g, (m, u) => '](' + u.replace(/\s*\n\s*/g, '') + ')');
const isDdg = src.url.includes('duckduckgo.com');

let ddgLinks = [];
if (isDdg) {
  ddgLinks = [...mdn.matchAll(/uddg=([^&)\s]+)/g)]
    .map(m => { try { return decodeURIComponent(m[1]); } catch (e) { return ''; } })
    .filter(u => u.startsWith('http') && !u.includes('duckduckgo.com/y.js'));  // 광고 제외
  ddgLinks = [...new Set(ddgLinks)];
}

// 봇 차단/캡차 페이지 감지 (ceneo 캡차, Cloudflare "잠시만 기다리십시오" 등). 이런 페이지를 AI에 주면 링크를 지어냄
const BLOCK_RE = /captcha|nie jesteś robotem|po drugiej stronie siedzi człowiek|przejdź dalej|just a moment|verify you are human|are you a robot|access denied|attention required|cf-chl|unusual traffic|bitte bestätigen|robot check|bots use duckduckgo|search was made by a human|select all squares|żądanie zostało zablokowane|request (has been|was) blocked/i;
const HARD_BLOCK_RE = /cf-chl|challenge-platform|just a moment|checking your browser|verify you are human|po drugiej stronie siedzi człowiek|nie jesteś robotem|captcha\/add|żądanie zostało zablokowane/i;
const blocked = !!md && ((md.length < 5000 && BLOCK_RE.test(md)) || HARD_BLOCK_RE.test(md.slice(0, 20000)));
const scrapeError = !md
  ? 'SCRAPE_FAIL: ' + String($json.error?.message || $json.message || 'empty markdown').slice(0, 200)
  : (blocked ? 'BLOCKED: 봇 차단/캡차 페이지' : null);

// 링크는 AI가 지어내지 않도록 코드로 전부 뽑아서 번호를 붙여 보여줍니다. (AI는 번호만 고름)
const MAX_LINKS = 200;
const origin = (String(src.url).match(/^https?:\/\/[^\/?#]+/i) || [''])[0];
const root = String(src.root_domain || '').replace(/^www\./, '');
const JUNK = /login|logowanie|rejestr|koszyk|cart|basket|checkout|account|konto|privacy|polityka|regulamin|cookie|facebook|instagram|youtube|twitter|tiktok|pinterest|linkedin|mailto:|tel:|javascript:|\.(jpe?g|png|gif|webp|svg|css|js|ico)(\?|$)/i;
const kwParts = String(src.keyword + ' ' + src.original_keyword).toLowerCase()
  .split(/[\s\-_+,]+/).filter(t => t.length >= 4).map(t => t.slice(0, 5));

function absUrl(u) {
  u = String(u).trim().split('#')[0];
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('/') && origin) return origin + u;
  return '';
}

const linkMap = new Map();   // url -> { text, pos }
if (!isDdg && !scrapeError) {
  // 1) [텍스트](url) 형태  2) 이미지로 감싼 링크 등 나머지 ](url) 형태
  for (const m of mdn.matchAll(/(!?)\[([^\[\]]*)\]\(\s*<?([^)\s>]+)/g)) {
    if (m[1] === '!') continue;
    const url = absUrl(m[3]);
    if (url && !linkMap.has(url)) linkMap.set(url, { text: m[2].replace(/\s+/g, ' ').trim(), pos: m.index });
  }
  for (const m of mdn.matchAll(/\]\(\s*<?([^)\s>]+)/g)) {
    const url = absUrl(m[1]);
    if (url && !linkMap.has(url)) linkMap.set(url, { text: '', pos: m.index });
  }
}

const here = String(src.url).split('#')[0];
const candidates = [...linkMap.entries()]
  .filter(([url]) => url !== here && !JUNK.test(url))
  .filter(([url]) => {
    const host = ((url.match(/^https?:\/\/([^\/?#:]+)/i) || [])[1] || '').toLowerCase().replace(/^www\./, '');
    return host && (!root || host.endsWith(root));
  })
  .map(([url, v]) => {
    const t = (v.text + ' ' + url).toLowerCase();
    let score = 0;
    if (kwParts.some(k => t.includes(k))) score += 3;                    // 찾는 제품 관련
    if (/\/\d{5,}/.test(url)) score += 2;                                 // 제품 ID 경로
    if (/opini|review|recenz|bewert|avis|rating|ocen/i.test(t)) score += 2;  // 리뷰 관련
    if (/[?&;](page|p|strona)=?\d|;\d+-\d+\.htm/i.test(url)) score += 1;   // 페이지네이션
    return { url, text: v.text, pos: v.pos, score };
  })
  .sort((a, b) => (b.score - a.score) || (a.pos - b.pos))
  .slice(0, MAX_LINKS);

const linkList = candidates.map(c => c.url);
const pageLinks = candidates
  .map((c, i) => i + '. ' + (c.text.slice(0, 70) || '(이미지/텍스트 없음)') + ' | ' + c.url.replace(origin, ''))
  .join('\n');

// 본문 정리: 이미지 제거, 링크는 텍스트만 남김(URL이 대부분의 분량이라 이것만으로 크게 줄어듦)
// 링크가 3개 이상 붙어 있는 줄(메가 메뉴/푸터)만 통째로 뺌 → 짧은 리뷰("Polecam!" 등)는 지우지 않음
const content = mdn.split('\n')
  .map(line => {
    const linkCount = (line.match(/\]\(/g) || []).length;
    if (linkCount >= 3) return null;
    return line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\s+/g, ' ').trim();
  })
  .filter(l => l !== null)
  .join('\n')
  .replace(/\n{3,}/g, '\n\n');

// AI에 넘길 본문: 길면 앞부분 + 리뷰 구간(opinie/review 등이 처음 나오는 곳부터)을 이어 붙임
const BODY_LIMIT = 30000;
let body = content;
if (content.length > BODY_LIMIT) {
  const head = content.slice(0, 8000);
  const rest = content.slice(8000);
  const idx = rest.search(/opini|recenz|review|bewert|avis|ocen[ay]|gwiazd|stars?\b|rating/i);
  body = head + '\n...\n' + (idx >= 0 ? rest.slice(Math.max(0, idx - 500)) : rest).slice(0, BODY_LIMIT - 8000);
}

return {
  json: {
    ...src,
    is_ddg: isDdg,
    ddg_links: ddgLinks,
    scrape_error: scrapeError,
    md_len: md.length,                                   // 차단 판정 검증용
    md_head: scrapeError ? md.slice(0, 200) : content.slice(0, 300),  // 실제 받은 내용 앞부분 (차단이면 원문, 아니면 메뉴 뺀 본문)
    link_list: linkList,
    page_links: pageLinks || '(링크 없음)',
    page_markdown: isDdg
      ? '(검색엔진 결과 페이지 - 판정 불필요. IRRELEVANT로 응답)'
      : scrapeError
        ? '(수집 실패/차단 페이지 - 판정 불필요. IRRELEVANT로 응답)'
        : (body || '(빈 페이지)')
  }
};
