// AI 판정 결과를 리뷰 행(reviews)과 다음 단계 링크(next)로 나눕니다.
// 페이지당 다음 링크 수 / 제품당 리뷰 페이지를 몇 쪽까지 따라갈지 (모드별)
const LIMITS = {
  MODEL:    { list: 3,  review: 3, reviewHops: 5 },   // 모델 하나를 깊게
  CATEGORY: { list: 10, review: 1, reviewHops: 2 }    // 여러 제품을 넓게, 제품당 리뷰 1~2쪽
};
const pages = $('페이지 준비').all().map(i => i.json);

function makeHash(str) {
  let h = 0;
  const s = String(str).trim();
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36);
}

function normalize(link, base) {
  if (typeof link !== 'string') return '';
  let u = link.trim().replace(/^<|>$/g, '');
  const md = u.match(/\]\((.+)\)$/);          // [text](url) 형태로 오면 url만
  if (md) u = md[1];
  const uddg = u.match(/uddg=([^&]+)/);
  if (uddg) { try { u = decodeURIComponent(uddg[1]); } catch (e) {} }
  // n8n Code 노드 샌드박스에는 URL 객체가 없을 수 있어서 정규식으로 처리
  u = u.split('#')[0];
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  const origin = (String(base).match(/^https?:\/\/[^\/?#]+/i) || [''])[0];
  if (origin && u.startsWith('/')) return origin + u;
  return '';
}

function hostOf(u) {
  const m = String(u).match(/^https?:\/\/([^\/?#:]+)/i);
  return m ? m[1].toLowerCase() : '';
}

const reviews = [];
const nextMap = new Map();
const log = [];

$input.all().forEach((item, i) => {
  const p = pages[i];
  if (!p) return;

  let type = 'IRRELEVANT';
  let revs = [];
  let links = [];
  let sellers = [];
  const lim = LIMITS[p.search_mode] || LIMITS.CATEGORY;

  if (p.scrape_error) {
    type = p.scrape_error.startsWith('BLOCKED') ? 'BLOCKED' : 'SCRAPE_FAIL';   // AI 응답은 믿지 않음
  } else if (!p.is_ddg && item.json.error) {
    type = "AI_ERROR";   // OpenAI 호출 실패 (재시도 3회 후)
  } else if (p.is_ddg) {
    type = 'SEARCH';
    // 기사/랭킹/블로그보다 제품 페이지(숫자 ID 경로)를 먼저 방문
    const isArticle = u => /magazyn|blog|poradnik|artyku|ranking|news|guide|ratgeber|forum/i.test(u);
    const hasId = u => /\/\d{5,}/.test(u);
    links = [...(p.ddg_links || [])].sort((a, b) => (isArticle(a) - isArticle(b)) || (hasId(b) - hasId(a)));
  } else {
    const raw = String(item.json.text || item.json.output || '{}');
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : raw);
      type = String(parsed.page_type || 'IRRELEVANT').toUpperCase();
      revs = Array.isArray(parsed.reviews) ? parsed.reviews : [];
      links = Array.isArray(parsed.next_links) ? parsed.next_links : [];
      // AI는 [링크 목록]의 번호를 줌 → 실제 URL로 변환 (혹시 URL을 주면 그대로)
      const list = p.link_list || [];
      links = links.map(l => /^\d+$/.test(String(l).trim()) ? list[Number(l)] : l).filter(Boolean);
      sellers = Array.isArray(parsed.sellers) ? parsed.sellers.filter(s => typeof s === 'string' && s.trim()) : [];
    } catch (e) {
      type = 'PARSE_ERROR';
    }
  }

  for (const v of revs) {
    if (!v || !v.content) continue;
    reviews.push({
      voc_id: `EXT_${makeHash(p.url + String(v.content).substring(0, 120))}`,
      source_site: p.site_name || 'External_Site',
      category: p.category || 'E-commerce',
      content_type: v.content_type || 'REVIEW',
      content: String(v.content),
      parent_id: p.url,
      published_at: v.published_at || null,
      sellers                                   // 가격비교 사이트의 판매처 이름 (확인용, DB 칼럼 없음)
    });
  }

  const visited = new Set(p.visited || []);
  let added = 0;
  const skip = { bad_url: 0, visited: 0, other_domain: [] };  // 링크가 왜 탈락했는지 (디버깅용)
  let root = String(p.root_domain || '').replace(/^www\./, '');
  if (root.includes('duckduckgo')) root = '';  // site: 파싱 실패로 DDG 호스트가 들어오면 모든 링크가 탈락하므로 무시
  const isProduct = type === 'PRODUCT';
  const hops = Number(p.review_hops || 0) + (isProduct ? 1 : 0);
  let linkLimit = p.is_ddg ? 8 : (isProduct ? lim.review : lim.list);
  if (isProduct && hops > lim.reviewHops) linkLimit = 0;   // 리뷰 페이지를 충분히 따라감
  if (!['IRRELEVANT', 'PARSE_ERROR', 'BLOCKED', 'SCRAPE_FAIL', 'AI_ERROR'].includes(type)) {
    for (const l of links) {
      if (added >= linkLimit) break;
      const url = normalize(l, p.url);
      if (!url.startsWith('http')) { skip.bad_url++; continue; }
      if (visited.has(url) || nextMap.has(url)) { skip.visited++; continue; }
      let host = '';
      host = hostOf(url).replace(/^www\./, '');
      if (!host) { skip.bad_url++; continue; }
      if (host.includes('duckduckgo')) { skip.other_domain.push(host); continue; }  // DDG 광고/내부 링크
      if (root && !host.endsWith(root)) { skip.other_domain.push(host); continue; }  // 양판점 밖으로 나가지 않음
      nextMap.set(url, {
        url,
        depth: p.depth + 1,
        root_domain: root || host,
        keyword: p.keyword,
        original_keyword: p.original_keyword,
        category: p.category,
        site_name: p.site_name,
        country: p.country,
        search_mode: p.search_mode,
        review_hops: hops,
        visited: p.visited
      });
      added++;
    }
  }

  const MAX_RETRY = 2;
  const failed = type === 'BLOCKED' || type === 'SCRAPE_FAIL';
  const fb = Array.isArray(p.fallback_urls) ? p.fallback_urls : [];
  const canRetry = type === 'BLOCKED' || !fb.length;   // 검색 URL 형식 오류(404 등)는 재시도 말고 바로 다음 대체 URL로
  let fellBack = false;
  if (failed && canRetry && Number(p.retry || 0) < MAX_RETRY && !nextMap.has(p.url)) {
    nextMap.set(p.url, {
      url: p.url,
      depth: p.depth,                 // 같은 단계로 다시 시도 (깊이 제한에 안 걸리게)
      root_domain: p.root_domain,
      keyword: p.keyword,
      original_keyword: p.original_keyword,
      category: p.category,
      site_name: p.site_name,
      country: p.country,
      search_mode: p.search_mode,
      review_hops: p.review_hops,
      retry: Number(p.retry || 0) + 1,
      fallback_urls: fb,
      visited: p.visited
    });
  } else if (fb.length && (failed || added === 0) && !nextMap.has(fb[0])) {
    // 시작 URL이 막혔거나 결과(다음 링크)가 없으면 다음 대체 URL로 (홈페이지 → DDG 순)
    nextMap.set(fb[0], {
      url: fb[0],
      depth: p.depth,
      root_domain: p.root_domain,
      keyword: p.keyword,
      original_keyword: p.original_keyword,
      category: p.category,
      site_name: p.site_name,
      country: p.country,
      search_mode: p.search_mode,
      review_hops: p.review_hops,
      retry: 0,
      fallback_urls: fb.slice(1),
      visited: p.visited
    });
    fellBack = true;
  }

  log.push({ retry: Number(p.retry || 0), fallback_to_ddg: fellBack || undefined,  depth: p.depth, url: p.url, type, reviews: revs.length, next_links: added, error: p.scrape_error, md_len: p.md_len, md_head: p.md_head, link_count: (p.link_list || []).length, root_domain: p.root_domain, candidates: links.length, mode: p.search_mode, sellers: sellers.length, skip });
});

return [{ json: { reviews, next: [...nextMap.values()], log } }];
