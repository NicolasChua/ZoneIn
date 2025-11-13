/**
 * @description
 * This is the configuration file for Next.js.
 * It uses the .mjs extension because the project's package.json has "type": "module".
 * The JSDoc comment provides type-checking for the configuration object.
 *
 * @notes
 * - `devIndicators` is configured to hide the build activity indicator in development.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
