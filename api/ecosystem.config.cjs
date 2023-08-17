const options = require('./options.json');

module.exports = {
  apps: [{
    name: 'Koller',
    script: './index.js',
    env_production: {
      NODE_ENV: "production"
    },
    env_development: {
      NODE_ENV: "development"
    },
    exec_mode: 'cluster',
    instances: 'max',
    vizion: false,
    watch: false,
    autorestart: true,
    restart_delay: 1000,
    kill_timeout: options.api.exitTimeout + 100,
    listen_timeout: 10000
  }]
}