/**
 * Dynamic Expo configuration that extends app.json
 * 
 * This file reads environment variables and injects them into the app config.
 * For EAS builds, env vars are set in eas.json per profile.
 */

const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  // Read ALLOW_DEMO_REVIEW_LOGIN from environment
  // - For EAS builds: Set in eas.json env section per profile
  // - For local dev: Set in .env or shell environment
  // - Default: false (demo bypass OFF)
  const allowDemoReviewLogin = process.env.ALLOW_DEMO_REVIEW_LOGIN === 'true';
  
  return {
    ...baseConfig.expo,
    extra: {
      ...baseConfig.expo.extra,
      ALLOW_DEMO_REVIEW_LOGIN: allowDemoReviewLogin,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
        buildProfile: process.env.EAS_BUILD_PROFILE || undefined,
      },
    },
  };
};
