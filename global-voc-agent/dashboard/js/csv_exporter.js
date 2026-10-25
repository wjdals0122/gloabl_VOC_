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

      let topicTags = [];
      try {
        if (obj['topic_tags']) {
          topicTags = JSON.parse(obj['topic_tags']);
          if (!Array.isArray(topicTags)) topicTags = [String(topicTags)];
        }
      } catch (e) { topicTags = []; }

      let competitors = [];
      try {
        if (obj['competitors']) {
          competitors = JSON.parse(obj['competitors']);
          if (!Array.isArray(competitors)) competitors = [String(competitors)];
        }
      } catch (e) { competitors = []; }

      let aiMeta = {};
      try {
        if (obj['ai_metadata']) {
          aiMeta = JSON.parse(obj['ai_metadata']);
        }
      } catch (e) { aiMeta = {}; }

      const rawContent = obj['content'] || obj['voc_content'] || '';
      const isLgMentioned = aiMeta.lg_mentioned === true || /lg|엘지|washtower|워시타워/i.test(rawContent);

      return {
        id: obj['voc_id'] || `voc_row_${rowIndex + 1}`,
        voc_id: obj['voc_id'] || `voc_row_${rowIndex + 1}`,
        country: obj['country'] || 'US',
        product: obj['product'] || '',
        site_name: obj['source_site'] || obj['site_name'] || `출처 ${rowIndex + 1}`,
        category: obj['category'] || 'Community/Forum',
        content_type: obj['content_type'] || 'POST',
        content: rawContent,
        voc_content: rawContent,
        kr_summary: obj['kr_summary'] || '',
        ai_sentiment: (obj['ai_sentiment'] || 'NEUTRAL').toUpperCase(),
        user_intent: (obj['user_intent'] || 'EXPERIENCE').toUpperCase(),
        topic_tags: topicTags,
        competitors: competitors,
        is_urgent: obj['is_urgent'] === 'true' || obj['is_urgent'] === true,
        lg_mentioned: isLgMentioned,
        rating: obj['rating'] ? parseFloat(obj['rating']) : null,
        created_at: obj['created_at'] || '',
        source_url: obj['source_url'] || obj['url'] || '',
        status_code: parseInt(obj['status_code'], 10) || 200
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
