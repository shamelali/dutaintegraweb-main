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
    idxCtaTitle:      { en: 'Ready to Modernise Your Business?', bm: 'Bersedia Memodenkan Perniagaan Anda?' },
    idxCtaDesc:       { en: 'Start with a free IT audit or AI readiness assessment — no obligation, no strings.', bm: 'Mulakan dengan audit IT percuma atau penilaian kesediaan AI — tiada obligasi, tiada syarat.' },
    idxCtaBtn1:       { en: 'Book Free Consultation', bm: 'Buat Temujanji Percuma' },
    idxCtaBtn2:       { en: 'See Pricing',   bm: 'Lihat Harga' },
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
    aboutOwned:       { en: 'Malaysian Owned', bm: 'Milikan Malaysia' },
    aboutBased:       { en: 'Based in Selangor', bm: 'Berpusat di Selangor' },
    aboutValuesEyebrow:{ en: 'What We Believe', bm: 'Apa Yang Kami Percaya' },
    aboutValuesTitle: { en: 'Our Values',    bm: 'Nilai Kami' },
    aboutVal1Title:   { en: 'Client-First',  bm: 'Pelanggan-Pertama' },
    aboutVal1Desc:    { en: 'We measure our success by your business outcomes, not by billable hours.', bm: 'Kami mengukur kejayaan kami berdasarkan hasil perniagaan anda, bukan berdasarkan jam boleh dibilang.' },
    aboutVal2Title:   { en: 'Innovation with Purpose', bm: 'Inovasi Dengan Tujuan' },
    aboutVal2Desc:    { en: 'We only adopt tech that solves real problems — not just trends.', bm: 'Kami hanya mengamalkan teknologi yang menyelesaikan masalah sebenar — bukan sekadar trend.' },
    aboutVal3Title:   { en: 'Long-Term Partnership', bm: 'Perkongsian Jangka Panjang' },
    aboutVal3Desc:    { en: "We're here for the marathon, not the sprint. We stay after delivery.", bm: 'Kami di sini untuk maraton, bukan pecutan. Kami kekal selepas penghantaran.' },
    aboutVal4Title:   { en: 'Local Growth',   bm: 'Pembangunan Tempatan' },
    aboutVal4Desc:    { en: 'We invest in Malaysian talent and help other local businesses succeed.', bm: 'Kami melabur dalam bakat Malaysia dan membantu perniagaan tempatan lain berjaya.' },
    aboutFounderEyebrow:{ en: 'The Founder',  bm: 'Pengasas' },
    aboutFounderTitle:{ en: 'Why I Started Duta Integra', bm: 'Mengapa Saya Menubuhkan Duta Integra' },
    aboutFounderRole: { en: 'Founder & CEO', bm: 'Pengasas & CEO' },
    aboutCtaTitle:    { en: 'Ready to Work Together?', bm: 'Bersedia Bekerja Bersama?' },
    aboutCtaDesc:     { en: "Let's discuss how we can help your business grow with smart technology solutions.", bm: 'Mari berbincang bagaimana kami boleh membantu perniagaan anda berkembang dengan penyelesaian teknologi pintar.' },
    aboutCtaBtn1:     { en: 'Get in Touch',  bm: 'Hubungi Kami' },
    aboutCtaBtn2:     { en: 'Explore Services →', bm: 'Terokai Perkhidmatan →' },

    // ---- PRICING PAGE ----
    priceHeroLabel:   { en: 'Pricing',       bm: 'Harga' },
    priceHeroTitle:   { en: 'Simple, Transparent Pricing', bm: 'Harga Mudah, Telus' },
    priceHeroDesc:    { en: 'No hidden fees. No surprises. Just clear pricing designed for Malaysian SMEs.', bm: 'Tiada yuran tersembunyi. Tiada kejutan. Hanya harga jelas yang direka untuk SME Malaysia.' },
    priceManagedEyebrow:{ en: 'Managed IT Services', bm: 'Perkhidmatan IT Diurus' },
    priceManagedTitle:{ en: 'Monthly Retainer Plans', bm: 'Pelan Retainer Bulanan' },
    priceManagedSub:  { en: 'Flat-rate IT support that scales with your business. No per-incident charges.', bm: 'Sokongan IT kadar rata yang berkembang dengan perniagaan anda. Tiada caj setiap insiden.' },
    priceAddonEyebrow:{ en: 'Optional Add-Ons', bm: 'Tambahan Pilihan' },
    priceAddonTitle:  { en: 'Enhance Your Plan', bm: 'Tingkatkan Pelan Anda' },
    priceNote:        { en: 'All plans include free initial IT audit worth RM2,000. No long-term contracts required.', bm: 'Semua pelan termasuk audit IT awal percuma bernilai RM2,000. Tiada kontrak jangka panjang diperlukan.' },
    priceCtaTitle:    { en: "Not Sure What's Right for You?", bm: 'Tidak Pasti Apa Yang Sesuai Untuk Anda?' },
    priceCtaDesc:     { en: "Book a free 30-minute consultation and we'll recommend the best solution for your needs and budget.", bm: 'Buat temujanji percuma 30 minit dan kami akan mengesyorkan penyelesaian terbaik untuk keperluan dan bajet anda.' },
    priceCtaBtn1:     { en: 'Book Free Consultation', bm: 'Buat Temujanji Percuma' },
    priceCtaBtn2:     { en: 'View Services →', bm: 'Lihat Perkhidmatan →' },

    // ---- CONTACT PAGE ----
    contactHeroLabel: { en: 'Contact Us',    bm: 'Hubungi Kami' },
    contactHeroTitle: { en: "Let's Start a Conversation", bm: 'Mari Mulakan Perbualan' },
    contactHeroDesc:  { en: "Ready to transform your business with AI and IT? We'd love to hear from you.", bm: 'Bersedia untuk mengubah perniagaan anda dengan AI dan IT? Kami ingin mendengar daripada anda.' },
    contactInfoTitle: { en: 'Get in Touch',  bm: 'Hubungi Kami' },
    contactInfoDesc:  { en: "Whether you're ready to start a project or just want to learn more, we're here to help. Fill out the form and we'll get back to you within 24 hours.", bm: 'Sama ada anda bersedia untuk memulakan projek atau hanya ingin mengetahui lebih lanjut, kami di sini untuk membantu. Isi borang dan kami akan membalas dalam masa 24 jam.' },
    contactOffice:    { en: 'Office Location', bm: 'Lokasi Pejabat' },
    contactEmail:     { en: 'Email',         bm: 'Emel' },
    contactPhone:     { en: 'Phone / WhatsApp', bm: 'Telefon / WhatsApp' },
    contactHours:     { en: 'Business Hours', bm: 'Waktu Perniagaan' },
    contactHoursVal:  { en: 'Monday – Friday, 9am – 6pm MYT / Weekend support available for managed IT clients', bm: 'Isnin – Jumaat, 9pagi – 6petang MYT / Sokongan hujung minggu tersedia untuk pelanggan IT terurus' },
    contactFormTitle: { en: 'Send Us a Message', bm: 'Hantar Mesej Kepada Kami' },
    contactName:      { en: 'Full Name *',   bm: 'Nama Penuh *' },
    contactCompany:   { en: 'Company Name',  bm: 'Nama Syarikat' },
    contactEmailLabel:{ en: 'Email Address *', bm: 'Alamat Emel *' },
    contactPhoneLabel:{ en: 'Phone / WhatsApp', bm: 'Telefon / WhatsApp' },
    contactServiceLabel:{ en: 'What are you interested in? *', bm: 'Apa yang anda berminat? *' },
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

  /* ---------- INIT ---------- */
  function init() {
    initDarkMode();
    applyTranslations();
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
