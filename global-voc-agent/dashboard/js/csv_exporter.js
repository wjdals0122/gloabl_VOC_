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
  },

  escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  generateFilteredCsv(country, product, filteredItems) {
    const headers = [
      'No',
      '수집출처',
      '카테고리',
      '감성',
      '고객의도',
      'LG언급여부',
      '언급경쟁사',
      '핵심토픽태그',
      '한국어AI핵심요약',
      '영문원문본문',
      '원문링크',
      '수집일시'
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = (filteredItems || []).map((item, idx) => {
      let sentText = '중립';
      if (item.ai_sentiment === 'POSITIVE') sentText = '긍정';
      else if (item.ai_sentiment === 'NEGATIVE') sentText = '부정';

      let intentText = item.user_intent || '기타';
      if (item.user_intent === 'EXPERIENCE') intentText = '실사용 경험';
      else if (item.user_intent === 'COMPLAINT') intentText = '불만/품질 이슈';
      else if (item.user_intent === 'INQUIRY') intentText = '구매 문의';
      else if (item.user_intent === 'COMPARISON') intentText = '타사 비교';

      const comps = item.competitors && item.competitors.length > 0 ? item.competitors.join('; ') : '';
      const tags = item.topic_tags && item.topic_tags.length > 0 ? item.topic_tags.join('; ') : '';

      return [
        idx + 1,
        escape(item.site_name),
        escape(item.category),
        escape(sentText),
        escape(intentText),
        escape(item.lg_mentioned ? 'O' : 'X'),
        escape(comps),
        escape(tags),
        escape(item.kr_summary),
        escape(item.content),
        escape(item.source_url),
        escape(item.created_at)
      ].join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
  },

  downloadFilteredCsv(country, product, filteredItems, filename) {
    const csv = this.generateFilteredCsv(country, product, filteredItems);
    this.downloadCsvText(csv, filename || `filtered_voc_${country}_${product.replace(/\s+/g, '_')}.csv`);
  },

  downloadExcelBlob(xmlContent, filename) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    this.downloadBlob(blob, filename || 'voc_report.xls');
  },

  generateExcelReport(country, product, allItems, filteredItems, filterDesc) {
    const escapeXml = (str) => this.escapeXml(str);

    const totalCount = allItems.length;
    const posCount = allItems.filter(r => r.ai_sentiment === 'POSITIVE').length;
    const neuCount = allItems.filter(r => r.ai_sentiment === 'NEUTRAL').length;
    const negCount = allItems.filter(r => r.ai_sentiment === 'NEGATIVE').length;
    const lgCount = allItems.filter(r => r.lg_mentioned).length;

    const posRate = totalCount > 0 ? ((posCount / totalCount) * 100).toFixed(1) : '0.0';
    const neuRate = totalCount > 0 ? ((neuCount / totalCount) * 100).toFixed(1) : '0.0';
    const negRate = totalCount > 0 ? ((negCount / totalCount) * 100).toFixed(1) : '0.0';
    const lgRate = totalCount > 0 ? ((lgCount / totalCount) * 100).toFixed(1) : '0.0';

    const compCounts = {};
    allItems.forEach(r => {
      if (r.competitors && Array.isArray(r.competitors)) {
        r.competitors.forEach(c => {
          if (c && c.trim()) compCounts[c.trim()] = (compCounts[c.trim()] || 0) + 1;
        });
      }
    });

    const topicCounts = {};
    allItems.forEach(r => {
      if (r.topic_tags && Array.isArray(r.topic_tags)) {
        r.topic_tags.forEach(t => {
          if (t && t.trim()) topicCounts[t.trim()] = (topicCounts[t.trim()] || 0) + 1;
        });
      }
    });

    const siteBreakdown = {};
    allItems.forEach(r => {
      const s = r.site_name || '기타 출처';
      if (!siteBreakdown[s]) siteBreakdown[s] = { total: 0, pos: 0, neu: 0, neg: 0, cat: r.category || '기타' };
      siteBreakdown[s].total++;
      if (r.ai_sentiment === 'POSITIVE') siteBreakdown[s].pos++;
      else if (r.ai_sentiment === 'NEGATIVE') siteBreakdown[s].neg++;
      else siteBreakdown[s].neu++;
    });

    const now = new Date().toLocaleString('ko-KR');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>LG Global VOC AI Intelligence</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="14" ss:Bold="1" ss:Color="#AB1736"/>
   <Interior ss:Color="#FFF1F3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="11" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#AB1736" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeaderSub">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Color="#334155"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Color="#334155"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellBold">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellPos">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Bold="1" ss:Color="#059669"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellNeu">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Bold="1" ss:Color="#854D0E"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellNeg">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="9.5" ss:Bold="1" ss:Color="#E11D48"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>

 <!-- 1. 요약 리포트 시트 -->
 <Worksheet ss:Name="종합_분석_요약">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="160"/>
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>
   <Column ss:Width="280"/>

   <Row ss:Height="28">
    <Cell ss:StyleID="HeaderTitle"><Data ss:Type="String">LG 전자 글로벌 VOC 인텔리전스 종합 분석 리포트</Data></Cell>
   </Row>
   <Row ss:Height="6"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <!-- 메타 정보 -->
   <Row ss:Height="20">
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">1. 수집 및 분석 개요</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">수집 대상 국가</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(country)}</Data></Cell>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">리포트 생성 일시</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(now)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">수집 대상 제품</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(product)}</Data></Cell>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">현재 필터 상태</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(filterDesc || '전체')}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">총 수집 건수</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${totalCount}건 (필터 뷰: ${filteredItems.length}건)</Data></Cell>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">분석 출처 수</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${Object.keys(siteBreakdown).length}개 사이트</Data></Cell>
   </Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <!-- 감성 분석 지표 -->
   <Row ss:Height="20">
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">2. 감성 분포 핵심 KPI</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">감성 구분</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">수집 건수</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">비율 (%)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">기준 / 비고</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="DataCellPos"><Data ss:Type="String">🟢 긍정 (POSITIVE)</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${posCount}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${posRate}%</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">조작 편의성, 저소음 건조, OLED 화질 호평</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="DataCellNeu"><Data ss:Type="String">🟡 중립 (NEUTRAL)</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${neuCount}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${neuRate}%</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">스택형 가전 구조 및 제품 사양 논의</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="DataCellNeg"><Data ss:Type="String">🔴 부정 (NEGATIVE)</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${negCount}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${negRate}%</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">타사 내구성 불만, 두꺼운 이불 건조 시간 소요</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="TableHeaderSub"><Data ss:Type="String">🌟 LG 직접 언급</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${lgCount}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${lgRate}%</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">워시타워 센터 컨트롤 및 OLED 최고 화질 언급</Data></Cell>
   </Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <!-- 출처 사이트별 현황 -->
   <Row ss:Height="20">
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">3. 출처 사이트별 수집 현황</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">출처 사이트명</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">카테고리</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">총 수집 건수</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">🟢 긍정</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">🟡 중립</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">🔴 부정</Data></Cell>
   </Row>
   ${Object.keys(siteBreakdown).map(sName => {
     const s = siteBreakdown[sName];
     return `
   <Row>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(sName)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.cat)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.total}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.pos}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.neu}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.neg}</Data></Cell>
   </Row>`;
   }).join('')}
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <!-- 경쟁사 언급 현황 -->
   <Row ss:Height="20">
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">4. 주요 경쟁사 언급 순위</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">경쟁사 브랜드</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">언급 건수</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">언급 비중 (%)</Data></Cell>
   </Row>
   ${Object.keys(compCounts).sort((a,b) => compCounts[b] - compCounts[a]).map(cName => {
     const cnt = compCounts[cName];
     const rate = ((cnt / totalCount) * 100).toFixed(1);
     return `
   <Row>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(cName)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${cnt}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
 </Worksheet>

 <!-- 2. 필터링된 VOC 상세 내역 -->
 <Worksheet ss:Name="필터링_VOC_상세">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="40"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="280"/>
   <Column ss:Width="300"/>
   <Column ss:Width="180"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">No</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">수집 출처</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">카테고리</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">감성</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">고객 의도</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">LG 언급</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">언급 경쟁사</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">핵심 토픽 태그</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">AI 한국어 핵심 요약</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">영문 원문 본문</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">원문 링크</Data></Cell>
   </Row>
   ${filteredItems.map((item, idx) => {
     let sentStyle = 'DataCellNeu';
     let sentText = '🟡 중립';
     if (item.ai_sentiment === 'POSITIVE') {
       sentStyle = 'DataCellPos';
       sentText = '🟢 긍정';
     } else if (item.ai_sentiment === 'NEGATIVE') {
       sentStyle = 'DataCellNeg';
       sentText = '🔴 부정';
     }

     let intentText = item.user_intent || '기타';
     if (item.user_intent === 'EXPERIENCE') intentText = '실사용 경험';
     else if (item.user_intent === 'COMPLAINT') intentText = '불만/품질 이슈';
     else if (item.user_intent === 'INQUIRY') intentText = '구매 문의';
     else if (item.user_intent === 'COMPARISON') intentText = '타사 비교';

     const comps = item.competitors && item.competitors.length > 0 ? item.competitors.join(', ') : '-';
     const tags = item.topic_tags && item.topic_tags.length > 0 ? item.topic_tags.join(', ') : '-';

     return `
   <Row>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(item.site_name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.category)}</Data></Cell>
    <Cell ss:StyleID="${sentStyle}"><Data ss:Type="String">${escapeXml(sentText)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(intentText)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${item.lg_mentioned ? 'O' : 'X'}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(comps)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(tags)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.kr_summary)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.content ? item.content.slice(0, 300) : '')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.source_url)}</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
 </Worksheet>

 <!-- 3. 수집 원문 전체 데이터 -->
 <Worksheet ss:Name="원문_전체_데이터">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">voc_id</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">source_site</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">category</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">content_type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">voc_content</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">kr_summary</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ai_sentiment</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">user_intent</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">topic_tags</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">competitors</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">is_urgent</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">created_at</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">source_url</Data></Cell>
   </Row>
   ${allItems.map(item => `
   <Row>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.id)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.site_name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.category)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.content_type)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.content)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.kr_summary)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(item.ai_sentiment)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(item.user_intent)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(JSON.stringify(item.topic_tags || []))}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(JSON.stringify(item.competitors || []))}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${item.is_urgent ? 'true' : 'false'}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(item.created_at)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.source_url)}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;
  }
};

if (typeof window !== 'undefined') {
  window.CsvUtils = CsvUtils;
}


