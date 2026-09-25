// Demo data only. Every market, price and volume here is invented.
// Localized fields are { ru, uk, be, en }; plain strings are shared by all
// languages. Prices are the Yes price in cents (1–99), i.e. the % chance.
(() => {
  const L = (ru, uk, be, en) => ({ ru, uk, be, en });

  window.ZM_CATEGORIES = [
    { id: "trending", label: L("В тренде", "У тренді", "У трэндзе", "Trending") },
    { id: "politics", label: L("Политика", "Політика", "Палітыка", "Politics") },
    { id: "sports", label: L("Спорт", "Спорт", "Спорт", "Sports") },
    { id: "economics", label: L("Экономика", "Економіка", "Эканоміка", "Economics") },
    { id: "crypto", label: L("Крипто", "Крипто", "Крыпта", "Crypto") },
    { id: "culture", label: L("Культура", "Культура", "Культура", "Culture") },
    { id: "climate", label: L("Погода", "Погода", "Надвор'е", "Weather") },
    { id: "tech", label: L("Наука и техника", "Наука й техніка", "Навука і тэхніка", "Tech & Science") },
  ];

  window.ZM_EVENTS = [
    {
      id: "rpl-champion",
      cat: "sports",
      icon: "⚽",
      title: L(
        "Кто выиграет чемпионат России по футболу 2026/27?",
        "Хто виграє чемпіонат Росії з футболу 2026/27?",
        "Хто выйграе чэмпіянат Расіі па футболе 2026/27?",
        "Who will win the Russian Premier League 2026/27?"
      ),
      source: L("Российская Премьер-лига", "Російська Прем'єр-ліга", "Расійская Прэм'ер-ліга", "Russian Premier League"),
      opens: "2026-07-15",
      closes: "2027-05-30",
      volume: 4820000,
      markets: [
        { id: "zenit", label: L("Зенит", "Зеніт", "Зеніт", "Zenit"), price: 38 },
        { id: "krasnodar", label: L("Краснодар", "Краснодар", "Краснадар", "Krasnodar"), price: 24 },
        { id: "spartak", label: L("Спартак", "Спартак", "Спартак", "Spartak"), price: 14 },
        { id: "cska", label: L("ЦСКА", "ЦСКА", "ЦСКА", "CSKA"), price: 11 },
        { id: "lokomotiv", label: L("Локомотив", "Локомотив", "Лакаматыў", "Lokomotiv"), price: 8 },
        { id: "dynamo", label: L("Динамо", "Динамо", "Дынама", "Dynamo"), price: 5 },
      ],
    },
    {
      id: "usd-rub",
      cat: "economics",
      icon: "💱",
      title: L(
        "Курс доллара к рублю на 31 декабря",
        "Курс долара до рубля на 31 грудня",
        "Курс долара да рубля на 31 снежня",
        "USD/RUB exchange rate on December 31"
      ),
      source: L("Банк России", "Банк Росії", "Банк Расіі", "Bank of Russia"),
      opens: "2026-06-01",
      closes: "2026-12-31",
      volume: 3150000,
      markets: [
        { id: "lt85", label: L("Ниже 85 ₽", "Нижче 85 ₽", "Ніжэй за 85 ₽", "Below 85 ₽"), price: 12 },
        { id: "85-90", label: "85–90 ₽", price: 21 },
        { id: "90-95", label: "90–95 ₽", price: 30 },
        { id: "95-100", label: "95–100 ₽", price: 22 },
        { id: "gt100", label: L("Выше 100 ₽", "Вище 100 ₽", "Вышэй за 100 ₽", "Above 100 ₽"), price: 15 },
      ],
    },
    {
      id: "cbr-rate",
      cat: "economics",
      icon: "🏦",
      title: L(
        "Снизит ли ЦБ ключевую ставку на октябрьском заседании?",
        "Чи знизить ЦБ РФ ключову ставку на жовтневому засіданні?",
        "Ці знізіць ЦБ РФ ключавую стаўку на кастрычніцкім пасяджэнні?",
        "Will the Bank of Russia cut its key rate in October?"
      ),
      source: L("Банк России", "Банк Росії", "Банк Расіі", "Bank of Russia"),
      opens: "2026-09-01",
      closes: "2026-10-23",
      volume: 1940000,
      markets: [{ id: "yes", price: 62 }],
    },
    {
      id: "eurovision-2027",
      cat: "culture",
      icon: "🎤",
      title: L(
        "Какая страна выиграет Евровидение-2027?",
        "Яка країна виграє Євробачення-2027?",
        "Якая краіна выйграе Еўрабачанне-2027?",
        "Which country will win Eurovision 2027?"
      ),
      source: L("Европейский вещательный союз", "Європейська мовна спілка", "Еўрапейскі вяшчальны саюз", "European Broadcasting Union"),
      opens: "2026-05-20",
      closes: "2027-05-15",
      volume: 2710000,
      markets: [
        { id: "ukraine", label: L("Украина", "Україна", "Украіна", "Ukraine"), price: 18 },
        { id: "sweden", label: L("Швеция", "Швеція", "Швецыя", "Sweden"), price: 16 },
        { id: "poland", label: L("Польша", "Польща", "Польшча", "Poland"), price: 9 },
        { id: "croatia", label: L("Хорватия", "Хорватія", "Харватыя", "Croatia"), price: 8 },
        { id: "czechia", label: L("Чехия", "Чехія", "Чэхія", "Czechia"), price: 6 },
        { id: "serbia", label: L("Сербия", "Сербія", "Сербія", "Serbia"), price: 5 },
      ],
    },
    {
      id: "btc-150k",
      cat: "crypto",
      icon: "₿",
      title: L(
        "Биткоин выше $150 000 до конца года?",
        "Біткоїн вище $150 000 до кінця року?",
        "Біткойн вышэй за $150 000 да канца года?",
        "Bitcoin above $150,000 by year end?"
      ),
      source: "CoinGecko",
      opens: "2026-01-02",
      closes: "2026-12-31",
      volume: 5630000,
      markets: [{ id: "yes", price: 27 }],
    },
    {
      id: "ton-price",
      cat: "crypto",
      icon: "💎",
      title: L(
        "Цена Toncoin (TON) на 31 декабря",
        "Ціна Toncoin (TON) на 31 грудня",
        "Кошт Toncoin (TON) на 31 снежня",
        "Toncoin (TON) price on December 31"
      ),
      source: "CoinGecko",
      opens: "2026-06-01",
      closes: "2026-12-31",
      volume: 880000,
      markets: [
        { id: "lt2", label: L("Ниже $2", "Нижче $2", "Ніжэй за $2", "Below $2"), price: 20 },
        { id: "2-4", label: "$2–4", price: 45 },
        { id: "4-6", label: "$4–6", price: 25 },
        { id: "gt6", label: L("Выше $6", "Вище $6", "Вышэй за $6", "Above $6"), price: 10 },
      ],
    },
    {
      id: "khl-cup",
      cat: "sports",
      icon: "🏒",
      title: L(
        "Кто выиграет Кубок Гагарина 2027?",
        "Хто виграє Кубок Гагаріна 2027?",
        "Хто выйграе Кубак Гагарына 2027?",
        "Who will win the 2027 Gagarin Cup?"
      ),
      source: L("КХЛ", "КХЛ", "КХЛ", "KHL"),
      opens: "2026-09-01",
      closes: "2027-04-30",
      volume: 1260000,
      markets: [
        { id: "ska", label: L("СКА", "СКА", "СКА", "SKA"), price: 22 },
        { id: "metallurg", label: L("Металлург Мг", "Металург Мг", "Металург Мг", "Metallurg Mg"), price: 19 },
        { id: "lokomotiv", label: L("Локомотив", "Локомотив", "Лакаматыў", "Lokomotiv"), price: 17 },
        { id: "avangard", label: L("Авангард", "Авангард", "Авангард", "Avangard"), price: 15 },
        { id: "cska", label: L("ЦСКА", "ЦСКА", "ЦСКА", "CSKA"), price: 12 },
        { id: "dinamo-minsk", label: L("Динамо Минск", "Динамо Мінськ", "Дынама Мінск", "Dinamo Minsk"), price: 6 },
      ],
    },
    {
      id: "upl-champion",
      cat: "sports",
      icon: "🏆",
      title: L(
        "Кто выиграет Премьер-лигу Украины 2026/27?",
        "Хто виграє Прем'єр-лігу України 2026/27?",
        "Хто выйграе Прэм'ер-лігу Украіны 2026/27?",
        "Who will win the Ukrainian Premier League 2026/27?"
      ),
      source: L("Украинская Премьер-лига", "Українська Прем'єр-ліга", "Украінская Прэм'ер-ліга", "Ukrainian Premier League"),
      opens: "2026-08-01",
      closes: "2027-05-31",
      volume: 1730000,
      markets: [
        { id: "shakhtar", label: L("Шахтёр", "Шахтар", "Шахцёр", "Shakhtar"), price: 45 },
        { id: "dynamo-kyiv", label: L("Динамо Киев", "Динамо Київ", "Дынама Кіеў", "Dynamo Kyiv"), price: 38 },
        { id: "polissya", label: L("Полесье", "Полісся", "Палессе", "Polissya"), price: 10 },
        { id: "kryvbas", label: L("Кривбасс", "Кривбас", "Крывбас", "Kryvbas"), price: 7 },
      ],
    },
    {
      id: "moscow-snow",
      cat: "climate",
      icon: "❄️",
      title: L(
        "Выпадет ли первый снег в Москве до 1 ноября?",
        "Чи випаде перший сніг у Москві до 1 листопада?",
        "Ці выпадзе першы снег у Маскве да 1 лістапада?",
        "Will Moscow see its first snow before November 1?"
      ),
      source: L("Гидрометцентр России", "Гідрометцентр Росії", "Гідраметцэнтр Расіі", "Hydrometcenter of Russia"),
      opens: "2026-09-01",
      closes: "2026-11-01",
      volume: 410000,
      markets: [{ id: "yes", price: 71 }],
    },
    {
      id: "kyiv-temp",
      cat: "climate",
      icon: "🌡️",
      title: L(
        "Максимальная температура в Киеве 1 октября",
        "Максимальна температура в Києві 1 жовтня",
        "Максімальная тэмпература ў Кіеве 1 кастрычніка",
        "Kyiv high temperature on October 1"
      ),
      source: L("Укргидрометцентр", "Укргідрометцентр", "Укргідраметцэнтр", "Ukrainian Hydrometeorological Center"),
      opens: "2026-09-20",
      closes: "2026-10-01",
      volume: 190000,
      markets: [
        { id: "lt10", label: L("Ниже 10 °C", "Нижче 10 °C", "Ніжэй за 10 °C", "Below 10 °C"), price: 8 },
        { id: "10-13", label: "10–13 °C", price: 27 },
        { id: "14-17", label: "14–17 °C", price: 41 },
        { id: "gt18", label: L("18 °C и выше", "18 °C і вище", "18 °C і вышэй", "18 °C or above"), price: 24 },
      ],
    },
    {
      id: "poland-cpi",
      cat: "economics",
      icon: "📈",
      title: L(
        "Инфляция в Польше за сентябрь выше 3%?",
        "Інфляція в Польщі за вересень вище 3%?",
        "Інфляцыя ў Польшчы за верасень вышэй за 3%?",
        "Poland September inflation above 3%?"
      ),
      source: L("Главное статистическое управление Польши", "Головне статистичне управління Польщі", "Галоўнае статыстычнае ўпраўленне Польшчы", "Statistics Poland (GUS)"),
      opens: "2026-09-01",
      closes: "2026-10-15",
      volume: 520000,
      markets: [{ id: "yes", price: 55 }],
    },
    {
      id: "serbia-eu",
      cat: "politics",
      icon: "🇪🇺",
      title: L(
        "Вступит ли Сербия в ЕС до 2030 года?",
        "Чи вступить Сербія до ЄС до 2030 року?",
        "Ці ўступіць Сербія ў ЕС да 2030 года?",
        "Will Serbia join the EU before 2030?"
      ),
      source: L("Официальный журнал ЕС", "Офіційний журнал ЄС", "Афіцыйны часопіс ЕС", "Official Journal of the EU"),
      opens: "2026-01-10",
      closes: "2029-12-31",
      volume: 960000,
      markets: [{ id: "yes", price: 9 }],
    },
    {
      id: "czech-coalition",
      cat: "politics",
      icon: "🏛️",
      title: L(
        "Сохранится ли правящая коалиция Чехии до конца 2026 года?",
        "Чи збережеться правляча коаліція Чехії до кінця 2026 року?",
        "Ці захаваецца кіруючая кааліцыя Чэхіі да канца 2026 года?",
        "Will Czechia's governing coalition hold through 2026?"
      ),
      source: L("Правительство Чехии", "Уряд Чехії", "Урад Чэхіі", "Government of Czechia"),
      opens: "2026-03-01",
      closes: "2026-12-31",
      volume: 640000,
      markets: [{ id: "yes", price: 81 }],
    },
    {
      id: "telegram-users",
      cat: "tech",
      icon: "📱",
      title: L(
        "Telegram превысит 1,5 млрд активных пользователей до 2027 года?",
        "Telegram перевищить 1,5 млрд активних користувачів до 2027 року?",
        "Telegram перавысіць 1,5 млрд актыўных карыстальнікаў да 2027 года?",
        "Will Telegram pass 1.5B monthly users before 2027?"
      ),
      source: L("Официальный канал Telegram", "Офіційний канал Telegram", "Афіцыйны канал Telegram", "Telegram's official channel"),
      opens: "2026-02-01",
      closes: "2026-12-31",
      volume: 1120000,
      markets: [{ id: "yes", price: 33 }],
    },
    {
      id: "angara-launch",
      cat: "tech",
      icon: "🚀",
      title: L(
        "Успешный запуск «Ангары-А5» до конца года?",
        "Успішний запуск «Ангари-А5» до кінця року?",
        "Паспяховы запуск «Ангары-А5» да канца года?",
        "Successful Angara-A5 launch before year end?"
      ),
      source: L("Роскосмос", "Роскосмос", "Раскосмас", "Roscosmos"),
      opens: "2026-04-01",
      closes: "2026-12-31",
      volume: 350000,
      markets: [{ id: "yes", price: 58 }],
    },
    {
      id: "oscar-poland",
      cat: "culture",
      icon: "🎬",
      title: L(
        "Попадёт ли польский фильм в номинацию «Оскара» за лучший международный фильм?",
        "Чи потрапить польський фільм до номінації «Оскара» за найкращий міжнародний фільм?",
        "Ці трапіць польскі фільм у намінацыю «Оскара» за лепшы міжнародны фільм?",
        "Will a Polish film get an Oscar nomination for Best International Feature?"
      ),
      source: L("Американская киноакадемия", "Американська кіноакадемія", "Амерыканская кінаакадэмія", "Academy of Motion Picture Arts and Sciences"),
      opens: "2026-08-15",
      closes: "2027-01-21",
      volume: 470000,
      markets: [{ id: "yes", price: 44 }],
    },
  ];
})();
