// n8n 없이 ScrapingAnt + 시트 3 "페이지 준비" 로직을 그대로 돌려보는 테스트
// 사용법 (PowerShell):
//   $env:SCRAPINGANT_API_KEY = "본인 키"
//   node test-scrape.js "https://www.mediaexpert.pl/" PL "pralka z suszarką"
const fs = require('fs');
const path = require('path');

const [url, country = 'PL', keyword = 'pralka z suszarką', proxyType = 'residential'] = process.argv.slice(2);
const key = process.env.SCRAPINGANT_API_KEY;
if (!url || !key) {
  console.log('사용법: $env:SCRAPINGANT_API_KEY="키"; node test-scrape.js <URL> [국가] [키워드] [residential|datacenter]');
  process.exit(1);
}

const wf = require(path.join(__dirname, 'sheet3-recursive-crawler.json'));
const code = name => wf.nodes.find(n => n.name === name).parameters.jsCode;

(async () => {
  // 1) 입력 정리 (n8n과 같은 코드)
  const input = new Function('$input', code('입력 정리'))({ all: () => [{ json: { url, country, keyword, original_keyword: keyword } }] })[0].json;

  // 2) ScrapingAnt 호출 (n8n 노드와 같은 파라미터)
  const qs = new URLSearchParams({ url: input.url, browser: 'true', proxy_country: country === 'UK' ? 'GB' : country, proxy_type: proxyType });
  const t0 = Date.now();
  const res = await fetch('https://api.scrapingant.com/v2/markdown?' + qs, { headers: { 'x-api-key': key } });
  const body = await res.text();
  console.log(`ScrapingAnt: HTTP ${res.status} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  let json = {};
  try { json = JSON.parse(body); } catch (e) { json = { error: { message: body.slice(0, 300) } }; }
  if (!res.ok) json = { error: { message: `HTTP ${res.status}: ${body.slice(0, 300)}` } };

  // 3) 페이지 준비 (n8n과 같은 코드)
  const page = new Function('$', '$json', code('페이지 준비'))(() => ({ item: { json: input } }), json).json;

  console.log('요청 URL     :', input.url);
  console.log('기준 도메인  :', input.root_domain);
  console.log('받은 길이    :', page.md_len);
  console.log('차단/실패    :', page.scrape_error || '없음');
  console.log('앞부분       :', String(page.md_head || '').replace(/\s+/g, ' ').slice(0, 300));
  console.log('뽑힌 링크 수 :', page.link_list.length);
  console.log('상위 링크 15개:\n' + page.page_links.split('\n').slice(0, 15).join('\n'));

  const out = path.join(__dirname, 'test-scrape-result.md');
  fs.writeFileSync(out, json.markdown || body);
  console.log('\n원본 마크다운 저장:', out);
})();
