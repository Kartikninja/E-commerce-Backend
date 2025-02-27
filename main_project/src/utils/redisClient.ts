import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '@config';



export const redisClient = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),

});

redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

