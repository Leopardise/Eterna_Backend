import * as router from '../src/dex/router';
import * as ray from '../src/dex/raydiumClient';
import * as met from '../src/dex/meteoraClient';

describe('DEX router', () => {
  test('picks Raydium when Raydium outAmount is higher', async () => {
    jest.spyOn(ray, 'raydiumQuote').mockResolvedValue({
      venue: 'raydium',
      outAmount: BigInt(100),
      // @ts-ignore
      swapResponse: { data: {} }
    });

    jest.spyOn(met, 'meteoraQuote').mockResolvedValue({
      venue: 'meteora',
      outAmount: BigInt(90),
      pool: {},
      minOut: { toString: () => '90' } as any,
      inAmountLamports: { toString: () => '1000' } as any
    });

    const routeDecision = await router.getBestRoute(
      'input',
      'output',
      BigInt(1000)
    );

    expect(routeDecision.venue).toBe('raydium');
  });

  test('picks Meteora when Meteora outAmount is higher', async () => {
    jest.spyOn(ray, 'raydiumQuote').mockResolvedValue({
      venue: 'raydium',
      outAmount: BigInt(80),
      // @ts-ignore
      swapResponse: { data: {} }
    });

    jest.spyOn(met, 'meteoraQuote').mockResolvedValue({
      venue: 'meteora',
      outAmount: BigInt(120),
      pool: {},
      minOut: { toString: () => '120' } as any,
      inAmountLamports: { toString: () => '1000' } as any
    });

    const routeDecision = await router.getBestRoute(
      'input',
      'output',
      BigInt(1000)
    );

    expect(routeDecision.venue).toBe('meteora');
  });

  test('throws if both DEXes fail', async () => {
    jest
      .spyOn(ray, 'raydiumQuote')
      .mockRejectedValue(new Error('ray fail'));
    jest
      .spyOn(met, 'meteoraQuote')
      .mockRejectedValue(new Error('met fail'));

    await expect(
      router.getBestRoute('i', 'o', BigInt(1_000))
    ).rejects.toThrow(/Both DEX quote calls failed/);
  });
});
