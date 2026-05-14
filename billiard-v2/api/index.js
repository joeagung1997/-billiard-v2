// api/index.js — Vercel serverless entry point
import { initDB } from '../src/utils/db.js';
import app from '../src/app.js';

await initDB();

export default app;
