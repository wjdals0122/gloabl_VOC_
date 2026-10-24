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
        description: '전자제품 판매 사이트 · 구매 후기와 평점'
      },
      {
        source_id: 'src_us_reddit_02',
        site_name: 'Reddit r/OLED',
        category: '커뮤니티',
        url: 'https://www.reddit.com/r/OLED/comments/voc_discussion',
        description: 'OLED 사용자 커뮤니티 · 사용 경험과 문제 해결 토론'
      },
      {
        source_id: 'src_us_rtings_03',
        site_name: 'RTINGS.com User Feedback',
        category: '전문 리뷰 사이트',
        url: 'https://www.rtings.com/tv/reviews/user-comments',
        description: '디스플레이 전문 리뷰 사이트 · 제품 평점 및 피드백'
      },
      {
        source_id: 'src_us_avsforum_04',
        site_name: 'AVS Forum',
        category: '커뮤니티',
        url: 'https://www.avsforum.com/threads/official-owners-thread',
        description: null // 설명 미등록 -> '사이트 설명 미확인'으로 표시됨
      },
      {
        source_id: 'src_us_homedepot_05',
        site_name: 'Home Depot Customer Reviews',
        category: '가전 판매점',
        url: 'https://www.homedepot.com/p/reviews/appliance-model',
        description: '대형 하드웨어 가전몰 · 설치 및 고객 평가'
      }
    ],
    DE: [
      {
        source_id: 'src_de_mediamarkt_01',
        site_name: 'MediaMarkt DE',
        category: 'E-commerce',
        url: 'https://www.mediamarkt.de/de/product/reviews',
        description: '독일 대표 전자제품몰 구매 후기 및 평점'
      },
      {
        source_id: 'src_de_mydealz_02',
        site_name: 'mydealz.de Forum',
        category: 'Community/Forum',
        url: 'https://www.mydealz.de/diskussion/voc-feedback',
        description: '쇼핑 커뮤니티 할인 정보 및 실사용 토론'
      },
      {
        source_id: 'src_de_computerbild_03',
        site_name: 'Computer Bild Lesertests',
        category: 'Tech Review',
        url: 'https://www.computerbild.de/artikel/lesertest',
        description: null
      }
    ],
    PL: [
      {
        source_id: 'src_pl_mediaexpert_01',
        site_name: 'Media Expert PL',
        category: 'E-commerce',
        url: 'https://www.mediaexpert.pl/agd/opinie-klientow',
        description: '폴란드 가전 전문몰 구매 고객 평점'
      },
      {
        source_id: 'src_pl_wykop_02',
        site_name: 'Wykop.pl Mikroblog',
        category: 'Community/Forum',
        url: 'https://wykop.pl/tag/elektronika/wpisy',
        description: '현지 종합 커뮤니티 실사용 의견'
      },
      {
        source_id: 'src_pl_rtveuroagd_03',
        site_name: 'RTV EURO AGD',
        category: 'E-commerce',
        url: 'https://www.euro.com.pl/agd/opinie',
        description: null
      }
    ],
    KR: [
      {
        source_id: 'src_kr_danawa_01',
        site_name: '다나와 상품의견',
        category: 'Price Comparison',
        url: 'https://prod.danawa.com/info/?pcode=sample',
        description: '가격비교 및 실사용자 제품 의견과 Q&A'
      },
      {
        source_id: 'src_kr_clien_02',
        site_name: '클리앙 사용기게시판',
        category: 'Community/Forum',
        url: 'https://www.clien.net/service/board/use',
        description: 'IT 가전 커뮤니티 실사용 후기 및 장단점 토론'
      },
      {
        source_id: 'src_kr_naver_03',
        site_name: '네이버 쇼핑 리뷰',
        category: 'E-commerce',
        url: 'https://search.shopping.naver.com',
        description: '온라인 쇼핑몰 구매 고객 후기 및 평점'
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
