import { registerOrderSocket, emitOrderStatus } from '../src/ws/orderSocket';

class MockWebSocket {
  public messages: string[] = [];
  on(_event: string, _cb: () => void) {}
  send(msg: string) {
    this.messages.push(msg);
  }
}

describe('WebSocket lifecycle', () => {
  test('registers socket and receives status events', () => {
    // @ts-ignore
    const ws = new MockWebSocket();

    // fake register
    // @ts-ignore
    registerOrderSocket('order-1', ws);

    emitOrderStatus({
      orderId: 'order-1',
      status: 'pending'
    });

    expect(ws.messages).toHaveLength(1);
    const payload = JSON.parse(ws.messages[0]);
    expect(payload.status).toBe('pending');
  });
});
