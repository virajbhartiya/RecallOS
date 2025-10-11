import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err: Error) => {
  console.error('Redis connection error:', err);
});

export default redis;
