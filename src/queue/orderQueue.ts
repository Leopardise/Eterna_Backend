import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';

export const redis = new IORedis(getEnv('REDIS_URL'));

export const ORDER_QUEUE_NAME = 'order-queue';

export interface OrderJobData {
  orderId: string;
  inputMint: string;
  outputMint: string;
  amountIn: string; // stringified bigint
  side: 'buy' | 'sell';
}

export const orderQueue = new Queue<OrderJobData>(ORDER_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  } as JobsOptions
});

export function createOrderWorker(
  handler: (data: OrderJobData) => Promise<void>
): Worker<OrderJobData> {
  const concurrency = Number(getEnv('MAX_CONCURRENT_ORDERS', '10'));

  const worker = new Worker<OrderJobData>(
    ORDER_QUEUE_NAME,
    async job => {
      await handler(job.data);
    },
    {
      connection: redis,
      concurrency
    }
  );

  return worker;
}
