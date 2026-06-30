// Language Translations
const translations = {
  en: {
    navServices: 'Services', navAbout: 'About', navCases: 'Projects', navPricing: 'Pricing', navContact: 'Contact Us',
    heroBadge: "🇲🇾 Malaysia's AI-First IT Partner", heroTitle1: 'Smart Technology.', heroTitle2: 'Integrated Solutions.',
    heroDesc: "We help Malaysian businesses grow with custom AI software and reliable managed IT — from intelligent chatbots to cloud infrastructure, all under one roof.",
    heroBtn1: 'Get a Free IT Audit', heroBtn2: 'Explore Services →',
    stat1: 'Happy Clients', stat2: 'Custom Solutions', stat3: 'Managed IT Support', stat4: 'Malaysian-owned',
    servicesEyebrow: 'What We Do', servicesTitle: 'Two Pillars. One Partner.', servicesSub: 'We combine cutting-edge AI development with rock-solid managed IT — so you never need to juggle multiple vendors again.',
    svc1Title: 'AI Software Development', svc1Desc: 'Custom AI applications, intelligent chatbots, and process automation built specifically for your business workflows.',
    svc2Title: 'Managed IT Services', svc2Desc: 'End-to-end IT management — cloud infrastructure, helpdesk, network security, and hardware maintenance.',
    svc3Title: 'Cloud Migration & Setup', svc3Desc: 'Move your business to the cloud seamlessly with planning, migration, and ongoing cloud management.',
    svc4Title: 'IT Security & Compliance', svc4Desc: 'PDPA compliance audits, cybersecurity monitoring, and data protection policies for your peace of mind.',
    svc5Title: 'Business Intelligence (Launching Next)', svc5Desc: 'Data-driven insights, predictive BI analytics, and intelligent dashboards to help you make smarter business decisions.',
    svcLearnMore: 'Learn more →',
    clientsTitle: 'What we build for the future',
    whyEyebrow: 'Why Choose Us', whyTitle: 'Built for Malaysian SMEs',
    why1Title: 'Local Expertise', why1Desc: 'We understand PDPA, SST, ePerolehan, and the SME landscape. No need to explain Malaysian context to us.',
    why2Title: 'AI + IT Combined', why2Desc: 'One vendor for your AI ambitions and day-to-day IT — simpler, cheaper, and better coordinated.',
    why3Title: 'Transparent Pricing', why3Desc: 'No hidden fees. Clear monthly retainers and project scopes designed for growing businesses.',
    why4Title: 'Fast Onboarding', why4Desc: 'Free initial audit, clear proposal within 3 working days, and on-schedule delivery you can count on.',
    ctaTitle: 'Ready to Modernize Your Business?', ctaDesc: 'Start with a free IT audit or AI readiness assessment — no obligation, no strings attached.', ctaBtn1: 'Book Free Consultation', ctaBtn2: 'View Pricing',
    footerDesc: 'Your trusted AI and IT partner in Malaysia. We help SMEs modernize, automate, and grow through smart technology.',
    footerCompany: 'Company', footerServices: 'Services',
    casesHeroLabel: 'Projects', casesTitle: 'Projects We\'ve Delivered', casesSub: 'Real products we\'ve built for clients across Malaysia. Click through to preview them live.',
    casesSectionEyebrow: 'Our Portfolio', casesSectionTitle: 'Our Projects', casesSectionSub: 'Every project we take on is built from the ground up by our team. Here are some of the products we\'ve developed.'
  },
  bm: {
    navServices: 'Perkhidmatan', navAbout: 'Tentang Kami', navCases: 'Projek', navPricing: 'Harga', navContact: 'Hubungi Kami',
    heroBadge: '🇲🇾 Rakan Kongsia IT Berasaskan AI Malaysia', heroTitle1: 'Teknologi Pintar.', heroTitle2: 'Penyelesaian Bersepadu.',
    heroDesc: 'Kami membantu perniagaan Malaysia berkembang dengan perisian AI tersuai dan perkhidmatan IT yang boleh dipercayai — dari chatbot pintar hingga infrastruktur awan, semuanya di bawah satu bumbung.',
    heroBtn1: 'Dapatkan Audit IT Percuma', heroBtn2: 'Terokai Perkhidmatan →',
    stat1: 'Pelanggan Gembira', stat2: 'Penyelesaian Tersuai', stat3: 'Sokongan IT 24/7', stat4: 'Dimiliki Malaysia',
    servicesEyebrow: 'Apa Yang Kami Lakukan', servicesTitle: 'Dua Tunggak. Satu Rakan Kongsi.', servicesSub: 'Kami menggabungkan pembangunan AI terkini dengan perkhidmatan IT yang mantap — jadi anda tidak perlu berurusan dengan pelbagai vendor lagi.',
    svc1Title: 'Pembangunan Perisian AI', svc1Desc: 'Aplikasi AI tersuai, chatbot pintar, dan automasi proses yang dibina khusus untuk aliran kerja perniagaan anda.',
    svc2Title: 'Perkhidmatan IT Terurus', svc2Desc: 'Pengurusan IT menyeluruh — infrastruktur awan, meja bantuan, keselamatan rangkaian, dan penyelenggaraan perkakasan.',
    svc3Title: 'Migrasi & Persediaan Awan', svc3Desc: 'Pindahkan perniagaan anda ke awan dengan lancar melalui perancangan, migrasi, dan pengurusan awan berterusan.',
    svc4Title: 'Keselamatan & Pematuhan IT', svc4Desc: 'Audit pematuhan PDPA, pemantauan keselamatan siber, dan dasar perlindungan data untuk ketenangan fikiran anda.',
    svc5Title: 'Perniagaan Pintar (Akan Datang)', svc5Desc: 'Wawasan berasaskan data, analitik BI ramalan, dan papan pemuka pintar untuk membantu anda membuat keputusan perniagaan yang lebih bijak.',
    svcLearnMore: 'Ketahui Lebih Lanjut →',
    clientsTitle: 'Apa yang kami bina untuk masa depan',
    whyEyebrow: 'Mengapa Pilih Kami', whyTitle: 'Dibina untuk SME Malaysia',
    why1Title: 'Pakar Tempatan', why1Desc: 'Kami memahami PDPA, SST, ePerolehan, dan landskap SME. Tidak perlu menjelaskan konteks Malaysia kepada kami.',
    why2Title: 'AI + IT Digabungkan', why2Desc: 'Satu vendor untuk keperluan AI dan IT harian anda — lebih mudah, lebih murah, dan lebih terselaras.',
    why3Title: 'Harga Telus', why3Desc: 'Tiada bayaran tersembunyi. Pakej bulanan yang jelas dan skop projek yang direka untuk perniagaan yang berkembang.',
    why4Title: 'Pemasangan Pantas', why4Desc: 'Audit awal percuma, cadangan jelas dalam 3 hari bekerja, dan penghantaran mengikut jadual yang anda boleh harapkan.',
    ctaTitle: 'Bersedia Memodenkan Perniagaan Anda?', ctaDesc: 'Mulakan dengan audit IT percuma atau penilaian kesediaan AI — tanpa obligasi, tanpa komitmen.', ctaBtn1: 'Tempah Perundingan Percuma', ctaBtn2: 'Lihat Harga',
    footerDesc: 'Rakan kongsi AI dan IT anda yang dipercayai di Malaysia. Kami membantu SME memodenkan, mengautomasi, dan berkembang melalui teknologi pintar.',
    footerCompany: 'Syarikat', footerServices: 'Perkhidmatan',
    // Services - Process section
    processEyebrow: 'Bagaimana Kami Beroperasi', processTitle: 'Proses Kami', processSub: 'Mudah, telus, dan direka mengikut keperluan anda.',
    step1Title: 'Audit Percuma', step1Desc: 'Kami menilai persediaan IT atau AI anda — tanpa obligasi, tanpa tekanan jualan.',
    step2Title: 'Cadangan', step2Desc: 'Anda mendapat cadangan yang jelas dengan skop, jadual, dan harga tetap dalam 3 hari bekerja.',
    step3Title: 'Pelaksanaan', step3Desc: 'Pasukan kami melaksanakan projek dengan semakan mingguan dan ketelusan penuh.',
    step4Title: 'Sokongan', step4Desc: 'Kami tidak hilang selepas penghantaran — sokongan berterusan adalah sebahagian daripada pakej.',
    // Services - 2nd CTA
    cta2Title: 'Tidak Pasti Perkhidmatan Mana Yang Anda Perlukan?', cta2Desc: 'Tempah perundingan 30 minit percuma dan kami akan mengesyorkan penyelesaian yang tepat untuk perniagaan anda.', cta2Btn1: 'Tempah Perundingan Percuma', cta2Btn2: 'Lihat Harga →',
    // About
    aboutHeroLabel: 'Tentang Kami', aboutTitle: 'Teknologi Dengan Hati Malaysia', aboutSub: 'Kami memulakan Duta Integra Solutions kerana SME Malaysia layak mendapat teknologi kelas dunia tanpa label harga antarabangsa.',
    aboutStoryTitle: 'Kisah Kami', aboutStoryP1: 'Duta Integra Solutions dilahirkan di Cyberjaya pada 2026 dengan misi yang mudah: menjadikan AI dan IT peringkat perusahaan boleh diakses oleh setiap perniagaan Malaysia.',
    aboutStoryP2: 'Kami perasan bahawa SME di seluruh Malaysia ketinggalan kerana tidak dapat mencari rakan teknologi tempatan yang dipercayai.',
    aboutStoryP3: 'Kami membina rakan kongsi itu. Satu yang bercakap bahasa anda, faham PDPA dan pematuhan tempatan, bergerak dengan pantas, dan berdiri di belakang kerja mereka lama selepas projek siap.',
    aboutStoryP4: 'Hari ini, kami berkhidmat dengan pelanggan dari pelbagai industri dan berbangga menjadi perusahaan milik 100% Malaysia.',
    aboutBtn: 'Berkhidmat Dengan Kami',
    aboutStat1: '2026', aboutStat1Lbl: 'Ditubuhkan di Cyberjaya', aboutStat2: '2+', aboutStat2Lbl: 'Pelanggan Dilayani', aboutStat3: '100%', aboutStat3Lbl: 'Milik Malaysia', aboutStat4: 'AI + IT', aboutStat4Lbl: 'Kepakaran Berganda',
    valuesEyebrow: 'Apa yang Kami percaya', valuesTitle: 'Nilai-Nilai Kami',
    val1Title: 'Ketelusan Atas Jargon', val1Desc: 'Kami jelaskan semua dalam bahasa biasa. Tiada tech-speak, tiada kekeliruan.',
    val2Title: 'Rakan Kongsi, Bukan Sekadar Transaksi', val2Desc: 'Kami bukan untuk kerja sekali. Kami berhasrat menjadi rakan teknologi jangka panjang.',
    val3Title: 'Kelajuan Dengan Substans', val3Desc: 'Kami bergerak pantas, tapi tidak sekali mengorbankan kualiti.',
    val4Title: 'Bangga Tempatan', val4Desc: 'Kami faham landskap perniagaan Malaysia — peraturan, budaya, dan peluang unik di sini.',
    teamEyebrow: 'Pasukan', teamTitle: 'Orang-Orang Di Sebalik Duta Integra',
    // Cases
    casesHeroLabel: 'Projek', casesTitle: 'Projek Yang Telah Kami Sampaikan', casesSub: 'Produk sebenar yang kami bina. Klik untuk pratonton secara langsung.',
    casesSectionEyebrow: 'Portfolio Kami', casesSectionTitle: 'Projek Kami', casesSectionSub: 'Setiap projek dibina dari awal oleh pasukan kami. Berikut adalah beberapa produk yang telah kami bangunkan.',
    cta3Title: 'Ingin Menjadi Kisah Kejayaan seterusnya?', cta3Desc: 'Sama ada anda perlukan AI, sokongan IT, atau migrasi awan — mari bincangkan apa yang boleh dilakukan untuk perniagaan anda.', cta3Btn1: 'Tempah Perundingan Percuma', cta3Btn2: 'Lihat Harga →',
    // Pricing
    pricingHeroLabel: 'Harga', pricingTitle: 'Harga Telus. Tiada Kejutan.', pricingSub: 'Pelan fleksibel untuk SME Malaysia — sama ada anda perlukan IT terurus penuh, pembangunan AI, atau kedua-duanya. Semua harga dalam MYR.',
    pricingEyebrow: 'Pelan IT Terurus', pricingTitle2: 'Retainer Sokongan IT Bulanan',
    starterTitle: 'Starter', starterTagline: 'Untuk pasukan kecil yang bermula dengan IT terurus', starterAmt: 'RM 799',
    businessTitle: 'Business', businessTagline: 'IT terurus penuh untuk SME yang berkembang', businessAmt: 'RM 1,899',
    enterpriseTitle: 'Enterprise', enterpriseTagline: 'IT perkhidmatan penuh untuk operasi yang lebih besar', enterpriseAmt: 'Custom',
    pricingNote: 'Semua pelan termasuk <span>audit IT awal percuma</span>. Kontrak adalah bulanan — tiada kuncian.',
    addonsEyebrow: 'Pembangunan AI', addonsTitle: 'Harga Projek AI', addonsSub: 'Projek AI disebut setiap cadangan. Di bawah adalah harga permulaan biasa kami.',
    addon1T: 'Chatbot AI', addon1P: 'Dari RM 3,500', addon1D: 'Chatbot tersuai untuk tapak web, WhatsApp, atau penggunaan dalaman. Dilatih pada data anda.',
    addon2T: 'Automasi Proses', addon2P: 'Dari RM 5,000', addon2D: 'Automasi aliran kerja perniagaan berulang — masukkan data, kelulusan, pelaporan, dan banyak lagi.',
    addon3T: 'Pembangunan Model ML', addon3P: 'Dari RM 8,000', addon3D: 'Model pembelajaran mesin tersuai untuk ramalan, klasifikasi, atau cadangan.',
    addon4T: 'Integrasi AI', addon4P: 'Dari RM 2,500', addon4D: 'Integrasi alat AI seperti ChatGPT, API penglihatan, atau model tersuai ke dalam sistem sedia ada anda.',
    addon5T: 'Migrasi Awan', addon5P: 'Dari RM 4,000', addon5D: 'Projek migrasi awan penuh — perancangan, pelaksanaan, dan sokongan selepas migrasi.',
    addon6T: 'Audit Pematuhan PDPA', addon6P: 'Dari RM 1,800', addon6D: 'Audit penuh plus dokumentasi dasar dan latihan kakitangan untuk memastikan pematuhan.',
    cta4Title: 'Perlu Sebut Harga Tersuai?', cta4Desc: 'Setiap perniagaan berbeza. Beritahu kami apa yang anda perlukan dan kami akan membina pakej yang sesuai.', cta4Btn1: 'Minta Sebut Harga Tersuai', cta4Btn2: 'Terokai Perkhidmatan →',
    // Contact
    contactHeroLabel: 'Hubungi Kami', contactTitle: 'Mari Bincangkan Perniagaan Anda', contactSub: 'Sama ada anda mempunyai projek tertentu dalam fikiran atau hanya ingin meneroka apa yang mungkin — kami ingin mendengar daripada anda. Tiada tekanan, tiada komitmen.',
    contactInfoTitle: 'Hubungi Kami', contactInfoDesc: 'Kami biasanya bertindak balas dalam 1 hari bekerja. Untuk perkara segera, hubungi kami melalui WhatsApp atau telefon.',
    contactLocation: 'Lokasi Pejabat', contactLocationDesc: 'Cyberjaya, Malaysia',
    contactEmail: 'E-mel', contactEmailDesc: 'hello@dutaintegra.my',
    contactPhone: 'Telefon / WhatsApp', contactPhoneDesc: '+60 11-5403 4051',
    contactHours: 'Waktu Perniagaan', contactHoursDesc: 'Isnin – Jumaat, 9 pagi – 6 petang MYT<br>Sokongan hujung minggu tersedia untuk pelanggan IT terurus',
    contactFormTitle: 'Hantar Mesej Kepada Kami',
    cta5Title: 'Ingin Bincangkan Lebih Lanjut?', cta5Desc: 'Terus hubungi kami untuk soalans tentang perkhidmatan, harga, atau apa-apa yang anda ingin tahu.', cta5Btn1: 'Hubungi Kami', cta5Btn2: 'Terokai Perkhidmatan →'
  }
};

let currentLang = 'en';

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'bm' : 'en';
  localStorage.setItem('language', currentLang);
  document.getElementById('langToggle').textContent = currentLang.toUpperCase();
  applyTranslations();
}

function applyTranslations() {
  const t = translations[currentLang];
  // Nav
  document.querySelectorAll('.nav-links a')[0].textContent = t.navServices;
  document.querySelectorAll('.nav-links a')[1].textContent = t.navAbout;
  document.querySelectorAll('.nav-links a')[2].textContent = t.navCases;
  document.querySelectorAll('.nav-links a')[3].textContent = t.navPricing;
  document.querySelectorAll('.nav-links a')[4].textContent = t.navContact;
  // Hero
  document.querySelector('.hero-badge').textContent = t.heroBadge;
  document.querySelector('.hero h1').innerHTML = t.heroTitle1 + '<br><span>' + t.heroTitle2 + '</span>';
  document.querySelector('.hero p').textContent = t.heroDesc;
  document.querySelector('.btn-primary').textContent = t.heroBtn1;
  document.querySelector('.btn-outline').textContent = t.heroBtn2;
  // Stats
  const stats = document.querySelectorAll('.stat-label');
  if(stats[0]) stats[0].textContent = t.stat1;
  if(stats[1]) stats[1].textContent = t.stat2;
  if(stats[2]) stats[2].textContent = t.stat3;
  if(stats[3]) stats[3].textContent = t.stat4;
  // Services
  document.querySelector('.services-home .section-eyebrow').textContent = t.servicesEyebrow;
  document.querySelector('.services-home .section-title').textContent = t.servicesTitle;
  document.querySelector('.services-home .section-sub').textContent = t.servicesSub;
  // Service Cards
  const svcCards = document.querySelectorAll('.svc-card');
  if(svcCards[0]) { svcCards[0].querySelector('h3').textContent = t.svc1Title; svcCards[0].querySelector('p').textContent = t.svc1Desc; svcCards[0].querySelector('.svc-link').textContent = t.svcLearnMore; }
  if(svcCards[1]) { svcCards[1].querySelector('h3').textContent = t.svc2Title; svcCards[1].querySelector('p').textContent = t.svc2Desc; svcCards[1].querySelector('.svc-link').textContent = t.svcLearnMore; }
  if(svcCards[2]) { svcCards[2].querySelector('h3').textContent = t.svc3Title; svcCards[2].querySelector('p').textContent = t.svc3Desc; svcCards[2].querySelector('.svc-link').textContent = t.svcLearnMore; }
  if(svcCards[3]) { svcCards[3].querySelector('h3').textContent = t.svc4Title; svcCards[3].querySelector('p').textContent = t.svc4Desc; svcCards[3].querySelector('.svc-link').textContent = t.svcLearnMore; }
  if(svcCards[4]) { svcCards[4].querySelector('h3').textContent = t.svc5Title; svcCards[4].querySelector('p').textContent = t.svc5Desc; svcCards[4].querySelector('.svc-link').textContent = t.svcLearnMore; }
  // Clients
  document.querySelector('.clients-strip p').textContent = t.clientsTitle;
  // Why
  document.querySelector('.why .section-eyebrow').textContent = t.whyEyebrow;
  document.querySelector('.why .section-title').textContent = t.whyTitle;
  const whyCards = document.querySelectorAll('.why-card');
  if(whyCards[0]) { whyCards[0].querySelector('h4').textContent = t.why1Title; whyCards[0].querySelector('p').textContent = t.why1Desc; }
  if(whyCards[1]) { whyCards[1].querySelector('h4').textContent = t.why2Title; whyCards[1].querySelector('p').textContent = t.why2Desc; }
  if(whyCards[2]) { whyCards[2].querySelector('h4').textContent = t.why3Title; whyCards[2].querySelector('p').textContent = t.why3Desc; }
  if(whyCards[3]) { whyCards[3].querySelector('h4').textContent = t.why4Title; whyCards[3].querySelector('p').textContent = t.why4Desc; }
  // CTA
  const ctaBand = document.querySelector('.cta-band');
  if(ctaBand) { ctaBand.querySelector('h2').textContent = t.ctaTitle; ctaBand.querySelector('p').textContent = t.ctaDesc; ctaBand.querySelector('.btn-navy').textContent = t.ctaBtn1; ctaBand.querySelector('.btn-primary:last-of-type').textContent = t.ctaBtn2; }
  // Footer
  document.querySelector('.footer-brand p').textContent = t.footerDesc;
  document.querySelectorAll('.footer-col h5')[0].textContent = t.footerCompany;
  document.querySelectorAll('.footer-col h5')[1].textContent = t.footerServices;
  // Cases
  const casesPage = document.querySelector('#page-cases');
  if(casesPage) {
    const hl = casesPage.querySelector('.page-hero-label');
    if(hl) hl.textContent = t.casesHeroLabel;
    const h1 = casesPage.querySelector('.page-hero h1');
    if(h1) h1.textContent = t.casesTitle;
    const hp = casesPage.querySelector('.page-hero p');
    if(hp) hp.textContent = t.casesSub;
    const se = casesPage.querySelector('.cases-grid .section-eyebrow');
    if(se) se.textContent = t.casesSectionEyebrow;
    const st = casesPage.querySelector('.cases-grid .section-title');
    if(st) st.textContent = t.casesSectionTitle;
    const ss = casesPage.querySelector('.cases-grid .section-sub');
    if(ss) ss.textContent = t.casesSectionSub;
  }
}

// Apply translations on page load if saved
if (localStorage.getItem('language') === 'bm') {
  currentLang = 'bm';
  if (document.getElementById('langToggle')) {
    document.getElementById('langToggle').textContent = 'BM';
    applyTranslations();
  }
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  document.getElementById('darkToggle').innerHTML = isDark ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
  updateLogos(isDark);
}

function updateLogos(isDark) {
  document.querySelectorAll('.logo img, .footer .logo img').forEach(img => {
    img.src = 'assets/Dislogo.png';
  });
}

// Dark mode defaults to enabled. If user explicitly chose light, stay light.
if (localStorage.getItem('darkMode') === 'disabled') {
  document.body.classList.remove('dark-mode');
  if (document.getElementById('darkToggle')) {
    document.getElementById('darkToggle').innerHTML = '<i class="ti ti-moon"></i>';
  }
  updateLogos(false);
} else {
  document.body.classList.add('dark-mode');
  if (document.getElementById('darkToggle')) {
    document.getElementById('darkToggle').innerHTML = '<i class="ti ti-sun"></i>';
  }
  updateLogos(true);
}

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function submitForm() {
  const name = document.getElementById('contact-name').value.trim();
  const company = document.getElementById('contact-company').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const service = document.getElementById('contact-service').value;
  const message = document.getElementById('contact-message').value.trim();
  const submitBtn = document.getElementById('contact-submit');

  if (!name || !email || !service) {
    alert('Please fill in all required fields (Name, Email, Service).');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, company, email, phone, service, message })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
      document.getElementById('contact-name').value = '';
      document.getElementById('contact-company').value = '';
      document.getElementById('contact-email').value = '';
      document.getElementById('contact-phone').value = '';
      document.getElementById('contact-service').value = '';
      document.getElementById('contact-message').value = '';
    } else {
      alert('Failed to send message: ' + (data.error || 'Please try again later.'));
    }
  })
  .catch(() => {
    alert('Network error. Please check your connection and try again.');
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message →';
  });
}
// === NETWORK BACKGROUND ANIMATION ===
const bgCanvas=document.getElementById('network-bg'),bgCtx=bgCanvas.getContext('2d')
let bgW,bgH
function bgResize(){bgW=bgCanvas.width=window.innerWidth;bgH=bgCanvas.height=window.innerHeight}
bgResize()
window.addEventListener('resize',bgResize)
const BPR=Math.min(window.devicePixelRatio||1,2)
bgCanvas.width=bgW*BPR;bgCanvas.height=bgH*BPR;bgCtx.scale(BPR,BPR)
const BN=100,BED=280,BF=950;let bt=0,bf=0
const br=(a,b)=>Math.random()*(b-a)+a,bl=(a,b,t)=>a+(b-a)*t,bc=(v,m,M)=>Math.max(m,Math.min(M,v))
const bnodes=[]
for(let i=0;i<BN;i++){const t=br(0,Math.PI*2),p=br(-Math.PI/2,Math.PI/2),r=br(250,750);bnodes.push({bx:r*Math.cos(t)*Math.cos(p),by:r*Math.sin(p),bz:r*Math.sin(t)*Math.cos(p),dx:0,dy:0,dz:0,vx:br(-.06,.06),vy:br(-.06,.06),vz:br(-.06,.06),pulse:br(0,Math.PI*2)})}
for(const n of bnodes){n.dx=n.bx;n.dy=n.by;n.dz=n.bz}
let bedges=[]
function bbuild(){const e=[];for(let i=0;i<bnodes.length;i++)for(let j=i+1;j<bnodes.length;j++){const d=Math.hypot(bnodes[i].dx-bnodes[j].dx,bnodes[i].dy-bnodes[j].dy,bnodes[i].dz-bnodes[j].dz);if(d<BED)e.push({a:i,b:j})};bedges=e}
bbuild()
const bsignals=[];for(let i=0;i<Math.floor(bedges.length*.6);i++)bsignals.push({ei:i%bedges.length,progress:br(-.3,1),speed:br(.004,.018),size:br(1.5,3.5)})
const bflares=[];for(let i=0;i<30;i++)bflares.push({x:br(0,bgW),y:br(0,bgH),vx:br(-.5,.5),vy:br(-.5,.5),life:br(0,1),maxLife:br(80,220),size:br(1,2.5)})
const bbursts=[];function badd(x,y,s){bbursts.push({x,y,life:0,maxLife:28,size:s})}
function brotY(x,z,a){const c=Math.cos(a),s=Math.sin(a);return{x:x*c+z*s,z:-x*s+z*c}}
function bproj(x,y,z){const s=BF/(BF+z);return{x:x*s+bgW/2,y:y*s+bgH/2,s,z}}
function bglow(x,y,r,g,b,rad,a){a=bc(a,0,1);const gd=bgCtx.createRadialGradient(x,y,0,x,y,rad);gd.addColorStop(0,`rgba(${r},${g},${b},${a})`);gd.addColorStop(.25,`rgba(${r},${g},${b},${a*.5})`);gd.addColorStop(1,`rgba(${r},${g},${b},0)`);bgCtx.fillStyle=gd;bgCtx.beginPath();bgCtx.arc(x,y,rad,0,Math.PI*2);bgCtx.fill()}
function bdf(z){return bc((z+700)/2400,0,1)}
function bloop(){bf++;bt+=.016;const rA=bt*.10
for(const n of bnodes){n.dx+=n.vx;n.dy+=n.vy;n.dz+=n.vz;n.pulse+=.025;if(Math.abs(n.dx-n.bx)>350){n.vx*=-1;n.dx=n.bx+Math.sign(n.dx-n.bx)*350}if(Math.abs(n.dy-n.by)>250){n.vy*=-1;n.dy=n.by+Math.sign(n.dy-n.by)*250}if(Math.abs(n.dz-n.bz)>350){n.vz*=-1;n.dz=n.bz+Math.sign(n.dz-n.bz)*350}}
if(bf%60===0)bbuild()
for(const s of bsignals){s.progress+=s.speed;if(s.progress>1.2){if(bedges[s.ei]){const nb=bnodes[bedges[s.ei].b],rr=brotY(nb.dx,nb.dz,rA),pp=bproj(rr.x,nb.dy,rr.z);badd(pp.x,pp.y,s.size*2.5)}s.progress=br(-.4,-.05);s.speed=br(.004,.018);s.ei=Math.floor(Math.random()*bedges.length)}}
for(const f of bflares){f.x+=f.vx;f.y+=f.vy;f.life++;if(f.life>f.maxLife||f.x<-80||f.x>bgW+80||f.y<-80||f.y>bgH+80){f.x=br(-30,bgW+30);f.y=br(-30,bgH+30);f.vx=br(-.7,.7);f.vy=br(-.7,.7);f.life=0;f.maxLife=br(80,220)}}
for(let i=bbursts.length-1;i>=0;i--){bbursts[i].life++;if(bbursts[i].life>bbursts[i].maxLife)bbursts.splice(i,1)}
bgCtx.clearRect(0,0,bgW,bgH)
const vg=bgCtx.createRadialGradient(bgW/2,bgH/2,bgH*.3,bgW/2,bgH/2,bgH*.9);vg.addColorStop(0,'rgba(5,10,20,0)');vg.addColorStop(1,'rgba(5,10,20,.6)');bgCtx.fillStyle=vg;bgCtx.fillRect(0,0,bgW,bgH)
const tg=bgCtx.createRadialGradient(bgW/2,0,0,bgW/2,0,bgH*.6);tg.addColorStop(0,'rgba(0,100,200,.03)');tg.addColorStop(1,'rgba(0,100,200,0)');bgCtx.fillStyle=tg;bgCtx.fillRect(0,0,bgW,bgH)
const pc=new Map()
function gp(i){if(pc.has(i))return pc.get(i);const n=bnodes[i],rr=brotY(n.dx,n.dz,rA),pp=bproj(rr.x,n.dy,rr.z);pc.set(i,pp);return pp}
bgCtx.lineCap='round'
for(const e of bedges){const p1=gp(e.a),p2=gp(e.b),da=bdf((p1.z+p2.z)/2),dd=Math.hypot(p2.x-p1.x,p2.y-p1.y);if(dd<8||da<.02)continue;const a=da*.14;bgCtx.strokeStyle=`rgba(0,160,255,${a*.5})`;bgCtx.lineWidth=3;bgCtx.beginPath();bgCtx.moveTo(p1.x,p1.y);bgCtx.lineTo(p2.x,p2.y);bgCtx.stroke();bgCtx.strokeStyle=`rgba(60,195,255,${a*.6})`;bgCtx.lineWidth=.7;bgCtx.beginPath();bgCtx.moveTo(p1.x,p1.y);bgCtx.lineTo(p2.x,p2.y);bgCtx.stroke()}
for(const s of bsignals){const e=bedges[s.ei];if(!e)continue;const p1=gp(e.a),p2=gp(e.b),dd=Math.hypot(p2.x-p1.x,p2.y-p1.y);if(dd<8)continue;const t=bc(s.progress,0,1),x=bl(p1.x,p2.x,t),y=bl(p1.y,p2.y,t),az=(p1.z+p2.z)/2,da=bdf(az);if(da<.02)continue;const ang=Math.atan2(p2.y-p1.y,p2.x-p1.x),tl=Math.min(dd*.1,32);for(let i=1;i<=7;i++){const ft=i/7;bglow(x-Math.cos(ang)*tl*ft,y-Math.sin(ang)*tl*ft,0,180,255,12-ft*7,da*.3*(1-ft))};bglow(x,y,0,180,255,22*s.size,da*.35);bglow(x,y,100,225,255,9*s.size,da*.55);bgCtx.shadowColor=`rgba(0,180,255,${da*.25})`;bgCtx.shadowBlur=15;bgCtx.fillStyle=`rgba(200,240,255,${da*.9})`;bgCtx.beginPath();bgCtx.arc(x,y,2*s.size,0,Math.PI*2);bgCtx.fill();bgCtx.shadowBlur=0}
for(const b of bbursts){const t=b.life/b.maxLife,a=(1-t)*.7;bglow(b.x,b.y,0,180,255,5+t*35,a);bglow(b.x,b.y,100,220,255,2+t*10,a*.5)}
for(const f of bflares){const a=.5*(1-f.life/f.maxLife);bglow(f.x,f.y,0,180,255,14,a*.12);bglow(f.x,f.y,100,212,255,5,a*.18);bgCtx.fillStyle=`rgba(200,240,255,${a*.45})`;bgCtx.beginPath();bgCtx.arc(f.x,f.y,f.size,0,Math.PI*2);bgCtx.fill()}
const border=bnodes.map((n,i)=>i).sort((a,b)=>gp(a).z-gp(b).z)
for(const i of border){const n=bnodes[i],p=gp(i),da=bdf(p.z);if(da<.02)continue;const pulse=.6+.4*Math.sin(n.pulse+bt*.5),r=2.2*p.s*pulse;bglow(p.x,p.y,0,180,255,18*p.s,da*.10);bgCtx.shadowColor=`rgba(0,180,255,${da*.12})`;bgCtx.shadowBlur=12;bgCtx.fillStyle=`rgba(0,180,255,${da*.4})`;bgCtx.beginPath();bgCtx.arc(p.x,p.y,r*.45,0,Math.PI*2);bgCtx.fill();bgCtx.shadowBlur=0;bgCtx.fillStyle=`rgba(180,235,255,${da*.6})`;bgCtx.beginPath();bgCtx.arc(p.x,p.y,r*.12,0,Math.PI*2);bgCtx.fill()}
requestAnimationFrame(bloop)}
bloop()
