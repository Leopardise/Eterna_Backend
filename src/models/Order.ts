import { db } from '../db/pool';

export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export interface Order {
  id: string;
  side: 'buy' | 'sell';
  inputMint: string;
  outputMint: string;
  amountIn: bigint;
  status: OrderStatus;
  venue?: 'raydium' | 'meteora';
  txHash?: string;
  failureReason?: string | null;
}

export async function insertOrder(order: Order): Promise<void> {
  await db.query(
    `INSERT INTO orders
     (id, side, input_mint, output_mint, amount_in, status, venue, tx_hash, failure_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      order.id,
      order.side,
      order.inputMint,
      order.outputMint,
      order.amountIn.toString(),
      order.status,
      order.venue ?? null,
      order.txHash ?? null,
      order.failureReason ?? null
    ]
  );
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  extra: Partial<Pick<Order, 'venue' | 'txHash' | 'failureReason'>> = {}
) {
  await db.query(
    `UPDATE orders
     SET status = $2,
         venue = COALESCE($3, venue),
         tx_hash = COALESCE($4, tx_hash),
         failure_reason = COALESCE($5, failure_reason),
         updated_at = now()
     WHERE id = $1`,
    [id, status, extra.venue ?? null, extra.txHash ?? null, extra.failureReason ?? null]
  );
}
