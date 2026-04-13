/** @type {import('next').NextConfig} */
const nextConfig = {
  // Generate a fully static site (Static HTML export)
  output: 'export',
  images: {
    // Required for static export when using next/image
    unoptimized: true,
  },
  // Note: custom routes (rewrites/redirects) are not supported with
  // `output: 'export'`. All internal links must point at actual .html files.
};

module.exports = nextConfig;
