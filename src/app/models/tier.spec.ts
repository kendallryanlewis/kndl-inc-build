import { Tier } from './tier';

describe('Tier', () => {
  it('should have correct enum values', () => {
    expect(Tier.Starter).toBe('Starter');
    expect(Tier.Professional).toBe('Professional');
    expect(Tier.Enterprise).toBe('Enterprise');
  });
});
