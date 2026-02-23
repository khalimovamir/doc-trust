const { parseOfferDeepLink } = require('../../lib/deepLinks');

describe('parseOfferDeepLink', () => {
  it('returns offer id from path doctrust://offer/50', () => {
    expect(parseOfferDeepLink('doctrust://offer/50')).toBe('50');
  });

  it('returns offer id from path ai-lawyer://offer/50', () => {
    expect(parseOfferDeepLink('ai-lawyer://offer/50')).toBe('50');
  });

  it('returns offer id from path with uuid', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(parseOfferDeepLink(`doctrust://offer/${uuid}`)).toBe(uuid);
  });

  it('returns id from query param ?id=50', () => {
    expect(parseOfferDeepLink('doctrust://offer?id=50')).toBe('50');
  });

  it('returns offerId from query param', () => {
    expect(parseOfferDeepLink('doctrust://offer?offerId=99')).toBe('99');
  });

  it('returns null for non-offer path', () => {
    expect(parseOfferDeepLink('doctrust://other')).toBe(null);
    expect(parseOfferDeepLink('doctrust://')).toBe(null);
  });

  it('returns null for empty or invalid url', () => {
    expect(parseOfferDeepLink('')).toBe(null);
    expect(parseOfferDeepLink(null)).toBe(null);
    expect(parseOfferDeepLink(undefined)).toBe(null);
  });
});
