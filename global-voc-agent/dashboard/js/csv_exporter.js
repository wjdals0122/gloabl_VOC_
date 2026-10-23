/**
 * dashboard/js/csv_exporter.js
 * CSV 파일 파싱, 생성 및 다운로드 유틸리티
 */

const CsvUtils = {
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

  downloadCsvText(csvText, filename) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM (Excel 한글 깨짐 방지)
    const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  },

  generateSourcesCsv(country, product, sources) {
    const headers = [
      'index',
      'country',
      'product',
      'site_name',
      'category',
      'url',
      'description'
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
        escape(s.category || '기타'),
        escape(s.url || ''),
        escape(s.description || '설명 미등록')
      ].join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
  },

  parseResultCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    while (i < csvText.length) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
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
        site_name: obj['site_name'] || `출처 ${rowIndex + 1}`,
        source_url: obj['source_url'] || obj['url'] || '',
        proxy_type: obj['proxy_type'] || 'datacenter',
        extraction_type: obj['extraction_type'] || 'markdown',
        status_code: parseInt(obj['status_code'], 10) || 200,
        voc_content: obj['voc_content'] || ''
      };
    });
  },

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
