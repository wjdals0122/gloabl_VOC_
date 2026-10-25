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
      'BB_REV_003,Best Buy US,E-commerce,REVIEW,"[Review 5/5] LG OLED TV picture is completely unmatched. Zero blooming and inky blacks.",,LG OLED TV의 암부 표현력과 제로 블루밍 화질은 대체 불가능한 최고 수준.,POSITIVE,EXPERIENCE,"[""화질"",""디자인""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":true}",2026-10-24 06:10:25.935209+00',
      'RT_REV_001,RTINGS.com User Feedback,Tech Review,EXPERT_REVIEW,"[RTINGS Editorial Score: 8.8/10] Outstanding washing and drying consistency. The AI Fabric sensor accurately adjusts water levels and temperature. Best-in-class vibration reduction.",,AI 직물 감지 센서 정확도 및 진동 감소 성능이 동급 최고 수준으로 우수.,POSITIVE,EXPERIENCE,"[""세척력"",""진동/소음"",""AI기능""]",[],false,"{""analyzed_at"":""2026-10-24T06:10:25.160Z"",""lg_mentioned"":true}",2026-10-24 06:10:25.935209+00'
    ];

    return header + rows.join('\n');
  }
};

if (typeof window !== 'undefined') {
  window.MockData = MockData;
}

