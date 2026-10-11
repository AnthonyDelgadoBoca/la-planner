import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Our Little LA Guide', short_name: 'Our LA Guide', description: 'A little plan for a little adventure together.', start_url: '/', display: 'standalone', background_color: '#f8f3ee', theme_color: '#f8f3ee', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] };
}
