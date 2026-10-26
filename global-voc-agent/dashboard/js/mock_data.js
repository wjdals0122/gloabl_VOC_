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
        category: '가전 판매점, 온라인 쇼핑몰',
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
        description: null
      },
      {
        source_id: 'src_us_homedepot_05',
        site_name: 'Home Depot Customer Reviews',
        category: '가전 판매점, 온라인 쇼핑몰',
        url: 'https://www.homedepot.com/p/reviews/appliance-model',
        description: '대형 하드웨어 가전몰 · 설치 및 고객 평가'
      }
    ],
    DE: [
      {
        source_id: 'src_de_mediamarkt_01',
        site_name: 'MediaMarkt DE',
        category: '가전 판매점, 온라인 쇼핑몰',
        url: 'https://www.mediamarkt.de/de/product/reviews',
        description: '독일 대표 전자제품몰 구매 후기 및 평점'
      },
      {
        source_id: 'src_de_mydealz_02',
        site_name: 'mydealz.de Forum',
        category: '커뮤니티',
        url: 'https://www.mydealz.de/diskussion/voc-feedback',
        description: '쇼핑 커뮤니티 할인 정보 및 실사용 토론'
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
        category: '가전 판매점, 온라인 쇼핑몰',
        url: 'https://www.mediaexpert.pl/agd/opinie-klientow',
        description: '폴란드 가전 전문몰 구매 고객 평점'
      },
      {
        source_id: 'src_pl_wykop_02',
        site_name: 'Wykop.pl Mikroblog',
        category: '커뮤니티',
        url: 'https://wykop.pl/tag/elektronika/wpisy',
        description: '현지 종합 커뮤니티 실사용 의견'
      },
      {
        source_id: 'src_pl_rtveuroagd_03',
        site_name: 'RTV EURO AGD',
        category: '가전 판매점, 온라인 쇼핑몰',
        url: 'https://www.euro.com.pl/agd/opinie',
        description: null
      }
    ],
    KR: [
      {
        source_id: 'src_kr_danawa_01',
        site_name: '다나와 상품의견',
        category: '가격 비교 사이트',
        url: 'https://prod.danawa.com/info/?pcode=sample',
        description: '가격비교 및 실사용자 제품 의견과 Q&A'
      },
      {
        source_id: 'src_kr_clien_02',
        site_name: '클리앙 사용기게시판',
        category: '커뮤니티',
        url: 'https://www.clien.net/service/board/use',
        description: 'IT 가전 커뮤니티 실사용 후기 및 장단점 토론'
      },
      {
        source_id: 'src_kr_naver_03',
        site_name: '네이버 쇼핑 리뷰',
        category: '가전 판매점, 온라인 쇼핑몰',
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
    // 실제 AI 수집 및 정제 완료된 14개 필드 표준 CSV 데이터셋
    const header = 'voc_id,source_site,category,content_type,content,parent_id,kr_summary,ai_sentiment,user_intent,topic_tags,competitors,is_urgent,ai_metadata,created_at\n';
    
    const rows = [
      'RD_POST_19rkfhouzbv9f,Reddit,Community/Forum,POST,"[Title] /u/PepperCat1019 on It\'s been real, dear friend.\\n[Body] I\'m so sorry about your Whirlpool. 35 years is phenomenal! I bought an Amana fridge in 2018. It chose it because it was the only fridge that had zero negative reviews, anywhere. It\'s a side by side with an in door ice maker and a freezer ice bucket. I use the door ice maker multiple times daily. I get the filter on auto delivery from Amazon. No complaints!",,Whirlpool 냉장고의 35년 사용에 대해 안타깝습니다.,NEUTRAL,EXPERIENCE,[],"[""Whirlpool""]",false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":false}",2026-10-24 06:10:38.712379+00',
      'RD_POST_19rkhdo9s35ya,Reddit,Community/Forum,POST,"[Title] /u/SubstantialSoil4454 on Appliance repair scam?\\n[Body] My only theory is the guy was going to take my receipt, go to the manufacturer, and claim a repair which never happened. Idk",,35년 된 Whirlpool 냉장고가 고장났습니다.,NEGATIVE,COMPLAINT,"[""고장""]","[""Whirlpool""]",false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":false}",2026-10-24 06:10:38.712379+00',
      'RD_POST_1u623t7,Reddit,Community/Forum,POST,"[Title] Best washer and dryer combo in 2026? What brands to avoid?\\n[Body] My sisters family and I are looking to buy my mother a new washing machine and dryer set to replace the horrendous samsung AI all in one combo we currently have for her birthday. Been looking at sets on the best buy and home depot site and found a few options with solid reviews but very few saying they lasted more than 2 or 3 years. Looking to purchase in store not online only so speed queen is likely out the window. We want to get her something that will last a very long time and is not too \\"techy\\". Please let me know what you guys would recommend, thanks! Also looking for something 5.0 cu or bigger",,삼성의 AI 올인원 콤보를 교체하고 싶다. 내구성이 좋은 제품을 찾고 있다.,NEGATIVE,COMPLAINT,"[""내구성"",""기술""]","[""Samsung""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_1v2xg62,Reddit,Community/Forum,POST,"[Title] Are washer/dryer combos too good to be true?\\n[Body] I have Ehlers Danlos Syndrome and laundry has always been a huge challenge. I also have a criminally tiny laundry “room”. My washer recently stopped working, so I’m in the market for a new one and looking for something easier to work with, given my dumb body’s frequent misbehavior. I’ve come across some all-in-one machines and if they don’t suck, it seems like it would be a perfect option to save space in the laundry room and reduce the amount of bending and lifting I have to do.",,"세탁기와 건조기 콤보가 공간 절약에 좋지만, 실제로 사용해본 사람들의 경험이 궁금하다.",NEUTRAL,QUESTION,"[""공간 절약"",""편리함""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_1xdzhia,Reddit,Community/Forum,POST,"[Title] It\'s been real, dear friend.\\n[Body] Welp. It looks like my 35 year old Whirlpool fridge is giving it up. We\'re not interested in bells and whistles. Dependability matters most. I expect it will be costly but please help me make my money count. Thanks group.",,오래된 가전의 수명이 다해 신뢰성 높은 대체 제품을 추천받고 싶습니다.,NEUTRAL,EXPERIENCE,"[""내구성""]","[""Whirlpool""]",false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":false}",2026-10-24 06:10:38.712379+00',
      'RD_POST_1xe0e12,Reddit,Community/Forum,POST,"[Title] Appliance repair scam?\\n[Body] My microwave is broken, and the appliance manufacturer dispatched a third-party repair company to come under warranty. On the day of the repair, crickets, and then after business hours, I get a text from a random non-business number repeatedly demanding my appliance order receipt.",,수리 업체가 비전문적으로 행동하여 AS 서비스에 불안함을 느낍니다.,NEGATIVE,COMPLAINT,"[""AS""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":false}",2026-10-24 06:10:38.712379+00',
      'RD_POST_orplc0o,Reddit,Community/Forum,POST,"[Title] /u/MyMainWasMyRealName on Best washer and dryer combo in 2026?\\n[Body] I couldn’t justify speed queen prices. I went to a scratch and dent family run store and bought the most basic “dumb” LG top load with an agitator & dryer to match for 50% off retail",,LG의 기본 모델을 할인된 가격에 구매하여 가격 대비 만족스럽습니다.,POSITIVE,EXPERIENCE,"[""가격"",""디자인""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":true}",2026-10-24 06:10:38.712379+00',
      'RD_POST_orr7a9f,Reddit,Community/Forum,POST,"[Title] /u/littlepancakes on Best washer and dryer combo in 2026?\\n[Body] FWIW I bought LG and absolutely hate it.",,LG 제품 실사용 중 기대 이하의 성능으로 불만이 있습니다.,NEGATIVE,COMPLAINT,[],[],false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":true}",2026-10-24 06:10:38.712379+00',
      'RD_POST_orr9v7q,Reddit,Community/Forum,POST,"[Title] /u/Tech_Veggies on Best washer and dryer combo in 2026?\\n[Body] I own a GE washer and dryer. Don\'t buy a GE washer and dryer.",,"GE 세탁기와 건조기를 소유하고 있으며, 잦은 잔고장으로 구매 비추천.",NEGATIVE,COMPLAINT,[],"[""GE""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_orrqf56,Reddit,Community/Forum,POST,"[Title] /u/Flammable_Unicorn on Best washer and dryer combo in 2026?\\n[Body] I got an LG washer and dryer from one of those places that sells dented stuff too, about 8 years ago. I’ve been mostly happy, but this year the dial for selecting the cycles has started being glitchy, and the dryer has always complained about the vent being blocked even though I’ve torn it apart and thoroughly cleaned it and the exhaust vent three times, so I just live with it.",,"LG 세탁기와 건조기를 8년 사용했지만, 다이얼이 고장나고 건조기 센서 문제로 불편합니다.",NEGATIVE,COMPLAINT,"[""고장"",""AS""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:38.225Z"",""lg_mentioned"":true}",2026-10-24 06:10:38.712379+00',
      'RD_POST_ortb1rh,Reddit,Community/Forum,POST,"[Title] /u/Trzebs on Best washer and dryer combo in 2026?\\n[Body] This guy GEs",,GE 제품의 품질과 신뢰성에 대한 강한 불만이 있습니다.,NEGATIVE,COMPLAINT,[],"[""GE""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_orvs5s6,Reddit,Community/Forum,POST,"[Title] /u/Odd_Goat6728 on Best washer and dryer combo in 2026?\\n[Body] Do not buy GE. We had a set of front loaders we bought 4 years ago and the washer died last year. Couldn’t wait to get rid of them. It was the loudest washer I’ve ever heard. 95db on spin. My kids thought a helicopter was landing on our house. And yes it was balanced. Replaced with Electrolux which seem great.",,"GE 세탁기가 4년 만에 고장났고 탈수 소음이 극심하여 Electrolux로 교체했습니다.",NEGATIVE,COMPLAINT,"[""소음"",""내구성""]","[""GE"",""Electrolux""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oyyt13v,Reddit,Community/Forum,POST,"[Title] /u/unforgettableid on Are washer/dryer combos too good to be true?\\n[Body] They\'re convenient and efficient. Some are slow, but if u don\'t have kids, this is fine. You can just set a timer in the evening, and let them wash & dry while u sleep.",,"세탁기와 건조기 콤보는 취침 시 자동 건조 예약이 가능해 편리하고 효율적입니다.",POSITIVE,EXPERIENCE,"[""편리함"",""효율성""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oyytx5l,Reddit,Community/Forum,POST,"[Title] /u/Physical-Fly6697 on Are washer/dryer combos too good to be true?\\n[Body] I have a Bosch series 8 one and it’s fucking amazing. Being able to run a wash dry cycle for my sheets in the morning and come back to them clean and dry after work is amazing. One thing is make sure you get one with a big drum, at least 10kg.",,Bosch 시리즈 8 모델의 건조 성능이 우수하나 대용량 드럼 선택이 필수적입니다.,POSITIVE,EXPERIENCE,"[""건조 성능"",""드럼 크기""]","[""Bosch""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oyyuzbw,Reddit,Community/Forum,POST,"[Title] /u/Houstonmim on Are washer/dryer combos too good to be true?\\n[Body] I’ve had the GE combo for a year and a half. Love it. Zero complaints.",,"GE 콤보를 1년 반 사용했으며 결함 없이 만족하고 있습니다.",POSITIVE,EXPERIENCE,[],"[""GE""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oyyw1t8,Reddit,Community/Forum,POST,"[Title] /u/wolferiver on Are washer/dryer combos too good to be true?\\n[Body] I have a stacked washer and dryer. I didn\'t even know this was possible until I moved into the place I live now. It\'s been working out great. The only trouble I\'ve had so far is sometimes I have to stretch to reach the controls at the top of the dryer.",,"스택형 세탁기와 건조기가 공간 절약에 좋으나 상단 건조기 조작부 손닿기가 불편합니다.",POSITIVE,EXPERIENCE,"[""조작 편의성""]","[""Samsung""]",false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oyzhs6t,Reddit,Community/Forum,POST,"[Title] /u/dolphinandcheese on Are washer/dryer combos too good to be true?\\n[Body] That is why I out an LG washtower in my condo when I lived there. Controls are in the middle of the machine. My wife is 5\' tall and it was great.",,"LG 워시타워를 사용하고 있으며, 중간에 조작 버튼이 있어 키가 작아도 편리합니다.",POSITIVE,EXPERIENCE,"[""조작 편의성""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":true}",2026-10-24 06:10:25.935209+00',
      'RD_POST_oz0o5o8,Reddit,Community/Forum,POST,"[Title] /u/Adverbsaredumb on Are washer/dryer combos too good to be true?\\n[Body] lol I’m just saying I have a 5 bedroom house and the laundry room is smaller than my closet! The builder had to know a family would live here; and those dumbdumbs still put in the tiniest little passthrough laundry room with barely enough room for the washer and dryer. In seriousness though, a stackable set might be an option",,"세탁실이 협소하여 공간 최적화를 위해 스택형 일체형 가전을 고려 중입니다.",NEGATIVE,COMPLAINT,"[""공간 문제""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'BB_REV_001,Best Buy US,E-commerce,REVIEW,"[Review 5/5] Replaced my old laundry set with the LG WashTower. Best decision ever. The center control panel is ergonomic and drying cycle is quiet.",,LG 워시타워 중앙 제어판 조작이 인체공학적이고 건조가 조용하여 대만족.,POSITIVE,EXPERIENCE,"[""조작 편의성"",""소음""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":true}",2026-10-24 06:10:25.935209+00',
      'BB_REV_002,Best Buy US,E-commerce,REVIEW,"[Review 4/5] Love the all in one concept. Takes a bit longer to dry heavy blankets, but not having to move clothes is a lifesaver.",,올인원 세탁건조 콤보의 편리함에 만족하나 두꺼운 이불 건조 시간은 다소 소요됨.,POSITIVE,EXPERIENCE,"[""건조 성능"",""편리함""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":false}",2026-10-24 06:10:25.935209+00',
      'RT_REV_001,RTINGS.com User Feedback,Tech Review,EXPERT_REVIEW,"[RTINGS Editorial Score: 8.8/10] Outstanding washing and drying consistency. The AI Fabric sensor accurately adjusts water levels and temperature. Best-in-class vibration reduction.",,AI 직물 감지 센서 정확도 및 진동 감소 성능이 동급 최고 수준으로 우수.,POSITIVE,EXPERIENCE,"[""세척력"",""진동/소음"",""AI기능""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":true}",2026-10-24 06:10:25.935209+00'
    ];

    return header + rows.join('\n');
  },

  /**
   * 대시보드 시각화용 통합 인텔리전스 분석 지표 생성
   * - 키워드 및 선택된 기간/채널에 맞춰 동적 집계치 제공
   */
  getDashboardAnalytics(keyword = 'LG 워시콤보', period = '1m', channel = 'all') {
    const isWashCombo = !keyword || keyword.includes('워시') || keyword.includes('세탁') || keyword.includes('콤보') || keyword.includes('wash');
    
    // 기간별 스케일 계수
    let scale = 1.0;
    let periodDaysText = '최근 1개월';
    let dateRangeText = '2026-09-26 ~ 2026-10-25';
    if (period === '7d') {
      scale = 0.28;
      periodDaysText = '최근 7일';
      dateRangeText = '2026-10-19 ~ 2026-10-25';
    } else if (period === '3m') {
      scale = 2.8;
      periodDaysText = '최근 3개월';
      dateRangeText = '2026-07-26 ~ 2026-10-25';
    } else if (period === '6m') {
      scale = 5.2;
      periodDaysText = '최근 6개월';
      dateRangeText = '2026-04-26 ~ 2026-10-25';
    } else if (period === '1y') {
      scale = 9.8;
      periodDaysText = '최근 1년';
      dateRangeText = '2025-10-26 ~ 2026-10-25';
    }

    // 채널 필터에 따른 비중 조정
    let commRatio = 0.71;
    let revRatio = 0.29;
    if (channel === 'community') {
      commRatio = 1.0;
      revRatio = 0.0;
    } else if (channel === 'reviews') {
      commRatio = 0.0;
      revRatio = 1.0;
    }

    const baseTotal = Math.round(1746 * scale);
    const commTotal = Math.round(baseTotal * commRatio);
    const revTotal = Math.round(baseTotal * revRatio);
    const activeTotal = commTotal + revTotal;

    // 시계열 추이 데이터 (15개 포인트)
    const baseCommCurve = [35, 42, 68, 71, 48, 62, 63, 82, 115, 68, 55, 45, 63, 56, 32];
    const baseRevCurve = [8, 12, 10, 8, 12, 11, 10, 15, 13, 11, 14, 12, 16, 12, 10];

    const labels = [
      '9월 26일', '9월 28일', '9월 30일', '10월 2일', '10월 5일', 
      '10월 7일', '10월 9일', '10월 11일', '10월 13일', '10월 15일', 
      '10월 17일', '10월 19일', '10월 21일', '10월 23일', '10월 25일'
    ];

    const commData = baseCommCurve.map(v => Math.round(v * scale * (commRatio > 0 ? 1 : 0)));
    const revData = baseRevCurve.map(v => Math.round(v * scale * (revRatio > 0 ? 1 : 0)));
    const totalData = commData.map((v, i) => v + revData[i]);

    // 피크일 계산
    let maxIdx = 8; // 10월 13일
    let maxCount = totalData[maxIdx] || 128;
    totalData.forEach((v, idx) => {
      if (v > maxCount) {
        maxCount = v;
        maxIdx = idx;
      }
    });

    const dailyAvg = Math.max(1, Math.round(activeTotal / 30));

    // 긍정 / 중립 / 부정 비율
    const posRate = 68.4;
    const neuRate = 15.4;
    const negRate = 16.2;
    const posCount = Math.round(activeTotal * (posRate / 100));
    const neuCount = Math.round(activeTotal * (neuRate / 100));
    const negCount = activeTotal - posCount - neuCount;

    // 긍정 키워드 1~5순위 & 부정 키워드 1~5순위
    const positiveKeywords = isWashCombo ? [
      { rank: 1, keyword: '올인원 세탁건조', count: Math.round(382 * scale), percent: 32, desc: '의류 이동 없이 한 번에 건조까지 끝나는 압도적 편의성' },
      { rank: 2, keyword: '중앙 조작부(센터컨트롤)', count: Math.round(298 * scale), percent: 25, desc: '키가 작아도 손쉬운 중간 조작부의 인체공학적 설계' },
      { rank: 3, keyword: '세탁실 공간 절약', count: Math.round(245 * scale), percent: 21, desc: '세탁기+건조기 일체형으로 협소한 세탁실 공간 2배 활용' },
      { rank: 4, keyword: '저소음 / 인버터 DD', count: Math.round(156 * scale), percent: 13, desc: '밤 시간 취침 중에도 소음 걱정 없는 저진동 모터' },
      { rank: 5, keyword: 'AI 맞춤 세탁 코스', count: Math.round(113 * scale), percent: 9, desc: '직물 재질 자동 감지 및 세제 자동 투입으로 옷감 보호' }
    ] : [
      { rank: 1, keyword: '압도적 명암비 / 제로블루밍', count: Math.round(410 * scale), percent: 34, desc: '올레드 자발광 픽셀의 완벽한 블랙 표현력' },
      { rank: 2, keyword: '슬림 월마운트 갤러리 디자인', count: Math.round(320 * scale), percent: 26, desc: '벽에 밀착되는 얇은 베젤과 인테리어 완성도' },
      { rank: 3, keyword: '게이밍 퍼포먼스 (144Hz G-Sync)', count: Math.round(250 * scale), percent: 20, desc: '콘솔 및 PC 게임 반응속도 및 입력 지연 최소화' },
      { rank: 4, keyword: '알파11 AI 프로세서 업스케일링', count: Math.round(160 * scale), percent: 13, desc: '저화질 영상의 선명한 4K 화질 복원력' },
      { rank: 5, keyword: 'webOS 24 편의성 및 스마트허브', count: Math.round(98 * scale), percent: 7, desc: '빠른 앱 전환 및 음성 인식 검색 지원' }
    ];

    const negativeKeywords = isWashCombo ? [
      { rank: 1, keyword: '두꺼운 이불 건조시간', count: Math.round(142 * scale), percent: 48, desc: '대용량 극세사 침구류 건조 시 2.5~3시간 이상 소요' },
      { rank: 2, keyword: '초기 구매 가격 부담', count: Math.round(68 * scale), percent: 23, desc: '일반 분리형 세탁기 세트 대비 높은 출고가' },
      { rank: 3, keyword: '세탁실 도어 규격', count: Math.round(34 * scale), percent: 12, desc: '배송 설치 시 구형 아파트 문턱/도어 폭 확인 필요' },
      { rank: 4, keyword: '보풀 필터 청소 주기', count: Math.round(26 * scale), percent: 9, desc: '건조 주기마다 정기적인 보풀 필터 세척 권장' },
      { rank: 5, keyword: 'ThinQ Wi-Fi 연동 지연', count: Math.round(23 * scale), percent: 8, desc: '간헐적인 원격 제어 앱 푸시 알림 딜레이' }
    ] : [
      { rank: 1, keyword: '실내 직사광 반사 / 눈부심', count: Math.round(120 * scale), percent: 42, desc: '밝은 거실 창문 역광 환경에서 반사 체감' },
      { rank: 2, keyword: '고가 프리미엄 가격대', count: Math.round(82 * scale), percent: 29, desc: '경쟁 LCD/QLED TV 대비 가격 장벽' },
      { rank: 3, keyword: '내장 스피커 저음역 아쉬움', count: Math.round(41 * scale), percent: 14, desc: '슬림 바디로 인해 외장 사운드바 구매 고려' },
      { rank: 4, keyword: '매직 리모컨 호불호', count: Math.round(25 * scale), percent: 9, desc: '에어 마우스 포인터 조작 시 손목 피로도' },
      { rank: 5, keyword: '설치 기사 벽면 타공 부담', count: Math.round(17 * scale), percent: 6, desc: '아트월 대리석 벽면 타공 시 사전 점검 필요' }
    ];

    // 전체 언급 키워드 태그 클러스터
    const allKeywords = isWashCombo ? [
      { tag: '#올인원편의성', sentiment: 'pos', count: 382 },
      { tag: '#센터컨트롤', sentiment: 'pos', count: 298 },
      { tag: '#세탁실공간절약', sentiment: 'pos', count: 245 },
      { tag: '#저소음인버터', sentiment: 'pos', count: 156 },
      { tag: '#AI맞춤세탁', sentiment: 'pos', count: 113 },
      { tag: '#건조시간소요', sentiment: 'neg', count: 142 },
      { tag: '#가격부담', sentiment: 'neg', count: 68 },
      { tag: '#세탁실규격', sentiment: 'neu', count: 34 },
      { tag: '#보풀필터', sentiment: 'neu', count: 26 },
      { tag: '#자동세제투입', sentiment: 'pos', count: 89 },
      { tag: '#히트펌프건조', sentiment: 'pos', count: 144 },
      { tag: '#이불빨래', sentiment: 'neu', count: 72 },
      { tag: '#ThinQ연동', sentiment: 'neu', count: 54 },
      { tag: '#전기요금절감', sentiment: 'pos', count: 82 },
      { tag: '#경쟁사비교(GE/삼성)', sentiment: 'neu', count: 120 }
    ] : [
      { tag: '#제로블루밍', sentiment: 'pos', count: 410 },
      { tag: '#갤러리디자인', sentiment: 'pos', count: 320 },
      { tag: '#게이밍144Hz', sentiment: 'pos', count: 250 },
      { tag: '#알파11AI', sentiment: 'pos', count: 160 },
      { tag: '#webOS24', sentiment: 'pos', count: 98 },
      { tag: '#직사광반사', sentiment: 'neg', count: 120 },
      { tag: '#가격부담', sentiment: 'neg', count: 82 },
      { tag: '#사운드바필요', sentiment: 'neg', count: 41 },
      { tag: '#매직리모컨', sentiment: 'neu', count: 35 },
      { tag: '#G-Sync지원', sentiment: 'pos', count: 115 },
      { tag: '#벽밀착설치', sentiment: 'pos', count: 88 },
      { tag: '#돌비비전', sentiment: 'pos', count: 140 }
    ];

    // 채널별 반응 비교 요약
    const channelComparison = {
      community: {
        channelName: '커뮤니티 (Community)',
        siteExamples: 'Reddit r/Appliances, AVS Forum, Clien, Wykop',
        totalCount: commTotal,
        sharePercent: commRatio > 0 ? (channel === 'community' ? 100 : 71.0) : 0,
        posRate: 64.2,
        neuRate: 16.0,
        negRate: 19.8,
        discourseSummary: '실제 아파트/빌라 세탁실 공간 제약, 누수 및 진동 이슈, 경쟁사(Whirlpool/Samsung/GE)와의 가성비 및 내구성 솔직 비교 토론 중심.',
        keyTags: ['#실사용공간', '#건조시간팁', '#타사비교', '#내구성질문'],
        representativeQuote: isWashCombo 
          ? '“콤보 모델 덕분에 세탁실이 두 배로 넓어졌습니다. 중앙 컨트롤러 덕에 키 작은 가족도 쓰기 편해요.” (Reddit r/Appliances)'
          : '“G4 명암비는 압도적입니다. 거실 조명만 조금 조절하면 극장 이상의 몰입감을 줍니다.” (AVS Forum)'
      },
      reviews: {
        channelName: '제품리뷰 (Product Reviews)',
        siteExamples: 'Best Buy US, RTINGS, Home Depot, Danawa',
        totalCount: revTotal,
        sharePercent: revRatio > 0 ? (channel === 'reviews' ? 100 : 29.0) : 0,
        posRate: 78.5,
        neuRate: 12.0,
        negRate: 9.5,
        discourseSummary: '실구매 고객 평점 4.7/5점 기록. 배송 설치 만족도, 센터 컨트롤 패널 조작성, 세제 자동투입 시스템의 실용성에 대한 높은 구매 추천율.',
        keyTags: ['#조작성우수', '#디자인만족', '#AI코스추천', '#배송설치'],
        representativeQuote: isWashCombo
          ? '“Replaced my old laundry set with the LG WashTower. Best decision ever. Quiet, sleek, and intuitive.” (Best Buy 5/5)'
          : '“Outstanding picture quality and input lag. The best OLED TV for movies and gaming in 2026.” (RTINGS 8.8/10)'
      }
    };

    return {
      keyword,
      period,
      channel,
      periodDaysText,
      dateRangeText,
      kpi: {
        totalCount: activeTotal,
        peakDate: labels[maxIdx] || '10월 13일',
        peakCount: maxCount,
        dailyAvg,
        topChannel: commRatio >= revRatio ? '커뮤니티' : '제품리뷰',
        topChannelShare: commRatio >= revRatio ? '71%' : '100%',
        posRate,
        neuRate,
        negRate
      },
      trend: {
        labels,
        commData,
        revData,
        totalData,
        peakIdx: maxIdx,
        peakLabel: labels[maxIdx] || '10월 13일',
        peakCount: maxCount
      },
      sentiment: {
        posCount,
        posRate,
        neuCount,
        neuRate,
        negCount,
        negRate
      },
      positiveKeywords,
      negativeKeywords,
      allKeywords,
      channelComparison
    };
  }
};

if (typeof window !== 'undefined') {
  window.MockData = MockData;
}


