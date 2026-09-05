import { StorefrontAnalyticsEventType } from '@prisma/client';
import { StorefrontAnalyticsService } from '../storefront-analytics.service';

describe('StorefrontAnalyticsService measured metrics', () => {
  const analyticsEvent = {
    create: jest.fn(),
    groupBy: jest.fn(),
  };
  const db = {
    storefrontAnalyticsEvent: analyticsEvent,
    $queryRaw: jest.fn(),
    order: { findMany: jest.fn() },
  };
  const settings = {
    get: jest.fn().mockResolvedValue({ storefrontAnalyticsEnabled: true }),
  };
  const config = {
    get: jest.fn().mockReturnValue('analytics-test-secret'),
    getOrThrow: jest.fn().mockReturnValue('analytics-test-secret'),
  };
  const tenantDb = { tryGet: jest.fn().mockResolvedValue(db) };

  function service() {
    return new StorefrontAnalyticsService(
      {} as never,
      config as never,
      settings as never,
      tenantDb as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    settings.get.mockResolvedValue({ storefrontAnalyticsEnabled: true });
    tenantDb.tryGet.mockResolvedValue(db);
  });

  it('stores structured search-result evidence', async () => {
    analyticsEvent.create.mockResolvedValue({ id: 'event-1' });

    await service().create({
      eventId: '11111111-1111-4111-8111-111111111111',
      anonymousId: '22222222-2222-4222-8222-222222222222',
      type: StorefrontAnalyticsEventType.SEARCH,
      searchTerm: 'wireless mouse',
      searchResultCount: 0,
      path: '/products',
    });

    expect(analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventVersion: 2,
        type: StorefrontAnalyticsEventType.SEARCH,
        searchTerm: 'wireless mouse',
        searchResultCount: 0,
      }),
    });
  });

  it('returns no zero-result searches when no measured evidence exists', async () => {
    analyticsEvent.groupBy.mockResolvedValue([]);
    const analytics = service();
    const topSearches = jest.spyOn(analytics, 'getTopSearches');

    await expect(analytics.getZeroResultSearches()).resolves.toEqual([]);
    expect(topSearches).not.toHaveBeenCalled();
    expect(analyticsEvent.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ searchResultCount: 0 }),
      }),
    );
  });

  it('rejects search-result evidence on a different event type', async () => {
    await expect(
      service().create({
        eventId: '33333333-3333-4333-8333-333333333333',
        anonymousId: '44444444-4444-4444-8444-444444444444',
        type: StorefrontAnalyticsEventType.CHECKOUT_BEGIN,
        searchResultCount: 0,
        path: '/checkout',
      }),
    ).rejects.toThrow('valid only for search events');
    expect(analyticsEvent.create).not.toHaveBeenCalled();
  });

  it('uses measured checkout-begin events in the funnel', async () => {
    analyticsEvent.groupBy.mockResolvedValue([
      {
        type: StorefrontAnalyticsEventType.ADD_TO_CART,
        _count: { type: 20 },
      },
      {
        type: StorefrontAnalyticsEventType.CHECKOUT_BEGIN,
        _count: { type: 3 },
      },
    ]);
    db.$queryRaw.mockResolvedValue([]);
    const analytics = service();
    jest.spyOn(analytics, 'getTopSearches').mockResolvedValue([]);
    jest.spyOn(analytics, 'getZeroResultSearches').mockResolvedValue([]);
    jest.spyOn(analytics, 'getViewedButNotPurchased').mockResolvedValue([]);

    const overview = await analytics.getAnalyticsOverview(1);

    expect(overview.funnel).toEqual({
      productViews: 0,
      addToCart: 20,
      checkoutBegin: 3,
      purchased: 0,
    });
    expect(db.order.findMany).not.toHaveBeenCalled();
  });

  it('builds revenue and order totals from bounded daily database aggregates', async () => {
    analyticsEvent.groupBy.mockResolvedValue([]);
    db.$queryRaw.mockResolvedValue([
      {
        date: new Date().toISOString().slice(0, 10),
        orders: 4n,
        revenue: 12_500n,
      },
    ]);
    const analytics = service();
    jest.spyOn(analytics, 'getTopSearches').mockResolvedValue([]);
    jest.spyOn(analytics, 'getZeroResultSearches').mockResolvedValue([]);
    jest.spyOn(analytics, 'getViewedButNotPurchased').mockResolvedValue([]);

    const overview = await analytics.getAnalyticsOverview(1);

    expect(overview.summary).toMatchObject({
      totalRevenue: 12_500,
      totalOrders: 4,
    });
    expect(overview.dailyTrend).toEqual([
      expect.objectContaining({ revenue: 12_500, orders: 4 }),
    ]);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
});
