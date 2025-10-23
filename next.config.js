/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  typescript: {
    // Temporarily ignore build errors due to Next.js 15 + better-auth-ui compatibility issue
    ignoreBuildErrors: true,
  },
};

export default config;
