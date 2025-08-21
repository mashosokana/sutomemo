// next.config.mjs
/** @type {import('next').NextConfig} */

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return "vaboszqtrcvhxsxezlvz.supabase.co";
  }
})();

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: SUPABASE_HOST, pathname: "/storage/v1/object/**" },
      { protocol: "https", hostname: SUPABASE_HOST, pathname: "/storage/v1/render/**" },
    ],
  },
};

export default nextConfig;
