/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shaking optimizado para librerías pesadas: solo se incluye lo que se usa,
  // reduciendo el JS que descarga y ejecuta cada página que las importa.
  experimental: {
    optimizePackageImports: ['recharts'],
  },
  async headers() {
    return [
      {
        source: '/paciente/:token*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
