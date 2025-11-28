import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getEnv } from '../config/env';
import { orderQueue, OrderJobData } from '../queue/orderQueue';
import { insertOrder } from '../models/Order';

export async function registerOrderRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      side: 'buy' | 'sell';
      inputMint?: string;
      outputMint?: string;
      amount: string; // decimal string in tokens, we'll convert
      decimals?: number;
    };
  }>('/api/orders/execute', async (req, reply) => {
    const { side, inputMint, outputMint, amount, decimals = 9 } = req.body;

    const inMint = inputMint ?? process.env.INPUT_MINT!;
    const outMint = outputMint ?? process.env.OUTPUT_MINT!;

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return reply.code(400).send({ error: 'Invalid amount' });
    }

    const lamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    const orderId = uuidv4();

    await insertOrder({
      id: orderId,
      side,
      inputMint: inMint,
      outputMint: outMint,
      amountIn: lamports,
      status: 'pending'
    });

    const data: OrderJobData = {
      orderId,
      side,
      inputMint: inMint,
      outputMint: outMint,
      amountIn: lamports.toString()
    };

    await orderQueue.add('execute', data);

    return reply.send({ orderId });
  });
}
