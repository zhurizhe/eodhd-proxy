module.exports = {
  apps: [
    {
      name: 'eodhd-proxy',
      script: 'npm',
      // Use the `start` script defined in package.json to launch Next.js in
      // production mode. PM2 will restart the process automatically on
      // crashes and when files change in development if run with pm2
      // start pm2.config.cjs --watch.
      args: 'start',
      env: {
        PORT: 3001
      }
    }
  ]
};