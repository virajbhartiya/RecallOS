import express, { Request, Response, NextFunction } from 'express';

import morgan from 'morgan';

import cors from 'cors';

import compression from 'compression';

import http from 'http';
import fs from 'fs';
import https from 'https';

import dotenv from 'dotenv';

import globalErrorHandler from './controller/utils/globalErrorController';

import { routes } from './routes/index.route';

import { prisma } from './lib/prisma';

import { startContentWorker } from './workers/contentWorker';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

let server: http.Server | https.Server;
if (process.env.NODE_ENV !== 'production' && process.env.HTTPS_ENABLE === 'true') {
  try {
    const keyPath = process.env.HTTPS_KEY_PATH || './certs/api.recallos.test+3-key.pem';
    const certPath = process.env.HTTPS_CERT_PATH || './certs/api.recallos.test+3.pem';
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    server = https.createServer(httpsOptions, app);
  } catch (_e) {
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const port = process.env.PORT || 3000;

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
import { getAllowedOrigins } from './utils/env';
app.use(
  cors({
    origin: (origin, callback) => {
      const allowlist = getAllowedOrigins();
      if (!origin) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(compression());
routes(app);
app.use(
  globalErrorHandler as unknown as (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => void
);

async function testDatabaseConnection() {
  try {
    await prisma.$connect();

    const userCount = await prisma.user.count();

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

server.listen(port, async () => {
  await testDatabaseConnection();
  startContentWorker();
});
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
