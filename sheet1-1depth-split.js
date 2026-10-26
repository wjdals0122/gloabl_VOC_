const firstItem = $input.first().json;
const rawText = firstItem.text || firstItem.output || firstItem.response || '[]';

const country = $('Webhook (UI 입력 수신)').first().json.body?.country || 'US';
const originalKeyword = $('Webhook (UI 입력 수신)').first().json.body?.keyword || '';

let parsedList = [];
try {
  const match = String(rawText).match(/\[[\s\S]*\]/);
  const jsonStr = match ? match[0] : String(rawText).replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  parsedList = Array.isArray(parsed) ? parsed : (parsed.links || parsed.items || [parsed]);
} catch (e) {
  throw new Error(`JSON 파싱 실패! 원본 응답: ${rawText}`);
}

function hostOf(u) {
  const m = String(u).match(/^https?:\/\/([^\/?#:]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

return parsedList.map(item => {
  let rawUrl = String(item.url || item.URL || item.domain || '').trim();
  const mdLink = rawUrl.match(/\]\((https?:\/\/[^)\s]+)\)/);   // [text](url) 형태로 오면 url만
  if (mdLink) rawUrl = mdLink[1];
  const localKw = item.local_keyword || originalKeyword;

  const host = hostOf(rawUrl) || rawUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
  const isReddit = host.includes('reddit.com');
  const ddgUrl = host ? `https://html.duckduckgo.com/html/?q=site:${host}+${encodeURIComponent(localKw)}` : '';

  // 시작 순서: ① AI가 만든 사이트 검색 URL → ② 사이트 홈페이지(메뉴에서 카테고리로 내려감) → ③ DDG site: 검색
  // AI가 검색 URL 형식을 틀리게 만들 수 있어서(404/빈 페이지) 홈페이지와 DDG를 대체 경로로 같이 넘김
  const origin = (rawUrl.match(/^https?:\/\/[^\/?#]+/i) || [''])[0] || (host ? 'https://www.' + host : '');
  const homepage = origin ? origin + '/' : '';
  const hasPath = /^https?:\/\//i.test(rawUrl) && rawUrl.replace(/^https?:\/\/[^\/?#]+/i, '').length > 1;
  const chain = isReddit ? [rawUrl] : [hasPath ? rawUrl : '', homepage, ddgUrl].filter(Boolean);
  const url = chain[0] || ddgUrl;

  return {
    json: {
      url,
      fallback_urls: chain.slice(1),
      category: item.category || 'E-commerce',
      site_name: item.site_name || 'Unknown_Site',
      country: (item.country_code || country).toUpperCase(),
      keyword: localKw,
      original_keyword: originalKeyword
    }
  };
});
