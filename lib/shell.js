function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function siteOrigin(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return proto + '://' + req.headers.host;
}

const FAVICON = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 rx=%2722%27 fill=%27%23e11d2e%27/%3E%3Ctext x=%2750%27 y=%2772%27 font-size=%2762%27 font-family=%27Impact,sans-serif%27 text-anchor=%27middle%27 fill=%27white%27%3EA%3C/text%3E%3C/svg%3E";

// page: 'gallery' | 'item'
function renderShell({ req, page, title, description, canonicalPath, ogImage, jsonLd, bodyHtml }) {
  const origin = siteOrigin(req);
  const canonical = origin + canonicalPath;
  const desc = esc(description || '');
  const img = ogImage ? (/^https?:/.test(ogImage) ? ogImage : origin + ogImage) : (origin + '/assets/adil-siddique.webp');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<title>${esc(title)}</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#09090b">
<meta name="description" content="${desc}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="addesign">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(img)}">
<script>document.documentElement.classList.add("js")</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/css/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body data-page="${page}">
<header class="site-header" id="site-header"></header>
<main${page === 'item' ? ' class="item"' : ''}>
${bodyHtml}
</main>
<footer class="site-footer" id="site-footer"></footer>
<div class="toast" id="toast" role="status"></div>
<script src="/js/config.js"></script>
<script src="/js/app.js" defer></script>
</body>
</html>`;
}

module.exports = { esc, siteOrigin, renderShell };
