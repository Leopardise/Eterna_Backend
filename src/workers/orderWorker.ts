import { createOrderWorker, OrderJobData } from '../queue/orderQueue';
import { getBestRoute, executeOnVenue } from '../dex/router';
import { updateOrderStatus } from '../models/Order';
import { emitOrderStatus } from '../ws/orderSocket';

export function startOrderWorker() {
  return createOrderWorker(async (job: OrderJobData) => {
    const { orderId, inputMint, outputMint, amountIn } = job;
    const amountInLamports = BigInt(amountIn);

    // pending -> routing
    await updateOrderStatus(orderId, 'routing');
    emitOrderStatus({ orderId, status: 'routing' });

    // routing: compare DEXes
    const route = await getBestRoute(inputMint, outputMint, amountInLamports);

    await updateOrderStatus(orderId, 'building', { venue: route.venue });
    emitOrderStatus({ orderId, status: 'building' });

    try {
      await updateOrderStatus(orderId, 'submitted');
      emitOrderStatus({ orderId, status: 'submitted' });

      const txHash = await executeOnVenue(
        route.venue,
        inputMint,
        outputMint,
        amountInLamports,
        route.bestQuote
      );

      await updateOrderStatus(orderId, 'confirmed', {
        txHash
      });
      emitOrderStatus({ orderId, status: 'confirmed', txHash });
    } catch (err: any) {
      const errorMsg = err?.message ?? 'Execution failed';
      await updateOrderStatus(orderId, 'failed', {
        failureReason: errorMsg
      });
      emitOrderStatus({
        orderId,
        status: 'failed',
        error: errorMsg
      });
      throw err; // let BullMQ record failure
    }
  });
}
