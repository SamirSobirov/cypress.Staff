const { defineConfig } = require("cypress");

module.exports = defineConfig({
  chromeWebSecurity: false,
  
  e2e: {
    baseUrl: 'https://dev.metatrip.uz',
    watchForFileChanges: false,
    viewportWidth: 1280,
    viewportHeight: 800,

    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        }
        return launchOptions;
      });
      return config;
    },
  },
});