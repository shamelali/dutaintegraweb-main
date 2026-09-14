/* ========================================
   SITE.JS — shared across all pages
   Dark mode + Language toggle (EN/BM)
   ======================================== */

(function () {
  'use strict';

  /* ---------- DARK MODE ---------- */
  function initDarkMode() {
    if (localStorage.getItem('darkMode') === 'enabled') {
      document.body.classList.add('dark-mode');
    }
    updateDarkIcon();
  }

  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkIcon();
  }

  function updateDarkIcon() {
    const btn = document.getElementById('darkToggle');
    if (!btn) return;
    btn.innerHTML = document.body.classList.contains('dark-mode')
      ? '<i class="ti ti-sun"></i>'
      : '<i class="ti ti-moon"></i>';
  }

  /* ---------- LANGUAGE ---------- */
  var currentLang = localStorage.getItem('language') || 'en';

  // Translations keyed by data-i18n attribute
  var T = {
    // ---- NAV ----
    navServices:      { en: 'Services',      bm: 'Perkhidmatan' },
    navAbout:         { en: 'About',         bm: 'Tentang' },
    navPricing:       { en: 'Pricing',       bm: 'Harga' },
    navContact:       { en: 'Contact Us',    bm: 'Hubungi Kami' },
    navQuiz:          { en: 'Find Your Tier', bm: 'Cari Pelan Anda' },
    navAutonomousOps: { en: 'Autonomous Ops', bm: 'Autonomous Ops' },
    navCaseStudies:   { en: 'Case Studies',  bm: 'Kajian Kes' },
    navClientPortal:  { en: 'Client Portal', bm: 'Portal Pelanggan' },
    navFaq:           { en: 'FAQ',           bm: 'Soalan Lazim' },
    navCalculator:    { en: 'Calculator',    bm: 'Kalkulator' },

    // ---- INDEX PAGE ----
    idxHeroBadge:     { en: '🇲🇾 Founder-Led · AI-First · Cyberjaya, Malaysia', bm: '🇲🇾 Ditubuhkan oleh Pengasas · AI-Pertama · Cyberjaya, Malaysia' },
    idxHeroTitle1:    { en: 'Smart Technology.', bm: 'Teknologi Cerdas.' },
    idxHeroTitle2:    { en: 'A Partner Who Answers.', bm: 'Rakan Kongsi Yang Menjawab.' },
    idxHeroDesc:      { en: 'We build the AI systems and manage the IT infrastructure Malaysian SMEs run on — with the founder still on every account, a real proposal within 3 working days, and no lock-in contracts.', bm: 'Kami membina sistem AI dan mengurus infrastruktur IT yang dijalankan oleh SME Malaysia — dengan pengasas masih terlibat dalam setiap akaun, cadangan sebenar dalam 3 hari bekerja, dan tiada kontrak penguncian.' },
    idxHeroBtn1:      { en: 'Get a Free IT Audit', bm: 'Dapatkan Audit IT Percuma' },
    idxHeroBtn2:      { en: 'Explore Services →', bm: 'Terokai Perkhidmatan →' },
    idxStat1:         { en: 'Happy Clients',  bm: 'Pelanggan Berpuas Hati' },
    idxStat2:         { en: 'Custom Solutions', bm: 'Penyelesaian Tersuai' },
    idxStat3:         { en: '24/7 IT Support', bm: 'Sokongan IT 24/7' },
    idxStat4:         { en: 'Malaysian Owned', bm: 'Milikan Malaysia' },
    idxSvcEyebrow:    { en: 'What We Do',    bm: 'Apa Yang Kami Buat' },
    idxSvcTitle:      { en: 'Two Pillars. One Partner.', bm: 'Dua Pilar. Satu Rakan Kongsi.' },
    idxSvcSub:        { en: 'We combine cutting-edge AI development with rock-solid managed IT — so you never need to juggle vendors again.', bm: 'Kami menggabungkan pembangunan AI tercanggih dengan IT terurus yang mantap — jadi anda tidak perlu berurusan dengan banyak vendor lagi.' },
    idxSvc1Title:     { en: 'AI Software Development', bm: 'Pembangunan Perisian AI' },
    idxSvc1Desc:      { en: 'Custom AI applications, smart chatbots, and process automation built specifically for your business workflows.', bm: 'Aplikasi AI tersuai, chatbot pintar, dan automasi proses yang dibina khusus untuk aliran kerja perniagaan anda.' },
    idxSvc2Title:     { en: 'Managed IT Services', bm: 'Perkhidmatan IT Diurus' },
    idxSvc2Desc:      { en: 'End-to-end IT management — cloud infrastructure, helpdesk, network security, and hardware maintenance.', bm: 'Pengurusan IT end-to-end — infrastruktur awan, helpdesk, keselamatan rangkaian, dan penyelenggaraan perkakasan.' },
    idxSvc3Title:     { en: 'Cloud Migration & Management', bm: 'Pemindahan & Pengurusan Awan' },
    idxSvc3Desc:      { en: 'Move your business to the cloud smoothly with planning, migration, and ongoing cloud management.', bm: 'Pindahkan perniagaan anda ke awan dengan lancar dengan perancangan, pemindahan, dan pengurusan awan berterusan.' },
    idxSvc4Title:     { en: 'IT Security & Compliance', bm: 'Keselamatan & Pematuhan IT' },
    idxSvc4Desc:      { en: 'PDPA compliance audits, cybersecurity monitoring, and data protection policies for your peace of mind.', bm: 'Audit pematuhan PDPA, pemantauan keselamatan siber, dan dasar perlindungan data untuk ketenangan minda anda.' },
    idxLearnMore:     { en: 'Learn more →',   bm: 'Ketahui lebih lanjut →' },
    idxClientsTitle:  { en: 'Trusted by businesses across Malaysia', bm: 'Dipercayai oleh perniagaan di seluruh Malaysia' },
    idxWhyEyebrow:    { en: 'Why Choose Us',  bm: 'Mengapa Pilih Kami' },
    idxWhyTitle:      { en: 'Built for Malaysian SMEs', bm: 'Dibina untuk SME Malaysia' },
    idxWhy1Title:     { en: 'Local Expertise', bm: 'Kepakaran Tempatan' },
    idxWhy1Desc:      { en: 'We understand PDPA, SST, ePerolehan, and the Malaysian SME landscape. No need to explain local context to us.', bm: 'Kami memahami PDPA, SST, ePerolehan, dan landskap SME Malaysia. Tiada keperluan untuk menjelaskan konteks tempatan kepada kami.' },
    idxWhy2Title:     { en: 'AI + IT Combined', bm: 'AI + IT Digabungkan' },
    idxWhy2Desc:      { en: 'One vendor for your AI aspirations and daily IT — simpler, cheaper, and better aligned.', bm: 'Satu vendor untuk cita-cita AI dan IT harian anda — lebih mudah, lebih murah, dan lebih selaras.' },
    idxWhy3Title:     { en: 'Transparent Pricing', bm: 'Harga Telus' },
    idxWhy3Desc:      { en: 'No hidden fees. Clear monthly retainers and project scopes designed for growing businesses.', bm: 'Tiada yuran tersembunyi. Retainer bulanan yang jelas dan skop projek yang direka untuk perniagaan yang berkembang.' },
    idxWhy4Title:     { en: 'Fast Onboarding', bm: 'Onboarding Pantas' },
    idxWhy4Desc:      { en: 'Free initial audit, clear proposal within 3 working days, and on-time delivery you can count on.', bm: 'Audit awal percuma, cadangan jelas dalam 3 hari bekerja, dan penghantaran tepat masa yang boleh anda harapkan.' },
    idxCtaTitle:      { en: 'Ready to Modernize Your Business?', bm: 'Bersedia Memodenkan Perniagaan Anda?' },
    idxCtaDesc:       { en: 'Start with a free IT audit or AI readiness assessment — no obligation, no strings attached.', bm: 'Mulakan dengan audit IT percuma atau penilaian kesediaan AI — tiada obligasi, tiada syarat.' },
    idxCtaBtn1:       { en: 'Book Free Consultation', bm: 'Buat Temujanji Percuma' },
    idxCtaBtn2:       { en: 'View Pricing',   bm: 'Lihat Harga' },
    idxStat1Label:    { en: 'Days to First Proposal', bm: 'Hari Ke Cadangan Pertama' },
    idxStat2Label:    { en: '24/7 Managed IT Support', bm: 'Sokongan IT Terurus 24/7' },
    idxStat3Label:    { en: 'Lock-In Contracts', bm: 'Kontrak Pengikatan' },
    idxStat4Label:    { en: 'Malaysian-owned',  bm: 'Milikan Malaysia' },

    // ---- FOOTER ----
    idxFooterDesc:    { en: 'Your trusted AI and IT partner in Malaysia. We help SMEs modernize, automate, and grow through smart technology.', bm: 'Rakan kongsi AI dan IT anda yang dipercayai di Malaysia. Kami membantu SME memodenkan, mengautomasi, dan berkembang melalui teknologi pintar.' },
    idxFooterCompany: { en: 'Company',        bm: 'Syarikat' },
    idxFooterStats:   { en: 'Live Stats',     bm: 'Statistik Langsung' },
    idxFooterInsights:{ en: 'Insights',       bm: 'Pandangan' },
    idxFooterServices:{ en: 'Services',       bm: 'Perkhidmatan' },
    idxFooterAiDev:   { en: 'AI Development', bm: 'Pembangunan AI' },
    idxFooterManagedIt:{ en: 'Managed IT',    bm: 'IT Terurus' },
    idxFooterCloudMig:{ en: 'Cloud Migration', bm: 'Pemindahan Awan' },
    idxFooterItSec:   { en: 'IT Security',    bm: 'Keselamatan IT' },
    idxFooterCopy:    { en: '© 2026 Duta Integra Solutions Sdn Bhd. All rights reserved. | Tamarind Suites, Cyberjaya, Selangor', bm: '© 2026 Duta Integra Solutions Sdn Bhd. Hak cipta terpelihara. | Tamarind Suites, Cyberjaya, Selangor' },
    idxFooterDesc:    { en: 'Your trusted AI and IT partner in Malaysia. We help SMEs modernise, automate, and grow through smart technology.', bm: 'Rakan kongsi AI dan IT kepercayaan anda di Malaysia. Kami membantu SME memodenkan, mengautomasi, dan berkembang melalui teknologi cerdik.' },
    idxFooterCompany: { en: 'Company',       bm: 'Syarikat' },
    idxFooterServices:{ en: 'Services',      bm: 'Perkhidmatan' },

    // ---- SERVICES PAGE ----
    svcHeroLabel:     { en: 'Our Services',  bm: 'Perkhidmatan Kami' },
    svcHeroTitle:     { en: 'Everything Your Business Needs to Thrive Digitally', bm: 'Semua Yang Perniagaan Anda Perlukan untuk Berjaya Secara Digital' },
    svcHeroDesc:      { en: "From AI-powered automation to round-the-clock IT support — we're your complete technology partner so you can focus on growing your business.", bm: 'Dari automasi AI hingga sokongan IT 24 jam — kami adalah rakan teknologi lengkap anda supaya anda boleh fokus pada perkembangan perniagaan.' },
    svcCoreEyebrow:   { en: 'Core Offerings', bm: 'Tawaran Utama' },
    svcCoreTitle:     { en: 'What We Deliver', bm: 'Apa Yang Kami Sampaikan' },
    svc1Title:        { en: 'AI Software Development', bm: 'Pembangunan Perisian AI' },
    svc1Desc:         { en: 'We design and build custom AI-powered applications that automate repetitive tasks, extract insights from your data, and create smarter customer experiences.', bm: 'Kami mereka bentuk dan membina aplikasi AI tersuai yang mengautomasi tugas berulang, mengekstrak pandangan dari data anda, dan mencipta pengalaman pelanggan yang lebih pintar.' },
    svc2Title:        { en: 'Managed IT Services', bm: 'Perkhidmatan IT Diurus' },
    svc2Desc:         { en: 'We take full ownership of your IT infrastructure so you never have to worry about downtime, security breaches, or outdated systems again.', bm: 'Kami mengambil alih sepenuhnya infrastruktur IT anda supaya anda tidak perlu risau tentang masa henti, pelanggaran keselamatan, atau sistem usang lagi.' },
    svc3Title:        { en: 'Cloud Migration & Management', bm: 'Pemindahan & Pengurusan Awan' },
    svc3Desc:         { en: 'Move your business to the cloud safely and efficiently. We handle everything from planning to post-migration support on AWS, Azure, and Google Cloud.', bm: 'Pindahkan perniagaan anda ke awan dengan selamat dan cekap. Kami mengurus segalanya dari perancangan hingga sokongan pasca-pemindahan di AWS, Azure, dan Google Cloud.' },
    svc4Title:        { en: 'IT Security & PDPA Compliance', bm: 'Keselamatan IT & Pematuhan PDPA' },
    svc4Desc:         { en: "Protect your business from cyber threats and ensure you're fully compliant with Malaysia's Personal Data Protection Act (PDPA) 2010.", bm: 'Lindungi perniagaan anda daripada ancaman siber dan pastikan anda mematuhi sepenuhnya Akta Perlindungan Data Peribadi Malaysia (PDPA) 2010.' },
    svc5Title:        { en: 'Business Intelligence (Launching Next)', bm: 'Perniagaan Pintar (Akan Datang)' },
    svc5Desc:         { en: 'Transform raw data into actionable insights with our upcoming Business Intelligence solutions — interactive dashboards, predictive analytics, and automated reporting.', bm: 'Tukar data mentah menjadi pandangan boleh diambil tindakan dengan penyelesaian Perniagaan Pintar kami yang akan datang — papan interaktif, analitik ramalan, dan pelaporan automatik.' },
    svc1Feat1:        { en: 'Custom AI chatbots & virtual assistants', bm: 'Chatbot AI tersuai & pembantu maya' },
    svc1Feat2:        { en: 'Business process automation (RPA)', bm: 'Automasi proses perniagaan (RPA)' },
    svc1Feat3:        { en: 'Machine learning models & data pipelines', bm: 'Model pembelajaran mesin & saluran data' },
    svc1Feat4:        { en: 'AI integration into existing systems', bm: 'Integrasi AI ke dalam sistem sedia ada' },
    svc1Feat5:        { en: 'Natural language processing (NLP) tools', bm: 'Alat pemprosesan bahasa semula jadi (NLP)' },
    svc1Feat6:        { en: 'AI-powered dashboards & reporting', bm: 'Papan pemuka bertenaga AI & pelaporan' },
    svc2Feat1:        { en: '24/7 remote IT helpdesk support', bm: 'Sokongan helpdesk IT jarak jauh 24/7' },
    svc2Feat2:        { en: 'Network setup, monitoring & management', bm: 'Persediaan rangkaian, pemantauan & pengurusan' },
    svc2Feat3:        { en: 'Hardware procurement & maintenance', bm: 'Pemerolehan & penyelenggaraan perkakasan' },
    svc2Feat4:        { en: 'Server management & backups', bm: 'Pengurusan pelayan & sandaran' },
    svc2Feat5:        { en: 'Software licensing & updates', bm: 'Lesen perisian & kemas kini' },
    svc2Feat6:        { en: 'Monthly IT health reports', bm: 'Laporan kesihatan IT bulanan' },
    svc3Feat1:        { en: 'Cloud readiness assessment', bm: 'Penilaian kesediaan awan' },
    svc3Feat2:        { en: 'Migration planning & execution', bm: 'Perancangan & pelaksanaan pemindahan' },
    svc3Feat3:        { en: 'AWS, Azure & Google Cloud setup', bm: 'Persediaan AWS, Azure & Google Cloud' },
    svc3Feat4:        { en: 'Hybrid cloud architecture', bm: 'Seni bina awan hibrid' },
    svc3Feat5:        { en: 'Cloud cost optimisation', bm: 'Pengoptimuman kos awan' },
    svc3Feat6:        { en: 'Ongoing cloud management', bm: 'Pengurusan awan berterusan' },
    svc4Feat1:        { en: 'PDPA compliance audit & policy drafting', bm: 'Audit pematuhan PDPA & penggubalan dasar' },
    svc4Feat2:        { en: 'Cybersecurity risk assessment', bm: 'Penilaian risiko keselamatan siber' },
    svc4Feat3:        { en: 'Firewall & endpoint protection', bm: 'Perlindungan tembok api & titik akhir' },
    svc4Feat4:        { en: 'Employee security awareness training', bm: 'Latihan kesedaran keselamatan pekerja' },
    svc4Feat5:        { en: 'Incident response planning', bm: 'Perancangan respons insiden' },
    svc4Feat6:        { en: 'Ongoing security monitoring', bm: 'Pemantauan keselamatan berterusan' },
    svc5Feat1:        { en: 'Sales intelligence & revenue tracking', bm: 'Kepintaran jualan & penjejakan pendapatan' },
    svc5Feat2:        { en: 'Marketing campaign performance analytics', bm: 'Analitik prestasi kempen pemasaran' },
    svc5Feat3:        { en: 'Inventory & fulfillment monitoring', bm: 'Pemantauan inventori & pemenuhan' },
    svc5Feat4:        { en: 'Retail & branch performance benchmarking', bm: 'Penanda aras prestasi runcit & cawangan' },
    svc5Feat5:        { en: 'AI-powered insights & recommendations', bm: 'Pandangan & cadangan bertenaga AI' },
    svc5Feat6:        { en: 'Real-time operational dashboards', bm: 'Papan pemuka operasi masa nyata' },
    svcGetQuote:      { en: 'Get a Quote',   bm: 'Dapatkan Sebut Harga' },
    svcGetNotified:   { en: 'Get Notified',  bm: 'Dapatkan Pemberitahuan' },
    svcProcessEyebrow:{ en: 'How We Work',   bm: 'Cara Kami Bekerja' },
    svcProcessTitle:  { en: 'Our Process',   bm: 'Proses Kami' },
    svcProcessSub:    { en: 'Simple, transparent, and built around your needs.', bm: 'Mudah, telus, dan dibina mengikut keperluan anda.' },
    svcStep1Title:    { en: 'Free Audit',    bm: 'Audit Percuma' },
    svcStep1Desc:     { en: 'We assess your current IT setup or AI readiness — no obligation, no sales pressure.', bm: 'Kami menilai persediaan IT semasa atau kesediaan AI anda — tiada obligasi, tiada tekanan jualan.' },
    svcStep2Title:    { en: 'Proposal',      bm: 'Cadangan' },
    svcStep2Desc:     { en: 'You get a clear, detailed proposal with scope, timeline, and fixed pricing within 3 working days.', bm: 'Anda mendapat cadangan jelas terperinci dengan skop, garis masa, dan harga tetap dalam 3 hari bekerja.' },
    svcStep3Title:    { en: 'Delivery',      bm: 'Penghantaran' },
    svcStep3Desc:     { en: 'Our team executes the project with weekly check-ins and full transparency throughout.', bm: 'Pasukan kami melaksanakan projek dengan semakan mingguan dan ketelusan penuh sepanjang masa.' },
    svcStep4Title:    { en: 'Support',       bm: 'Sokongan' },
    svcStep4Desc:     { en: "We don't disappear after delivery — ongoing support and optimisation is part of the package.", bm: 'Kami tidak hilang selepas penghantaran — sokongan berterusan dan pengoptimuman adalah sebahagian daripada pakej.' },
    svcCtaTitle:      { en: 'Not Sure Which Service You Need?', bm: 'Tidak Pasti Perkhidmatan Yang Anda Perlukan?' },
    svcCtaDesc:       { en: "Book a free 30-minute consultation and we'll recommend the right solution for your business.", bm: 'Buat temujanji percuma 30 minit dan kami akan mengesyorkan penyelesaian yang sesuai untuk perniagaan anda.' },
    svcCtaBtn1:       { en: 'Book Free Consultation', bm: 'Buat Temujanji Percuma' },
    svcCtaBtn2:       { en: 'See Pricing →',  bm: 'Lihat Harga →' },

    // ---- ABOUT PAGE ----
    aboutHeroLabel:   { en: 'About Us',      bm: 'Tentang Kami' },
    aboutHeroTitle:   { en: 'Technology With a Malaysian Heart', bm: 'Teknologi Dengan Hati Malaysia' },
    aboutHeroDesc:    { en: "We started Duta Integra Solutions because Malaysian SMEs deserve world-class technology without the big-city price tag or the runaround.", bm: 'Kami menubuhkan Duta Integra Solutions kerana SME Malaysia berhak mendapat teknologi bertaraf dunia tanpa harga mahal atau perlayaran.' },
    aboutStoryTitle:  { en: 'Our Story',     bm: 'Kisah Kami' },
    aboutStory1:      { en: "Duta Integra Solutions was born in Cyberjaya, Selangor in 2026 with a simple mission: make AI and enterprise-grade IT accessible to every Malaysian business — not just the large corporations in KL.", bm: 'Duta Integra Solutions dilahirkan di Cyberjaya, Selangor pada tahun 2026 dengan misi mudah: menjadikan AI dan IT bertaraf perusahaan boleh diakses oleh setiap perniagaan Malaysia — bukan hanya syarikat besar di KL.' },
    aboutStory2:      { en: "We noticed that SMEs across Malaysia were falling behind because they couldn't find reliable local technology partners who understood both the business context and the technical depth needed to make real change.", bm: 'Kami perhatikan SME di seluruh Malaysia ketinggalan kerana tidak dapat menemui rakan kongsi teknologi tempatan yang boleh dipercayai yang memahami konteks perniagaan dan kedalaman teknikal yang diperlukan untuk perubahan sebenar.' },
    aboutStory3:      { en: "So we built that partner. One that speaks your language, understands PDPA and local compliance, moves fast, and stands behind its work long after the project is delivered.", bm: 'Jadi kami membina rakan kongsi itu. Satu yang bercakap bahasa anda, memahami PDPA dan pematuhan tempatan, bergerak pantas, dan berdiri di belakang kerja lama selepas projek disampaikan.' },
    aboutStory4:      { en: 'Today, we serve clients across multiple industries and are proud to be 100% Malaysian-owned and operated.', bm: 'Hari ini, kami melayani pelanggan merentasi pelbagai industri dan bangga menjadi 100% dimiliki dan dikendalikan oleh Malaysia.' },
    aboutWorkBtn:     { en: 'Work With Us',  bm: 'Bekerja Dengan Kami' },
    aboutFounded:     { en: 'Founded in Cyberjaya', bm: 'Ditubuhkan di Cyberjaya' },
    aboutClients:     { en: 'Clients Served', bm: 'Pelanggan Dilayan' },
    aboutOwned:       { en: 'Malaysian-Owned', bm: 'Milikan Malaysia' },
    aboutDual:        { en: 'Dual Expertise Under One Roof', bm: 'Dua Kepakaran Di Bawah Satu Bumbung' },
    aboutValuesEyebrow:{ en: 'What We Stand For', bm: 'Apa Yang Kami Pertahankan' },
    aboutValuesTitle: { en: 'Our Values',    bm: 'Nilai Kami' },
    aboutVal1Title:   { en: 'Clarity Over Jargon', bm: 'Kejelasan Mengatasi Jargon' },
    aboutVal1Desc:    { en: 'We explain everything in plain language. No tech-speak, no confusion — just clear communication at every step.', bm: 'Kami menerangkan segala-galanya dalam bahasa biasa. Tiada bahasa teknikal, tiada kekeliruan — hanya komunikasi jelas pada setiap langkah.' },
    aboutVal2Title:   { en: 'Partnership, Not Transaction', bm: 'Perkongsian, Bukan Transaksi' },
    aboutVal2Desc:    { en: "We're not here for one-off jobs. We aim to be your long-term technology partner as your business grows.", bm: 'Kami bukan di sini untuk kerja sekali sahaja. Kami berhasrat menjadi rakan kongsi teknologi jangka panjang anda apabila perniagaan anda berkembang.' },
    aboutVal3Title:   { en: 'Speed With Substance', bm: 'Kelajuan Dengan Kandungan' },
    aboutVal3Desc:    { en: 'We move fast, but never at the expense of quality. Our proposals are ready in 3 days and our work is built to last.', bm: 'Kami bergerak pantas, tetapi tidak pernah mengorbankan kualiti. Cadangan kami siap dalam 3 hari dan kerja kami dibina untuk bertahan.' },
    aboutVal4Title:   { en: 'Proudly Local',   bm: 'Bangga Tempatan' },
    aboutVal4Desc:    { en: 'We understand the Malaysian business landscape — the regulations, the culture, and the unique opportunities here.', bm: 'Kami memahami landskap perniagaan Malaysia — peraturan, budaya, dan peluang unik di sini.' },
    aboutFounderEyebrow:{ en: 'The Founder',  bm: 'Pengasas' },
    aboutFounderTitle:{ en: 'Why I Started Duta Integra', bm: 'Mengapa Saya Menubuhkan Duta Integra' },
    aboutFounderRole: { en: 'Founder & CEO', bm: 'Pengasas & CEO' },
    aboutFounderP1:   { en: "I'm self-taught — developer, entrepreneur, product manager, and business analyst, roughly in that order, since I first got into this world in 2021. Duta Integra exists because I kept running into the same problem: Malaysian SMEs stuck choosing between IT vendors who don't really understand AI, or AI vendors who've never had to keep a helpdesk running at 2am.", bm: 'Saya belajar sendiri — pembangun, usahawan, pengurus produk, dan ahli perniagaan, kira-kira dalam susunan itu, sejak saya pertama kali memasuki dunia ini pada tahun 2021. Duta Integra wujud kerana saya terus menemui masalah yang sama: SME Malaysia terjebak memilih antara vendor IT yang tidak benar-benar memahami AI, atau vendor AI yang tidak pernah perlu mengekalkan helpdesk berjalan pada jam 2 pagi.' },
    aboutFounderP2:   { en: "We're a new company, and I'd rather say that outright than dress it up. What that actually gets you: a current tech stack instead of legacy systems another vendor is stuck maintaining, pricing without years of overhead baked in, and a founder who's still on every account — not handed off to whoever's free.", bm: 'Kami syarikat baru, dan saya lebih suka mengatakannya secara terus daripada menutupnya. Apa yang sebenarnya anda dapat: set teknologi terkini bukannya sistem warisan yang vendor lain terjebak mengekalkan, harga tanpa bertahun-tahun kos overhead, dan pengasas yang masih terlibat dalam setiap akaun — bukan diserahkan kepada sesiapa yang bebas.' },
    aboutCtaTitle:    { en: 'Want to Know More?', bm: 'Mahu Tahu Lebih Lanjut?' },
    aboutCtaDesc:     { en: "We'd love to meet you — whether over a call, a coffee, or a WhatsApp message.", bm: 'Kami ingin bertemu anda — sama ada melalui panggilan, kopi, atau mesej WhatsApp.' },
    aboutCtaBtn1:     { en: 'Get in Touch',  bm: 'Hubungi Kami' },
    aboutCtaBtn2:     { en: 'Explore Services →', bm: 'Terokai Perkhidmatan →' },

    // ---- PRICING PAGE ----
    priceHeroLabel:   { en: 'Pricing',       bm: 'Harga' },
    priceHeroTitle:   { en: 'Transparent Pricing. No Surprises.', bm: 'Harga Telus. Tiada Kejutan.' },
    priceHeroDesc:    { en: 'Flexible plans designed for Malaysian SMEs — whether you need full managed IT, AI development, or both. All prices in MYR.', bm: 'Pelan fleksibel yang direka untuk SME Malaysia — sama ada anda memerlukan IT terurus penuh, pembangunan AI, atau kedua-duanya. Semua harga dalam MYR.' },
    priceManagedEyebrow:{ en: 'Managed IT Plans', bm: 'Pelan IT Terurus' },
    priceManagedTitle:{ en: 'Monthly IT Support Retainers', bm: 'Retainer Sokongan IT Bulanan' },
    priceBadge:       { en: 'Most Popular',  bm: 'Paling Popular' },
    priceGetStarted:  { en: 'Get Started',   bm: 'Mula Sekarang' },
    priceRequestQuote:{ en: 'Request Quote', bm: 'Minta Sebut Harga' },
    priceTier1Name:   { en: 'Starter',       bm: 'Permulaan' },
    priceTier1Tag:    { en: 'For small teams getting started with managed IT', bm: 'Untuk pasukan kecil yang bermula dengan IT terurus' },
    priceTier1F1:     { en: 'Up to 5 users supported', bm: 'Sehingga 5 pengguna disokong' },
    priceTier1F2:     { en: 'Remote helpdesk (business hours)', bm: 'Helpdesk jarak jauh (waktu bekerja)' },
    priceTier1F3:     { en: 'Monthly system health check', bm: 'Semakan kesihatan sistem bulanan' },
    priceTier1F4:     { en: 'Basic antivirus & endpoint protection', bm: 'Antivirus asas & perlindungan titik akhir' },
    priceTier1F5:     { en: 'Email & communication setup', bm: 'Persediaan emel & komunikasi' },
    priceTier1Na1:    { en: 'Network monitoring', bm: 'Pemantauan rangkaian' },
    priceTier1Na2:    { en: '24/7 support',    bm: 'Sokongan 24/7' },
    priceTier1Na3:    { en: 'PDPA compliance review', bm: 'Semakan pematuhan PDPA' },
    priceTier2Name:   { en: 'Business',       bm: 'Perniagaan' },
    priceTier2Tag:    { en: 'Full managed IT for growing SMEs', bm: 'IT terurus penuh untuk SME yang berkembang' },
    priceTier2F1:     { en: 'Up to 20 users supported', bm: 'Sehingga 20 pengguna disokong' },
    priceTier2F2:     { en: 'Remote helpdesk (extended hours)', bm: 'Helpdesk jarak jauh (waktu lanjutan)' },
    priceTier2F3:     { en: '24/7 system monitoring & alerts', bm: 'Pemantauan & amaran sistem 24/7' },
    priceTier2F4:     { en: 'Network setup & management', bm: 'Persediaan & pengurusan rangkaian' },
    priceTier2F5:     { en: 'Cloud backup & disaster recovery', bm: 'Sandaran awan & pemulihan bencana' },
    priceTier2F6:     { en: 'Monthly IT performance reports', bm: 'Laporan prestasi IT bulanan' },
    priceTier2F7:     { en: 'PDPA compliance support', bm: 'Sokongan pematuhan PDPA' },
    priceTier2Na1:    { en: 'Dedicated account manager', bm: 'Pengurus akaun khusus' },
    priceTier3Name:   { en: 'Enterprise',     bm: 'Perusahaan' },
    priceTier3Tag:    { en: 'Full-service IT for larger or complex operations', bm: 'IT perkhidmatan penuh untuk operasi lebih besar atau kompleks' },
    priceTier3Amt:    { en: 'Custom',         bm: 'Tersuai' },
    priceTier3F1:     { en: 'Unlimited users', bm: 'Pengguna tanpa had' },
    priceTier3F2:     { en: '24/7 helpdesk & on-site support', bm: 'Helpdesk 24/7 & sokongan di lokasi' },
    priceTier3F3:     { en: 'Full network & server management', bm: 'Pengurusan rangkaian & pelayan penuh' },
    priceTier3F4:     { en: 'Dedicated account manager', bm: 'Pengurus akaun khusus' },
    priceTier3F5:     { en: 'PDPA & compliance full audit', bm: 'Audit penuh PDPA & pematuhan' },
    priceTier3F6:     { en: 'Custom SLA agreements', bm: 'Perjanjian SLA tersuai' },
    priceTier3F7:     { en: 'Quarterly business IT reviews', bm: 'Semakan IT perniagaan suku tahunan' },
    priceTier3F8:     { en: 'Priority response guaranteed', bm: 'Respons keutamaan dijamin' },
    priceNoteHighlight:{ en: 'All plans include a free initial IT audit', bm: 'Semua pelan termasuk audit IT awal percuma' },
    priceNoteNoLock:  { en: 'Contracts are month-to-month — no lock-in.', bm: 'Kontrak adalah bulan ke bulan — tiada pengikatan.' },
    priceAddonEyebrow:{ en: 'AI Development',  bm: 'Pembangunan AI' },
    priceAddonTitle:  { en: 'AI Project Pricing', bm: 'Harga Projek AI' },
    priceAddonSub:    { en: 'AI projects are quoted per engagement. Below are our typical starting prices.', bm: 'Projek AI diberi sebut harga setiap penglibatan. Di bawah adalah harga permulaan tipikal kami.' },
    priceAddon1Title: { en: 'AI Chatbot',     bm: 'Chatbot AI' },
    priceAddon1Desc:  { en: 'Custom chatbot for your website, WhatsApp, or internal use. Trained on your data.', bm: 'Chatbot tersuai untuk laman web, WhatsApp, atau kegunaan dalaman anda. Dilatih pada data anda.' },
    priceAddon2Title: { en: 'Process Automation', bm: 'Automasi Proses' },
    priceAddon2Desc:  { en: 'Automate repetitive business workflows — data entry, approvals, reporting, and more.', bm: 'Automasi aliran kerja perniagaan berulang — kemasukan data, kelulusan, pelaporan, dan banyak lagi.' },
    priceAddon3Title: { en: 'ML Model Development', bm: 'Pembangunan Model ML' },
    priceAddon3Desc:  { en: 'Custom machine learning models for prediction, classification, or recommendation.', bm: 'Model pembelajaran mesin tersuai untuk ramalan, pengelasan, atau cadangan.' },
    priceAddon4Title: { en: 'AI Integration',  bm: 'Integrasi AI' },
    priceAddon4Desc:  { en: 'Integrate AI tools like ChatGPT, vision APIs, or custom models into your existing systems.', bm: 'Integrasikan alat AI seperti ChatGPT, API visi, atau model tersuai ke dalam sistem sedia ada anda.' },
    priceAddon5Title: { en: 'Cloud Migration', bm: 'Pemindahan Awan' },
    priceAddon5Desc:  { en: 'Full cloud migration project — planning, execution, and post-migration support included.', bm: 'Projek pemindahan awan penuh — perancangan, pelaksanaan, dan sokongan selepas pemindahan termasuk.' },
    priceAddon6Title: { en: 'PDPA Compliance Audit', bm: 'Audit Pematuhan PDPA' },
    priceAddon6Desc:  { en: 'Full audit plus policy documentation and staff training to ensure compliance.', bm: 'Audit penuh ditambah dokumentasi dasar dan latihan kakitangan untuk memastikan pematuhan.' },
    priceCtaTitle:    { en: "Need a Custom Quote?", bm: 'Perlu Sebut Harga Tersuai?' },
    priceCtaDesc:     { en: "Every business is different. Tell us what you need and we'll build a package that fits your budget and goals.", bm: 'Setiap perniagaan berbeza. Beritahu kami apa yang anda perlukan dan kami akan membina pakej yang sesuai dengan bajet dan matlamat anda.' },
    priceCtaBtn1:     { en: 'Request Custom Quote', bm: 'Minta Sebut Harga Tersuai' },
    priceCtaBtn2:     { en: 'Explore Services →', bm: 'Terokai Perkhidmatan →' },

    // ---- CONTACT PAGE ----
    contactHeroLabel: { en: 'Contact Us',    bm: 'Hubungi Kami' },
    contactHeroTitle: { en: "Let's Talk About Your Business", bm: 'Mari Bercakap Tentang Perniagaan Anda' },
    contactHeroDesc:  { en: "Whether you have a specific project in mind or just want to explore what's possible — we'd love to hear from you. No pressure, no commitment.", bm: 'Sama ada anda mempunyai projek tertentu atau hanya ingin meneroka kemungkinan — kami ingin mendengar daripada anda. Tiada tekanan, tiada komitmen.' },
    contactInfoTitle: { en: 'Get in Touch',  bm: 'Hubungi Kami' },
    contactInfoDesc:  { en: "We typically respond within 1 business day. For urgent matters, reach us directly via WhatsApp or phone.", bm: 'Kami biasanya membalas dalam masa 1 hari bekerja. Untuk perkara segera, hubungi kami terus melalui WhatsApp atau telefon.' },
    contactOffice:    { en: 'Office Location', bm: 'Lokasi Pejabat' },
    contactEmail:     { en: 'Email',         bm: 'Emel' },
    contactPhone:     { en: 'Phone / WhatsApp', bm: 'Telefon / WhatsApp' },
    contactHours:     { en: 'Business Hours', bm: 'Waktu Perniagaan' },
    contactHoursVal:  { en: 'Monday – Friday, 9am – 6pm MYT', bm: 'Isnin – Jumaat, 9pagi – 6petang MYT' },
    contactFormTitle: { en: 'Send Us a Message', bm: 'Hantar Mesej Kepada Kami' },
    contactName:      { en: 'Full Name *',   bm: 'Nama Penuh *' },
    contactCompany:   { en: 'Company Name',  bm: 'Nama Syarikat' },
    contactEmailLabel:{ en: 'Email Address *', bm: 'Alamat Emel *' },
    contactPhoneLabel:{ en: 'Phone / WhatsApp', bm: 'Telefon / WhatsApp' },
    contactServiceLabel:{ en: 'What are you interested in? *', bm: 'Apa yang anda berminat? *' },
    contactOptAudit:  { en: 'Free IT Audit', bm: 'Audit IT Percuma' },
    contactOptCustom: { en: 'Custom / Multiple Services', bm: 'Tersuai / Pelbagai Perkhidmatan' },
    contactMessageLabel:{ en: 'Tell us about your business & needs', bm: 'Ceritakan tentang perniagaan dan keperluan anda' },
    contactSubmit:    { en: 'Send Message →', bm: 'Hantar Mesej →' },
    contactToast:     { en: "Message sent! We'll get back to you within 24 hours.", bm: 'Mesej dihantar! Kami akan membalas dalam masa 24 jam.' },

    // ---- FAQ PAGE ----
    faqHeroLabel:     { en: 'FAQ',           bm: 'Soalan Lazim' },
    faqHeroTitle:     { en: 'No Jargon. Just Answers.', bm: 'Tiada Jargon. Hanya Jawapan.' },
    faqHeroDesc:      { en: 'SME owners ask us the same handful of questions. Here they are, with straight answers — no sales pitch, no corporate fluff.', bm: 'Pemilik SME bertanya soalan yang sama kepada kami. Berikut adalah jawapan langsung — tiada pitch jualan, tiada pukulan korporat.' },

    // ---- AUTONOMOUS OPS PAGE ----
    opsHeroLabel:     { en: 'Autonomous Ops', bm: 'Autonomous Ops' },
    opsHeroTitle:     { en: 'Your IT, Run by AI', bm: 'IT Anda, Dijalankan oleh AI' },
    opsHeroDesc:      { en: 'AI monitors your infrastructure 24/7, predicts failures before they happen, and resolves issues automatically — with a human approving every critical action.', bm: 'AI memantau infrastruktur anda 24/7, meramalkan kegagalan sebelum ia berlaku, dan menyelesaikan isu secara automatik — dengan manusia meluluskan setiap tindakan kritikal.' },
    opsSeePricing:    { en: 'See Pricing',   bm: 'Lihat Harga' },
    opsHowItWorks:    { en: 'How It Works →', bm: 'Cara Ia Berfungsi →' },
    opsFeedEyebrow:   { en: 'Live Feed',     bm: 'Suapan Langsung' },
    opsFeedTitle:     { en: "What's happening right now", bm: 'Apa yang sedang berlaku sekarang' },
    opsFeedSub:       { en: 'A real-time aggregate view of AI actions across all managed environments.', bm: 'Pandangan agregat masa nyata tindakan AI merentasi semua persekitaran terurus.' },

    // ---- CASES PAGE ----
    casesHeroTitle:   { en: 'Case Studies',  bm: 'Kajian Kes' },
    casesHeroDesc:    { en: 'Real results from real businesses. See how our managed IT services transform operations for Malaysian SMEs.', bm: 'Keputusan sebenar dari perniagaan sebenar. Lihat bagaimana perkhidmatan IT terurus kami mengubah operasi untuk SME Malaysia.' },
    casesCtaTitle:    { en: 'Ready to transform your IT?', bm: 'Bersedia mengubah IT anda?' },
    casesCtaDesc:     { en: "Start with a free assessment. We'll identify your biggest wins and show you exactly how managed IT can help.", bm: 'Mulakan dengan penilaian percuma. Kami akan mengenal pasti kemenangan terbesar anda dan menunjukkan bagaimana IT terurus boleh membantu.' },
    casesFindTier:    { en: 'Find Your Tier', bm: 'Cari Pelan Anda' },
    casesConsult:     { en: 'Book a Consultation', bm: 'Buat Temujanji' },

    // ---- CALCULATOR PAGE ----
    calcHeroLabel:    { en: 'Savings Calculator', bm: 'Kalkulator Jimat' },
    calcHeroTitle:    { en: 'How Much Can You Save?', bm: 'Berapa Banyak Anda Boleh Jimat?' },
    calcHeroSub:      { en: "Enter your team's manual workload and see the real hours and ringgit saved by each DI tier. No fluff — just the numbers.", bm: 'Masukkan bebanan kerja manual pasukan anda dan lihat jam dan ringgit sebenar yang dijimatkan oleh setiap pelan DI. Tiada pukulan — hanya nombor.' },
    calcTeamSize:     { en: 'Team size',     bm: 'Saiz pasukan' },
    calcHoursWeek:    { en: 'Manual IT/admin hours per week (total across team)', bm: 'Jam IT/admin manual seminggu (jumlah merentasi pasukan)' },
    calcPainTitle:    { en: 'Your biggest pain points (optional — amplifies savings)', bm: 'Titik sakit terbesar anda (pilihan — memperbesar penjimatan)' },
    calcBtn:          { en: 'Calculate Savings', bm: 'Kira Jimat' },

    // ---- STATS PAGE ----
    statsHeroLabel:   { en: 'Built by DI',   bm: 'Dibina oleh DI' },
    statsHeroTitle:   { en: 'Real Results, Real Numbers', bm: 'Keputusan Sebenar, Nombor Sebenar' },
    statsHeroSub:     { en: 'No inflated metrics. No vanity dashboards. These are the actual numbers behind the IT and AI work we do for Malaysian SMEs — updated regularly.', bm: 'Tiada metrik dimbesarkan. Tiada papan pemuka hiasan. Ini adalah nombor sebenar di sebalik kerja IT dan AI yang kami lakukan untuk SME Malaysia — dikemas kini secara berkala.' },
    statsWhyTitle:    { en: 'Why we show this', bm: 'Mengapa kami tunjukkan ini' },
    statsWhyDesc:     { en: 'Malaysian SMEs deserve vendors who prove their value with numbers, not just promises. Every metric above reflects real work done for real clients — no inflated benchmarks.', bm: 'SME Malaysia berhak mendapat vendor yang membuktikan nilai mereka dengan nombor, bukan sekadar janji. Setiap metrik di atas mencerminkan kerja sebenar yang dilakukan untuk pelanggan sebenar — tiada benchmark yang dimbesarkan.' },

    // ---- INSIGHTS PAGE ----
    insightsHeroLabel:{ en: 'Insights',      bm: 'Pandangan' },
    insightsHeroTitle:{ en: 'From the Trenches', bm: 'Dari Medan Perang' },
    insightsHeroSub:  { en: 'Practical IT strategy, AI automation tips, and compliance guidance — learned from real work with Malaysian SMEs.', bm: 'Strategi IT praktikal, tips automasi AI, dan panduan pematuhan — dipelajari dari kerja sebenar dengan SME Malaysia.' },

    // ---- COMMON FOOTER ----
    ftPrivacy:        { en: 'Privacy Policy', bm: 'Dasar Privasi' },
    ftTos:            { en: 'Terms of Service', bm: 'Syarat Perkhidmatan' },
    ftSla:            { en: 'SLA',             bm: 'SLA' },
    ftPdpa:           { en: 'PDPA Check',     bm: 'Semakan PDPA' },
    ftCopyright:      { en: '© 2026 Duta Integra Solutions Sdn Bhd. All rights reserved.', bm: '© 2026 Duta Integra Solutions Sdn Bhd. Semua hak cipta terpelihara.' }
  };

  function applyTranslations() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var entry = T[key];
      if (!entry) continue;
      var val = entry[currentLang] || entry.en;
      if (!val) continue;
      // Handle elements that should have innerHTML (e.g. hero titles with <br> or <span>)
      if (els[i].hasAttribute('data-i18n-html')) {
        els[i].innerHTML = val;
      } else {
        els[i].textContent = val;
      }
    }
    // Update lang toggle button text
    var langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.textContent = currentLang === 'en' ? 'BM' : 'EN';
  }

  function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'bm' : 'en';
    localStorage.setItem('language', currentLang);
    applyTranslations();
  }

  /* ---------- SCROLL REVEAL ---------- */
  function initScrollReveal() {
    // Inject CSS
    var style = document.createElement('style');
    style.textContent = '.reveal{opacity:0;transform:translateY(28px);transition:opacity .55s ease,transform .55s ease}.reveal.visible{opacity:1;transform:translateY(0)}.reveal-delay-1{transition-delay:.1s}.reveal-delay-2{transition-delay:.2s}.reveal-delay-3{transition-delay:.3s}.reveal-delay-4{transition-delay:.4s}';
    document.head.appendChild(style);

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
  }

  /* ---------- INIT ---------- */
  function init() {
    initDarkMode();
    applyTranslations();
    initScrollReveal();
  }

  // Expose to onclick handlers
  window.toggleDarkMode = toggleDarkMode;
  window.toggleLanguage = toggleLanguage;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
