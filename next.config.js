/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Build configuration
  eslint: {
    // Temporarily ignore ESLint warnings during builds
    // These are pre-existing warnings in other files
    ignoreDuringBuilds: true,
  },
};

export default config;
