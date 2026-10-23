/**
 * dashboard/js/mock_data.js
 * 데모 모드 전용 시뮬레이션 데이터셋
 * 
 * [주의] 모든 데모 데이터와 진행 상태는 [시뮬레이션]임이 명확히 표시되어야 하며,
 * 실제 백엔드 연동 전 UI 플로우를 사전 검증하기 위한 용도로만 사용됩니다.
 */

const MockData = {
  // 국가별 제품별 후보 출처 시뮬레이션 풀
  sourcesByCountry: {
    US: [
      {
        source_id: 'src_us_bestbuy_01',
        site_name: 'Best Buy US',
        url: 'https://www.bestbuy.com/site/reviews/sample-product',
        category: 'E-Commerce',
        description: '북미 최대 가전 유통사 고객 구매후기 및 실사용 Q&A',
        product_match: '확인',
        review_status: '확인',
        review_count: '1,420건'
      },
      {
        source_id: 'src_us_reddit_02',
        site_name: 'Reddit r/OLED',
        url: 'https://www.reddit.com/r/OLED/comments/voc_discussion',
        category: 'Community/Forum',
        description: '실제 유저 화질 비교, 번인 우려, 세팅 팁 심층 토론',
        product_match: '확인',
        review_status: '확인',
        review_count: '342건'
      },
      {
        source_id: 'src_us_rtings_03',
        site_name: 'RTINGS.com User Feedback',
        url: 'https://www.rtings.com/tv/reviews/user-comments',
        category: 'Professional Review',
        description: '디스플레이 전문 벤치마크 사이트 유저 토론 및 평가',
        product_match: '확인',
        review_status: '확인',
        review_count: '88건'
      },
      {
        source_id: 'src_us_avsforum_04',
        site_name: 'AVS Forum',
        url: 'https://www.avsforum.com/threads/official-owners-thread',
        category: 'Tech Forum',
        description: null, // '사이트 설명 미확인' 테스트용
        product_match: null, // '미확인' 테스트용
        review_status: null, // '미확인' 테스트용
        review_count: null // '미확인' 테스트용
      },
      {
        source_id: 'src_us_homedepot_05',
        site_name: 'Home Depot Customer Reviews',
        url: 'https://www.homedepot.com/p/reviews/appliance-model',
        category: 'Retailer',
        description: '대형 하드웨어/가전 매장 배송 및 설치 만족도 평가',
        product_match: '확인',
        review_status: '확인',
        review_count: '650건'
      }
    ],
    DE: [
      {
        source_id: 'src_de_mediamarkt_01',
        site_name: 'MediaMarkt DE',
        url: 'https://www.mediamarkt.de/de/product/reviews',
        category: 'E-Commerce',
        description: '독일 1위 가전 유통사 구매 인증 고객 평가',
        product_match: '확인',
        review_status: '확인',
        review_count: '890건'
      },
      {
        source_id: 'src_de_mydealz_02',
        site_name: 'mydealz.de Forum',
        url: 'https://www.mydealz.de/diskussion/voc-feedback',
        category: 'Community/Forum',
        description: '독일 최대 쇼핑 커뮤니티 가격 대비 성능 실사용 평가',
        product_match: '확인',
        review_status: '확인',
        review_count: '210건'
      },
      {
        source_id: 'src_de_computerbild_03',
        site_name: 'Computer Bild Lesertests',
        url: 'https://www.computerbild.de/artikel/lesertest',
        category: 'Tech Review',
        description: null,
        product_match: null,
        review_status: null,
        review_count: null
      }
    ],
    PL: [
      {
        source_id: 'src_pl_mediaexpert_01',
        site_name: 'Media Expert PL',
        url: 'https://www.mediaexpert.pl/agd/opinie-klientow',
        category: 'E-Commerce',
        description: '폴란드 주요 양판점 실구매 고객 평점 및 VOC',
        product_match: '확인',
        review_status: '확인',
        review_count: '530건'
      },
      {
        source_id: 'src_pl_wykop_02',
        site_name: 'Wykop.pl Mikroblog',
        url: 'https://wykop.pl/tag/elektronika/wpisy',
        category: 'Community/Forum',
        description: '폴란드 현지 온라인 커뮤니티 실사용 이슈 토론',
        product_match: '확인',
        review_status: '확인',
        review_count: '115건'
      },
      {
        source_id: 'src_pl_rtveuroagd_03',
        site_name: 'RTV EURO AGD',
        url: 'https://www.euro.com.pl/agd/opinie',
        category: 'Retailer',
        description: null,
        product_match: null,
        review_status: null,
        review_count: null
      }
    ]
  },

  // 후보 출처 탐색 시뮬레이션
  getMockDiscoveredSources(country, product) {
    const list = this.sourcesByCountry[country] || this.sourcesByCountry['US'];
    // 제품명을 반영한 복사본 생성
    return list.map((item, idx) => ({
      ...item,
      product: product || 'LG CordZero A9X'
    }));
  },

  // 수집 결과 CSV 텍스트 생성 시뮬레이션 (워크플로우 실제 출력 스키마와 100% 동일)
  generateMockResultCsv(country, product, selectedSources) {
    const header = 'country,product,site_name,source_url,proxy_type,extraction_type,status_code,voc_content\n';
    
    const rows = (selectedSources || []).map((source, index) => {
      const isFailed = (index === 2 && selectedSources.length > 2); // 3번째 사이트는 HTTP 403 시뮬레이션
      const statusCode = isFailed ? 403 : 200;
      
      let vocContent = '';
      if (isFailed) {
        vocContent = 'Cloudflare Ray ID: 89312abf - 403 Forbidden Access Denied. Proxy challenge failed.';
      } else {
        vocContent = `## ${source.site_name} Customer Reviews for ${product}\n\n` +
          `[Summary]\n` +
          `- Extraction Mode: markdown via ScrapingAnt\n` +
          `- Raw Review Snippets:\n` +
          `"The battery life exceeded expectations, easily lasting 45 minutes on medium suction."\n` +
          `"Quiet operation compared to previous model. The all-in-one tower self-emptying station is a game changer."\n` +
          `"Slightly heavier than dyson v12, but build quality feels more durable."\n` +
          `"Cleaning performance on thick carpets is solid, though the roller brush requires monthly hair untangling."\n\n` +
          `[Community Sentiment Points]\n` +
          `+ Pros: Suction power, dust disposal ease, aesthetic design\n` +
          `- Cons: Weight balance, high price for additional accessories`;
      }

      // CSV 이스케이프: 쌍따옴표 처리
      const escapedContent = `"${vocContent.replace(/"/g, '""')}"`;
      const escapedUrl = `"${source.url.replace(/"/g, '""')}"`;
      const escapedSite = `"${source.site_name.replace(/"/g, '""')}"`;
      const escapedProduct = `"${product.replace(/"/g, '""')}"`;

      return `${country},${escapedProduct},${escapedSite},${escapedUrl},datacenter,markdown,${statusCode},${escapedContent}`;
    });

    return header + rows.join('\n');
  }
};
