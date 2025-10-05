import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATABASE_TYPE = process.env.DATABASE_TYPE || 'firestore'; 

// Add a default cache expiry time in seconds (e.g., 1 hour)
export const DEFAULT_CACHE_EXPIRY = parseInt(process.env.DEFAULT_CACHE_EXPIRY, 10) || 3600;

export const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');