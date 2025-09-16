/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'canvas'],
  },
  webpack: (config, { isServer }) => {
    // Handle canvas package for server-side
    if (isServer) {
      config.externals.push({
        canvas: 'commonjs canvas',
      });
    }

    // Handle TensorFlow.js
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
  // Enable API routes to handle larger payloads
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
