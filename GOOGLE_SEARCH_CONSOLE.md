# Google Search Console + SEO Launch - Duta Integra

## Step 1: Verify Ownership

### Option A: DNS TXT (Recommended - stays verified)
1. Go to https://search.google.com/search-console
2. Click "Add property" -> Domain -> enter `dutaintegra.my`
3. Google gives TXT record: `google-site-verification=xxxxx`
4. Go to your domain registrar (Cloudflare / Namecheap) -> DNS -> Add TXT
5. Verify

### Option B: HTML File (Quick)
1. In Search Console, choose URL prefix: https://dutaintegra.my
2. Download verification file: `googleXXXXXXXX.html`
3. Upload to repo root: `public/googleXXXXXXXX.html` or root `/`
4. Ensure vercel.json allows it (it does, cleanUrls true but file will serve)
5. Verify

### Option C: Meta Tag (Already in your HTML?)
Add to <head> of index.html:
```html
<meta name="google-site-verification" content="YOUR_CODE_HERE" />
```

## Step 2: Submit Sitemap

After verification:
1. Search Console -> Left menu -> Sitemaps
2. Add new sitemap: `sitemap.xml`
3. Submit
4. Should show: 7 URLs discovered

## Step 3: Request Indexing

1. Top search bar in Search Console: enter `https://dutaintegra.my/`
2. Click "Request Indexing"
3. Repeat for /services.html, /contact.html, /pricing.html

## Step 4: Fix Language Targeting (ms/)

Your sitemap.xml already has:
```xml
<xhtml:link rel="alternate" hreflang="en" href="https://dutaintegra.my/"/>
<xhtml:link rel="alternate" hreflang="ms" href="https://dutaintegra.my/ms/"/>
```

Add to every HTML <head>:

For English pages (index.html, about.html, etc):
```html
<link rel="alternate" hreflang="en" href="https://dutaintegra.my/about.html" />
<link rel="alternate" hreflang="ms" href="https://dutaintegra.my/ms/about.html" />
<link rel="alternate" hreflang="x-default" href="https://dutaintegra.my/about.html" />
```

For Malay pages (ms/index.html):
```html
<link rel="alternate" hreflang="ms" href="https://dutaintegra.my/ms/" />
<link rel="alternate" hreflang="en" href="https://dutaintegra.my/" />
```

## Step 5: Check After 48h

In Search Console:
- Performance -> See clicks
- Pages -> Ensure 7 indexed, 0 errors, Web/ and *.pptx not indexed (should be 404 now)
- Sitemaps -> Status: Success

## Step 6: Bing + Others

Submit same sitemap to:
- Bing Webmaster: https://www.bing.com/webmasters/ -> Sitemaps -> https://dutaintegra.my/sitemap.xml
- Same for Yandex if targeting Indonesian community

## .well-known/ Already Exists

You have `.well-known/` folder - keep it. Good for:
- `/.well-known/security.txt` (optional)
- SSL verification

No action needed unless Google asks for .well-known file.

## Final SEO Checklist

- [ ] robots.txt live at https://dutaintegra.my/robots.txt
- [ ] sitemap.xml live at https://dutaintegra.my/sitemap.xml
- [ ] Verified in Search Console
- [ ] Sitemap submitted
- [ ] Requested indexing for 3 main pages
- [ ] Checked that /Web/, /*.pptx, /admin.html return 404
- [ ] Added hreflang tags to all pages
- [ ] Added meta description to each page (currently missing?)
