/**
 * dashboard/js/mock_data.js
 * 데모 모드 전용 시뮬레이션 데이터셋
 * 
 * 사이트 유형은 '가전 판매점', '온라인 쇼핑몰', '커뮤니티', '전문 리뷰 사이트' 등 한국어로 표기됩니다.
 */

const MockData = {
  sourcesByCountry: {
    US: [
      {
        source_id: 'src_us_bestbuy_01',
        site_name: 'Best Buy US',
        category: '가전 판매점',
        url: 'https://www.bestbuy.com/site/reviews/sample-product',
        description: '북미 대표 전자제품 리테일 실사용자 리뷰 및 평점'
      },
      {
        source_id: 'src_us_reddit_02',
        site_name: 'Reddit r/OLED',
        category: '커뮤니티',
        url: 'https://www.reddit.com/r/OLED/comments/voc_discussion',
        description: '실제 테크 유저 및 게이머 화질, 번인, 설정 팁 실사용 토론'
      },
      {
        source_id: 'src_us_rtings_03',
        site_name: 'RTINGS.com User Feedback',
        category: '전문 리뷰 사이트',
        url: 'https://www.rtings.com/tv/reviews/user-comments',
        description: '디스플레이 전문 벤치마크 사이트 실측치 및 사용자 피드백'
      },
      {
        source_id: 'src_us_avsforum_04',
        site_name: 'AVS Forum',
        category: '커뮤니티',
        url: 'https://www.avsforum.com/threads/official-owners-thread',
        description: null // 설명 미등록 테스트용
      },
      {
        source_id: 'src_us_homedepot_05',
        site_name: 'Home Depot Customer Reviews',
        category: '가전 판매점',
        url: 'https://www.homedepot.com/p/reviews/appliance-model',
        description: '대형 하드웨어 및 가전 매장 배송, 설치, 고객 평가'
      }
    ],
    DE: [
      {
        source_id: 'src_de_mediamarkt_01',
        site_name: 'MediaMarkt DE',
        category: '온라인 쇼핑몰',
        url: 'https://www.mediamarkt.de/de/product/reviews',
        description: '독일 주요 가전 유통사 구매 인증 고객 평가'
      },
      {
        source_id: 'src_de_mydealz_02',
        site_name: 'mydealz.de Forum',
        category: '커뮤니티',
        url: 'https://www.mydealz.de/diskussion/voc-feedback',
        description: '독일 최대 쇼핑 커뮤니티 가격 대비 성능 실사용 평가'
      },
      {
        source_id: 'src_de_computerbild_03',
        site_name: 'Computer Bild Lesertests',
        category: '전문 리뷰 사이트',
        url: 'https://www.computerbild.de/artikel/lesertest',
        description: null
      }
    ],
    PL: [
      {
        source_id: 'src_pl_mediaexpert_01',
        site_name: 'Media Expert PL',
        category: '가전 판매점',
        url: 'https://www.mediaexpert.pl/agd/opinie-klientow',
        description: '폴란드 주요 가전 유통사 실구매 고객 평점 및 VOC'
      },
      {
        source_id: 'src_pl_wykop_02',
        site_name: 'Wykop.pl Mikroblog',
        category: '커뮤니티',
        url: 'https://wykop.pl/tag/elektronika/wpisy',
        description: '폴란드 현지 온라인 커뮤니티 실사용 이슈 토론'
      },
      {
        source_id: 'src_pl_rtveuroagd_03',
        site_name: 'RTV EURO AGD',
        category: '온라인 쇼핑몰',
        url: 'https://www.euro.com.pl/agd/opinie',
        description: null
      }
    ],
    KR: [
      {
        source_id: 'src_kr_danawa_01',
        site_name: '다나와 상품의견',
        category: '전문 리뷰 사이트',
        url: 'https://prod.danawa.com/info/?pcode=sample',
        description: '국내 대표 가격비교 사이트 실사용자 의견 및 Q&A'
      },
      {
        source_id: 'src_kr_clien_02',
        site_name: '클리앙 사용기게시판',
        category: '커뮤니티',
        url: 'https://www.clien.net/service/board/use',
        description: 'IT 기기 및 가전제품 실사용 후기 및 장단점 분석'
      },
      {
        source_id: 'src_kr_naver_03',
        site_name: '네이버 쇼핑 리뷰',
        category: '온라인 쇼핑몰',
        url: 'https://search.shopping.naver.com',
        description: '네이버페이 실구매자 포토후기 및 평점'
      }
    ]
  },

  getMockDiscoveredSources(country, product) {
    const list = this.sourcesByCountry[country] || this.sourcesByCountry['US'];
    return list.map(item => ({
      ...item,
      product: product || 'OLED TV G4'
    }));
  },

  generateMockResultCsv(country, product, selectedSources) {
    const header = 'country,product,site_name,source_url,proxy_type,extraction_type,status_code,voc_content\n';
    
    const rows = (selectedSources || []).map((source, index) => {
      const isFailed = (index === 2 && selectedSources.length > 2);
      const statusCode = isFailed ? 403 : 200;
      
      let vocContent = '';
      if (isFailed) {
        vocContent = 'Cloudflare Ray ID: 89312abf - 403 Forbidden Access Denied. Proxy challenge failed.';
      } else {
        vocContent = `## ${source.site_name} Customer Reviews for ${product}\n\n` +
          `[Summary]\n` +
          `- Extraction Mode: markdown via ScrapingAnt\n` +
          `- Raw Review Snippets:\n` +
          `"The picture quality exceeded expectations, with deep blacks and vibrant brightness."\n` +
          `"Quiet operation and sleek design. Wall mounting was straightforward."\n` +
          `"Sound from built-in speakers is clear, but adding a soundbar improves bass significantly."\n\n` +
          `[Key Feedback]\n` +
          `+ Pros: Picture contrast, gaming responsiveness, bezel-less design\n` +
          `- Cons: Remote control layout, price point`;
      }

      const escapedContent = `"${vocContent.replace(/"/g, '""')}"`;
      const escapedUrl = `"${source.url.replace(/"/g, '""')}"`;
      const escapedSite = `"${source.site_name.replace(/"/g, '""')}"`;
      const escapedProduct = `"${product.replace(/"/g, '""')}"`;

      return `${country},${escapedProduct},${escapedSite},${escapedUrl},datacenter,markdown,${statusCode},${escapedContent}`;
    });

    return header + rows.join('\n');
  }
};
