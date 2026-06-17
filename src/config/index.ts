/**
 * Central application config driven by environment variables.
 * All values have typed defaults — the app works out of the box
 * with no .env file, and operators can tune behaviour without a deploy.
 *
 * Example overrides:
 *   NTH_ORDER=3 npm run dev          (easier to test milestone in staging)
 *   USER_SPECIFIC_DISCOUNT=15 npm run dev
 */
export const config = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),

  NTH_ORDER: parseInt(process.env.NTH_ORDER ?? '5', 10),

  DISCOUNT_TIERS: {
    USER_SPECIFIC: {
      discountPercent: parseFloat(process.env.USER_SPECIFIC_DISCOUNT ?? '10'),
      minOrderAmount:  parseFloat(process.env.USER_SPECIFIC_MIN_AMOUNT ?? '1500'),
    },
    GLOBAL_TIER1: {
      discountPercent: parseFloat(process.env.GLOBAL_TIER1_DISCOUNT ?? '7.5'),
      minOrderAmount:  parseFloat(process.env.GLOBAL_TIER1_MIN_AMOUNT ?? '1500'),
    },
    GLOBAL_TIER2: {
      discountPercent: parseFloat(process.env.GLOBAL_TIER2_DISCOUNT ?? '10'),
      minOrderAmount:  parseFloat(process.env.GLOBAL_TIER2_MIN_AMOUNT ?? '2000'),
    },
  },
};
