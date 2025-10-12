import express, { Request, Response, NextFunction } from 'express';

import morgan from 'morgan';

import cors from 'cors';

import compression from 'compression';

import http from 'http';

import dotenv from 'dotenv';

import globalErrorHandler from './controller/utils/globalErrorController';

import { routes } from './routes/index.route';

import { prisma } from './lib/prisma';

import { startContentWorker } from './workers/contentWorker';

dotenv.config();

const app = express();

const server = http.createServer(app);

const port = process.env.PORT || 3000;

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  cors({
    origin: true,
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
    console.log('Database connected successfully');

    const userCount = await prisma.user.count();

    console.log(`Database ready - ${userCount} users in database`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

server.listen(port, async () => {
  console.log(`RecallOS Context Capture API is running on port ${port}`);
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
