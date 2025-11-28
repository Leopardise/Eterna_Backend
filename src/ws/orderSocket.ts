import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

export type OrderStatusEvent = {
  orderId: string;
  status:
    | 'pending'
    | 'routing'
    | 'building'
    | 'submitted'
    | 'confirmed'
    | 'failed';
  txHash?: string;
  error?: string;
};

const sockets = new Map<string, WebSocket>();

export function registerOrderSocket(orderId: string, socket: WebSocket) {
  sockets.set(orderId, socket);

  socket.on('close', () => {
    sockets.delete(orderId);
  });
}

export function emitOrderStatus(update: OrderStatusEvent) {
  const ws = sockets.get(update.orderId);
  if (!ws) return;
  ws.send(JSON.stringify(update));
}

export function registerWsRoute(app: FastifyInstance) {
  app.get(
    '/api/orders/execute',
    { websocket: true },
    (connection, req) => {
      // Client should send first message: { orderId: "..." }
      connection.socket.on('message', msg => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.orderId) {
            registerOrderSocket(data.orderId, connection.socket);
            // acknowledge
            connection.socket.send(
              JSON.stringify({
                type: 'ack',
                orderId: data.orderId
              })
            );
          }
        } catch {
          // ignore malformed
        }
      });
    }
  );
}
