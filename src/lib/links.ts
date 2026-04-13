// Helper to generate internal hrefs that explicitly target exported .html files.
// For static hosting without clean-URL rewrites, link to concrete HTML files
// (e.g., "/blog" -> "/blog.html", "/posts/slug" -> "/posts/slug.html").
export function hrefHtml(path: string): string {
  if (!path) return path;

  // Preserve anchors and obvious externals unchanged
  const lower = path.toLowerCase();
  if (
    path.startsWith('#') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('javascript:')
  ) {
    return path;
  }

  // Split off hash and query to avoid corrupting them
  const [preHash, hash = ''] = path.split('#', 2);
  const [pathnameRaw, query = ''] = preHash.split('?', 2);

  // Normalize trailing slash (except root)
  const pathname = pathnameRaw !== '/' && pathnameRaw.endsWith('/')
    ? pathnameRaw.slice(0, -1)
    : pathnameRaw;

  // Root: use explicit index.html to satisfy "add .html everywhere"
  if (pathname === '/' || pathname === '/index' || pathname === '/index.html') {
    const rebuilt = '/index.html';
    return rebuilt + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
  }

  // Already an .html file
  if (pathname.toLowerCase().endsWith('.html')) {
    return pathname + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
  }

  // Append .html to internal paths
  const rebuilt = `${pathname}.html`;
  return rebuilt + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
}
