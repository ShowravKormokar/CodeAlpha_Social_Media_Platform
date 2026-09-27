// Frontend configuration
// This file is loaded before other scripts to provide runtime config

const apiHostname = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? window.location.hostname
  : 'localhost';

window.APP_CONFIG = {
  apiBaseUrl: `http://${apiHostname}:5000/api/v1`
};