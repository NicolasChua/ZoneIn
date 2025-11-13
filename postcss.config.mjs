/**
 * @description
 * This is the configuration file for PostCSS. It's used by Next.js to process
 * Tailwind CSS.
 *
 * @notes
 * - It loads the `tailwindcss` plugin, which is the correct plugin for Tailwind CSS v3.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
