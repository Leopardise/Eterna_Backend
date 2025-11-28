import { createOrderWorker, orderQueue, OrderJobData } from '../src/queue/orderQueue';

describe('Order queue', () => {
  afterAll(async () => {
    await orderQueue.close();
  });

  test('processes a job successfully', async () => {
    const handled: OrderJobData[] = [];

    const worker = createOrderWorker(async data => {
      handled.push(data);
    });

    await orderQueue.add('execute', {
      orderId: 'test-1',
      inputMint: 'A',
      outputMint: 'B',
      amountIn: '1000',
      side: 'buy'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(handled).toHaveLength(1);
    expect(handled[0].orderId).toBe('test-1');

    await worker.close();
  });

  test('retries up to 3 times on failure', async () => {
    let calls = 0;
    const worker = createOrderWorker(async () => {
      calls++;
      throw new Error('boom');
    });

    await orderQueue.add('execute', {
      orderId: 'test-2',
      inputMint: 'A',
      outputMint: 'B',
      amountIn: '1000',
      side: 'buy'
    });

    // wait for retries
    await new Promise(resolve => setTimeout(resolve, 5000));

    expect(calls).toBeGreaterThanOrEqual(3);

    await worker.close();
  });
});
