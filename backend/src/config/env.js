const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL,

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,

  facultyEmail: process.env.FACULTY_EMAIL || 'faculty@oli.edu',
  facultyPassword: process.env.FACULTY_PASSWORD || 'admin123',

  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '8h',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

const requiredVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
  'FACULTY_EMAIL',
  'FACULTY_PASSWORD',
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = env;
