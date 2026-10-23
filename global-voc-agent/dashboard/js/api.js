/**
 * dashboard/js/api.js
 * 분리된 API 연결 계층 (API Client Layer)
 */

const VocApiClient = {
  async discoverSources(country, product) {
    if (AppConfig.isDemoMode) {
      await new Promise(r => setTimeout(r, 400));
      const sources = MockData.getMockDiscoveredSources(country, product);
      return {
        success: true,
        isDemo: true,
        sources: sources,
        message: '데모 모드 출처 목록이 로드되었습니다.'
      };
    }

    const endpoint = AppConfig.endpoints.discoverSources;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, product })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      const sources = Array.isArray(data) ? data : (data.sources || data.data || []);

      return {
        success: true,
        isDemo: false,
        sources: sources,
        message: '후보 출처를 정상적으로 수신했습니다.'
      };
    } catch (error) {
      console.warn('[API Client] discoverSources 호출 실패:', error);
      return {
        success: false,
        isDemo: false,
        sources: [],
        message: '출처 탐색 API 연결 필요 (백엔드에서 discoverSources 엔드포인트 분리 작업 진행 중)'
      };
    }
  },

  async collectSelectedSources(country, product, selectedSources) {
    if (!selectedSources || selectedSources.length === 0) {
      throw new Error('수집할 출처를 최소 1개 이상 선택해야 합니다.');
    }

    if (AppConfig.isDemoMode) {
      await new Promise(r => setTimeout(r, 1000));
      const csvText = MockData.generateMockResultCsv(country, product, selectedSources);
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });

      return {
        success: true,
        isDemo: true,
        csvText: csvText,
        blob: blob,
        message: '데모 모드 수집이 완료되었습니다.'
      };
    }

    const endpoint = AppConfig.endpoints.collectSelectedSources;
    const payload = {
      country: country,
      product: product,
      selected_sources: selectedSources.map(s => ({
        source_id: s.source_id || s.id || '',
        url: s.url,
        site_name: s.site_name || ''
      }))
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`수집 서버 응답 오류: HTTP ${response.status} (${response.statusText})`);
      }

      const blob = await response.blob();
      const csvText = await blob.text();

      return {
        success: true,
        isDemo: false,
        csvText: csvText,
        blob: blob,
        message: '수집 결과 CSV 수신 완료'
      };
    } catch (error) {
      console.error('[API Client] collectSelectedSources 오류:', error);
      throw error;
    }
  },

  async collectInstantWebhook(country, product, customWebhookUrl = null) {
    const webhookUrl = customWebhookUrl || AppConfig.endpoints.instantWebhook || 'http://localhost:5678/webhook-test/collect-global-voc';

    try {
      const response = await fetch('/api/proxy-collect-voc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          product,
          webhookUrl,
          proxy_type: AppConfig.serverSideSettings.proxyType,
          extraction_type: AppConfig.serverSideSettings.extractionType
        })
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.message) {
            errMessage = errData.message;
          } else if (errData.hint) {
            errMessage = `${errData.message || ''} (${errData.hint})`;
          }
        } catch (_) {
          const txt = await response.text();
          if (txt) errMessage = txt;
        }

        if (response.status === 404 && errMessage.includes('not registered')) {
          throw new Error('n8n 수신 대기 필요: n8n 캔버스에서 [Execute workflow] 또는 Webhook 노드의 [Listen for test event]를 클릭한 후 다시 시도해주세요.');
        }

        throw new Error(errMessage);
      }

      let csvText = '';
      if (contentType.includes('json')) {
        const jsonData = await response.json();
        if (Array.isArray(jsonData)) {
          csvText = CsvUtils.generateSourcesCsv(country, product, jsonData);
        } else if (jsonData.csv) {
          csvText = jsonData.csv;
        } else {
          csvText = JSON.stringify(jsonData, null, 2);
        }
      } else {
        const blob = await response.blob();
        csvText = await blob.text();
      }

      return {
        success: true,
        isDemo: false,
        csvText: csvText,
        message: 'n8n 일괄 수집 완료'
      };
    } catch (error) {
      console.error('[API Client] collectInstantWebhook 오류:', error);
      throw error;
    }
  }
};
