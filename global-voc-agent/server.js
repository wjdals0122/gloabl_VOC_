/**
 * AI Agent/global-voc-agent/server.js
 * 글로벌 VOC 수집 대시보드 로컬 정적 서빙 및 테스트용 Mock API 서버
 * (Node.js 내장 모듈만 사용하여 별도 npm install 없이 즉시 실행 가능)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3005;
const DASHBOARD_DIR = path.join(__dirname, 'dashboard');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- [로컬 Mock API 엔드포인트: 백엔드 팀원 규격 테스트용] ---
  if (req.method === 'POST' && pathname === '/webhook/discover-voc-sources') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const country = payload.country || 'US';
        const product = payload.product || 'Standard Product';

        const mockResponse = {
          status: 'success',
          meta: { country, product, total_discovered: 3, timestamp: new Date().toISOString() },
          sources: [
            {
              source_id: `mock_${country.toLowerCase()}_retail_01`,
              site_name: `${country} Premier Retail`,
              url: `https://example.com/${country.toLowerCase()}/product-reviews`,
              category: 'E-Commerce',
              description: '현지 대표 종합 전자제품 쇼핑몰 실구매 고객 리뷰',
              product_match: '확인',
              review_status: '확인',
              review_count: '1,280건'
            },
            {
              source_id: `mock_${country.toLowerCase()}_forum_02`,
              site_name: `${country} Tech Community Forum`,
              url: `https://example.com/forum/threads/${country.toLowerCase()}-discussion`,
              category: 'Community/Forum',
              description: '테크 매니아 실사용 내구성 및 장단점 토론',
              product_match: '확인',
              review_status: '확인',
              review_count: '430건'
            },
            {
              source_id: `mock_${country.toLowerCase()}_eval_03`,
              site_name: `${country} Appliance Reviews`,
              url: `https://example.com/reviews/appliances`,
              category: 'Review Site',
              description: null,
              product_match: null,
              review_status: null,
              review_count: null
            }
          ]
        };

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(mockResponse, null, 2));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON request' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/webhook/collect-selected-sources') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const country = payload.country || 'US';
        const product = payload.product || 'Standard Product';
        const sources = payload.selected_sources || [];

        const header = 'country,product,site_name,source_url,proxy_type,extraction_type,status_code,voc_content\n';
        const rows = sources.map((s, idx) => {
          const content = `[Mock Server Response for ${product}]\nScraped via ScrapingAnt simulation.\nUser reviews mention high satisfaction and reliable performance.`;
          return `${country},"${product.replace(/"/g, '""')}","${(s.site_name || 'Site').replace(/"/g, '""')}","${s.url}",datacenter,markdown,200,"${content.replace(/"/g, '""')}"`;
        });

        const csv = '\uFEFF' + header + rows.join('\n'); // UTF-8 BOM 포함

        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="scraped_voc_results.csv"'
        });
        res.end(csv);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error generating CSV');
      }
    });
    return;
  }

  // --- [정적 파일 서빙] ---
  let filePath = path.join(DASHBOARD_DIR, pathname === '/' ? 'index.html' : pathname);

  // 상위 마크다운 명세서 파일 요청 처리
  if (pathname === '/01-architecture-and-api-spec.md') {
    filePath = path.join(__dirname, '01-architecture-and-api-spec.md');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>요청하신 파일을 찾을 수 없습니다.</p>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Global VOC Dashboard Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving directory: ${DASHBOARD_DIR}`);
  console.log(`📘 Spec documentation: http://localhost:${PORT}/01-architecture-and-api-spec.md`);
  console.log('================================================================');
});
