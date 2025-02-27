import { Queue } from 'bullmq'
import { REDIS_HOST, REDIS_PORT } from '@config'

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
}


export const payoutQueue = new Queue('payouts', { connection })
export const shippingQueue = new Queue("shipping", { connection })