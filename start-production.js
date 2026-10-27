const { loadEnvConfig } = require('@next/env');
const path = require('path');

// 1. Load project environment variables (.env.local, .env.production, etc.)
loadEnvConfig(path.resolve(__dirname));

// 2. Default to port 3000 if not specified
process.env.PORT = process.env.PORT || '3000';
process.env.NODE_ENV = 'production';

// 3. Start Next.js standalone server
require('./.next/standalone/server.js');
