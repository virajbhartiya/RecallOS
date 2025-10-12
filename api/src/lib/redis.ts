import Redis from 'ioredis';
const redisConfig: any = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};
if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
  redisConfig.password = process.env.REDIS_PASSWORD;
}
const redis = new Redis(redisConfig);
redis.on('connect', () => {
  console.log('Redis connected successfully');
});
redis.on('error', (err: Error) => {
  console.error('Redis connection error:', err);
});
export default redis;