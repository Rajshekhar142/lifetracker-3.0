import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";


const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA({
  dest: "public",           // outputs sw.js to public folder
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // disable in dev
})(nextConfig);

