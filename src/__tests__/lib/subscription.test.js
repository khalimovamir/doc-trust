jest.mock('../../lib/supabase', () => ({}));
const { applyOfferDiscount } = require('../../lib/subscription');

describe('applyOfferDiscount', () => {
  it('returns original price when no offer', () => {
    expect(applyOfferDiscount(299, null)).toBe(299);
    expect(applyOfferDiscount(299, undefined)).toBe(299);
  });

  it('applies percent discount', () => {
    expect(applyOfferDiscount(299, { discount_type: 'percent', discount_perc: 50 })).toBe(150);
    expect(applyOfferDiscount(2999, { discount_type: 'percent', discount_perc: 50 })).toBe(1500);
    expect(applyOfferDiscount(100, { discount_type: 'percent', discount_perc: 10 })).toBe(90);
  });

  it('applies fixed discount (cents)', () => {
    expect(applyOfferDiscount(299, { discount_type: 'fixed', discount_cent: 150 })).toBe(149);
    expect(applyOfferDiscount(299, { discount_type: 'fixed', discount_cent: 400 })).toBe(0);
  });

  it('returns original price when offer has no discount fields', () => {
    expect(applyOfferDiscount(299, { discount_type: 'other' })).toBe(299);
    expect(applyOfferDiscount(299, {})).toBe(299);
  });
});
