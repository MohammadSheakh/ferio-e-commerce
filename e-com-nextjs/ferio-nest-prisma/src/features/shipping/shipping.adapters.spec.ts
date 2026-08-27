import { ConfigService } from '@nestjs/config';
import { CarrybeeAdapter } from './adapters/carrybee.adapter';
import { PathaoAdapter } from './adapters/pathao.adapter';
import { SteadfastAdapter } from './adapters/steadfast.adapter';

describe('courier webhook adapters', () => {
  const pathao = new PathaoAdapter(
    new ConfigService({ PATHAO_WEBHOOK_SECRET: 'pathao-secret' }),
  );
  const steadfast = new SteadfastAdapter(
    new ConfigService({ STEADFAST_WEBHOOK_TOKEN: 'steadfast-token' }),
  );
  const carrybee = new CarrybeeAdapter(
    new ConfigService({ CARRYBEE_WEBHOOK_SECRET: 'carrybee-secret' }),
  );

  it('requires the configured Pathao webhook secret', () => {
    expect(
      pathao.verifyWebhook({ 'x-pathao-signature': 'pathao-secret' }),
    ).toBe(true);
    expect(
      pathao.verifyWebhook({ 'x-pathao-signature': 'incorrect-secret' }),
    ).toBe(false);
    expect(pathao.verifyWebhook({})).toBe(false);
  });

  it('requires the configured Steadfast bearer token', () => {
    expect(
      steadfast.verifyWebhook({ authorization: 'Bearer steadfast-token' }),
    ).toBe(true);
    expect(
      steadfast.verifyWebhook({ authorization: 'Bearer incorrect-token' }),
    ).toBe(false);
    expect(steadfast.verifyWebhook({})).toBe(false);
  });

  it('requires an environment-provided CarryBee webhook secret', () => {
    expect(
      carrybee.verifyWebhook({
        'x-cb-webhook-integration-header': 'carrybee-secret',
      }),
    ).toBe(true);
    expect(
      carrybee.verifyWebhook({
        'x-carrybee-webhook-signature': 'incorrect-secret',
      }),
    ).toBe(false);
    expect(new CarrybeeAdapter(new ConfigService()).verifyWebhook({})).toBe(
      false,
    );
  });
});
