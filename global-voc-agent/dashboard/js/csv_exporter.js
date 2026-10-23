/**
 * dashboard/js/csv_exporter.js
 * CSV 파일 파싱, 생성 및 안전한 다운로드 유틸리티
 */

const CsvUtils = {
  /**
   * 브라우저에서 Blob 객체를 파일로 다운로드 트리거
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * 문자열 CSV를 UTF-8 BOM과 함께 다운로드 (엑셀 한글 깨짐 방지)
   */
  downloadCsvText(csvText, filename) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  },

  /**
   * 출처 목록(Candidate Sources) 데이터를 CSV 문자열로 변환
   */
  generateSourcesCsv(country, product, sources) {
    const headers = [
      'index',
      'country',
      'product',
      'site_name',
      'url',
      'category',
      'description',
      'product_match',
      'review_status',
      'review_count'
    ];

    const rows = (sources || []).map((s, idx) => {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      return [
        idx + 1,
        escape(country),
        escape(product),
        escape(s.site_name || ''),
        escape(s.url || ''),
        escape(s.category || 'Review/Community'),
        escape(s.description || '사이트 설명 미확인'),
        escape(s.product_match || '미확인'),
        escape(s.review_status || '미확인'),
        escape(s.review_count || '미확인')
      ].join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
  },

  /**
   * 복합 CSV 파서: 따옴표 내 줄바꿈 및 쉼표를 정확하게 처리
   * 결과 CSV 필드: country, product, site_name, source_url, proxy_type, extraction_type, status_code, voc_content
   */
  parseResultCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    // BOM 제거
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    while (i < csvText.length) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // 이스케이프된 따옴표 ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // 따옴표 토글
          insideQuotes = !insideQuotes;
          i++;
          continue;
        }
      }

      if (!insideQuotes && char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }

      if (!insideQuotes && (char === '\r' || char === '\n')) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    return dataRows.map((cols, rowIndex) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] !== undefined ? cols[idx] : '';
      });

      return {
        id: `voc_row_${rowIndex + 1}`,
        country: obj['country'] || '',
        product: obj['product'] || '',
        site_name: obj['site_name'] || `Site ${rowIndex + 1}`,
        source_url: obj['source_url'] || obj['url'] || '',
        proxy_type: obj['proxy_type'] || 'datacenter',
        extraction_type: obj['extraction_type'] || 'markdown',
        status_code: parseInt(obj['status_code'], 10) || 200,
        voc_content: obj['voc_content'] || ''
      };
    });
  },

  /**
   * XSS 방지를 위한 HTML 안전 이스케이프
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
