// Language Translations
const translations = {
  en: {
    navServices: 'Services', navAbout: 'About', navCases: 'Projects', navPricing: 'Pricing', navContact: 'Contact Us',
    heroBadge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA", heroTitle1: 'Enterprise-grade AI systems and managed IT, built for ', heroTitle2: 'Malaysian SMEs',
    heroDesc: "Custom AI apps, chatbots, automation, and secure cloud infrastructure — delivered by a Cyberjaya-based team, since 2025.",
    heroBtn1: 'Book a discovery call', heroBtn2: 'View our work',
    stat1: 'Happy Clients', stat2: 'Custom Solutions', stat3: 'Managed IT Support', stat4: 'Malaysian-owned',
    servicesEyebrow: 'Service Tiers', servicesTitle: 'Three Tiers. One Partner.', servicesSub: 'From managed IT to full AI partnership — pick the tier that matches where your business is today, and grow into the next one as you scale.',
    svc1Title: 'AI Software Dev', svc1Desc: 'Custom apps, chatbots, agent workflows',
    svc2Title: 'Managed IT', svc2Desc: 'Cloud infra, helpdesk, security, PDPA',
    svc3Title: 'Sales Automation', svc3Desc: 'CRM pipelines and outreach systems',
    svc4Title: 'Content & Ads', svc4Desc: 'Content engine and paid media management',
    svcLearnMore: 'Learn more →',
    clientsTitle: 'What we build for the future',
    trustStrip: 'Trusted by Lapango, Eastelpro, AGMX and growing SME clients across Malaysia',
    trustLink: 'See client outcomes →',
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
    heroBadge: 'AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA', heroTitle1: 'Sistem AI dan IT terurus peringkat perusahaan, dibina untuk ', heroTitle2: 'SME Malaysia',
    heroDesc: 'Aplikasi AI tersuai, chatbot, automasi, dan infrastruktur awan yang selamat — disampaikan oleh pasukan Cyberjaya, sejak 2026.',
    heroBtn1: 'Buat janji temu', heroBtn2: 'Lihat kerja kami',
    stat1: 'Pelanggan Gembira', stat2: 'Penyelesaian Tersuai', stat3: 'Sokongan IT 24/7', stat4: 'Dimiliki Malaysia',
    servicesEyebrow: 'Tahap Perkhidmatan', servicesTitle: 'Tiga Tahap. Satu Rakan Kongsi.', servicesSub: 'Dari IT terurus kepada perkongsian AI penuh — pilih tahap yang sesuai dengan perniagaan anda hari ini, dan kembangkan bersama kami.',
    svc1Title: 'Pembangunan Perisian AI', svc1Desc: 'Aplikasi tersuai, chatbot, aliran kerja agen',
    svc2Title: 'IT Terurus', svc2Desc: 'Infrastruktur awan, helpdesk, keselamatan, PDPA',
    svc3Title: 'Automasi Jualan', svc3Desc: 'Saluran CRM dan sistem outreach',
    svc4Title: 'Kandungan & Iklan', svc4Desc: 'Enjin kandungan dan pengurusan media berbayar',
    svcLearnMore: 'Ketahui Lebih Lanjut →',
    clientsTitle: 'Apa yang kami bina untuk masa depan',
    trustStrip: 'Dipercayai oleh Lapango, Eastelpro, AGMX dan SME yang berkembang di seluruh Malaysia',
    trustLink: 'Lihat hasil pelanggan →',
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
  const activePage = document.querySelector('.page.active');
  const isHome = !activePage || activePage.id === 'page-home';

  // Nav (present on all pages)
  const navLinks = document.querySelectorAll('.nav-links a');
  if(navLinks[0]) navLinks[0].textContent = t.navServices;
  if(navLinks[1]) navLinks[1].textContent = t.navAbout;
  if(navLinks[2]) navLinks[2].textContent = t.navCases;
  if(navLinks[3]) navLinks[3].textContent = t.navPricing;
  if(navLinks[4]) navLinks[4].textContent = t.navContact;

  // Hero (home page only)
  if(isHome) {
    const heroBadge = document.querySelector('.hero-badge');
    if(heroBadge) heroBadge.textContent = t.heroBadge;
    const heroH1 = document.querySelector('.hero h1');
    if(heroH1) heroH1.innerHTML = t.heroTitle1 + '<span>' + t.heroTitle2 + '</span>';
    const heroP = document.querySelector('.hero p');
    if(heroP) heroP.textContent = t.heroDesc;
    const btnGold = document.querySelector('.btn-gold');
    if(btnGold) btnGold.textContent = t.heroBtn1;
    const btnOutline = document.querySelector('.btn-outline');
    if(btnOutline) btnOutline.textContent = t.heroBtn2;
  }

  // Stats (present on all pages)
  const stats = document.querySelectorAll('.stat-label');
  if(stats[0]) stats[0].textContent = t.stat1;
  if(stats[1]) stats[1].textContent = t.stat2;
  if(stats[2]) stats[2].textContent = t.stat3;
  if(stats[3]) stats[3].textContent = t.stat4;

  // Service Cards (present on all pages)
  const svcCards = document.querySelectorAll('.svc-concept-card');
  if(svcCards[0]) { svcCards[0].querySelector('h3').textContent = t.svc1Title; svcCards[0].querySelector('p').textContent = t.svc1Desc; }
  if(svcCards[1]) { svcCards[1].querySelector('h3').textContent = t.svc2Title; svcCards[1].querySelector('p').textContent = t.svc2Desc; }
  if(svcCards[2]) { svcCards[2].querySelector('h3').textContent = t.svc3Title; svcCards[2].querySelector('p').textContent = t.svc3Desc; }
  if(svcCards[3]) { svcCards[3].querySelector('h3').textContent = t.svc4Title; svcCards[3].querySelector('p').textContent = t.svc4Desc; }

  // Clients (present on all pages)
  const clientsStrip = document.querySelector('.clients-strip p');
  if(clientsStrip) clientsStrip.textContent = t.clientsTitle;

  // Trust strip (present on all pages)
  const ts = document.querySelector('.trust-strip');
  if(ts) { ts.querySelector('span').textContent = t.trustStrip; ts.querySelector('.trust-strip-link').textContent = t.trustLink; }

  // Why section (present on all pages)
  const whyEyebrow = document.querySelector('.why .section-eyebrow');
  if(whyEyebrow) whyEyebrow.textContent = t.whyEyebrow;
  const whyTitle = document.querySelector('.why .section-title');
  if(whyTitle) whyTitle.textContent = t.whyTitle;
  const whyCards = document.querySelectorAll('.why-card');
  if(whyCards[0]) { whyCards[0].querySelector('h4').textContent = t.why1Title; whyCards[0].querySelector('p').textContent = t.why1Desc; }
  if(whyCards[1]) { whyCards[1].querySelector('h4').textContent = t.why2Title; whyCards[1].querySelector('p').textContent = t.why2Desc; }
  if(whyCards[2]) { whyCards[2].querySelector('h4').textContent = t.why3Title; whyCards[2].querySelector('p').textContent = t.why3Desc; }
  if(whyCards[3]) { whyCards[3].querySelector('h4').textContent = t.why4Title; whyCards[3].querySelector('p').textContent = t.why4Desc; }

  // CTA (present on all pages)
  const ctaBand = document.querySelector('.cta-band');
  if(ctaBand) { ctaBand.querySelector('h2').textContent = t.ctaTitle; ctaBand.querySelector('p').textContent = t.ctaDesc; const btnNavy = ctaBand.querySelector('.btn-navy'); if(btnNavy) btnNavy.textContent = t.ctaBtn1; const btnPrimaryLast = ctaBand.querySelector('.btn-primary:last-of-type'); if(btnPrimaryLast) btnPrimaryLast.textContent = t.ctaBtn2; }

  // Footer (present on all pages)
  const footerBrandP = document.querySelector('.footer-brand p');
  if(footerBrandP) footerBrandP.textContent = t.footerDesc;
  const footerColH5s = document.querySelectorAll('.footer-col h5');
  if(footerColH5s[0]) footerColH5s[0].textContent = t.footerCompany;
  if(footerColH5s[1]) footerColH5s[1].textContent = t.footerServices;

  // Cases (page-specific)
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

// Audit Modal
function openAuditModal() {
  const modal = document.getElementById('auditModal');
  if(modal) modal.classList.add('show');
}

function closeAuditModal() {
  const modal = document.getElementById('auditModal');
  if(modal) modal.classList.remove('show');
}

// WhatsApp Widget
function openWhatsAppWidget() {
  const whatsappUrl = 'https://wa.me/+601154034051?text=Hi%2C%20I%27m%20from%20%5BCompany%5D%2C%20interested%20in%20AI%20%2B%20IT%20for%20SMEs.%20Send%20me%20the%203-day%20proposal.';
  window.open(whatsappUrl, '_blank');
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
  // New DIS logo works in both modes - no swap needed
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
// === CIRCUIT BOARD BACKGROUND ===
const bgCanvas=document.getElementById('network-bg'),bgCtx=bgCanvas.getContext('2d')
let w,h
function bgResize(){w=bgCanvas.width=window.innerWidth;h=bgCanvas.height=window.innerHeight}
bgResize()
window.addEventListener('resize',bgResize)
const NP=40,BED=150;let t=0
const particles=[]
for(let i=0;i<NP;i++){const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1),r=350+Math.random()*100;particles.push({x:r*Math.sin(phi)*Math.cos(theta),y:r*Math.sin(phi)*Math.sin(theta),z:r*Math.cos(phi),vx:(Math.random()-0.5)*0.008,vy:(Math.random()-0.5)*0.008,vz:(Math.random()-0.5)*0.008})}
const proj=(x,y,z)=>{const f=700/(700+z);return{x:w/2+x*f,y:h/2+y*f}}
const render=()=>{t+=0.016;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0F1822';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(201,162,39,0.4)';ctx.lineWidth=1;ctx.globalAlpha=0.5;for(let i=0;i<particles.length;i++){const p1=particles[i],p1p=proj(p1.x,p1.y,p1.z);for(let j=i+1;j<particles.length;j++){const p2=particles[j],dx=p1.x-p2.x,dy=p1.y-p2.y,dz=p1.z-p2.z,dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<BED){const p2p=proj(p2.x,p2.y,p2.z);ctx.beginPath();ctx.moveTo(p1p.x,p1p.y);ctx.lineTo(p2p.x,p2p.y);ctx.stroke()}}}particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;if(Math.abs(p.x)>400)p.vx*=-0.3;if(Math.abs(p.y)>400)p.vy*=-0.3;if(Math.abs(p.z)>400)p.vz*=-0.3});ctx.globalAlpha=1;requestAnimationFrame(render)}
render()
