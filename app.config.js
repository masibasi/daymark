// Extends app.json. EXPO_BASE_URL lets the GitHub Pages build serve from /daymark
// while local development keeps using the site root.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
});
