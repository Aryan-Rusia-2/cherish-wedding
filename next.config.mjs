/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Lets Google sign-in popups talk to the opener (avoids COOP + window.closed warnings).
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
