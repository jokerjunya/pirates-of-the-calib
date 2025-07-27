/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright']
  },
  
  // Web-CALIBデモサイト用のパスリライト
  async rewrites() {
    return [
      // /webcalib/* を /api/mock-webcalib/* にリダイレクト
      {
        source: '/webcalib/:path*',
        destination: '/api/mock-webcalib/:path*',
      },
    ];
  },
}

export default nextConfig 