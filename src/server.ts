import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { registerOrderRoutes } from './routes/orderRoutes';
import { registerWsRoute } from './ws/orderSocket';

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(websocketPlugin);

  await registerOrderRoutes(app);
  registerWsRoute(app);

  return app;
}
