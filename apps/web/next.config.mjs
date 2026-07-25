const isDevelopmentServer = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `next dev` from reading chunks overwritten by `next build`.
  distDir: isDevelopmentServer ? ".next-dev" : ".next",
};

export default nextConfig;
