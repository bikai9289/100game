import { getMessageList } from '@/lib/locale';
import { m } from '@/locale/paraglide/messages';
import { clientEnv } from '@/env/client';
import type { WebsiteConfig } from '../types';
import {
  DEFAULT_ALLOWED_TYPES,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_USER_FILES_FOLDER,
} from '@/storage/constants';

// Payment provider controlled by env var: 'stripe' | 'creem' | '' (empty means disabled)
const paymentProvider = clientEnv.VITE_PAYMENT_PROVIDER;
const isPaymentEnabled = paymentProvider !== '';
const isCreemPayment = paymentProvider === 'creem';
// Resolve price/product IDs based on the active payment provider
const priceIds = isPaymentEnabled
  ? {
      proMonthly: isCreemPayment
        ? (clientEnv.VITE_CREEM_PRODUCT_PRO_MONTHLY ?? '')
        : (clientEnv.VITE_STRIPE_PRICE_PRO_MONTHLY ?? ''),
      proYearly: isCreemPayment
        ? (clientEnv.VITE_CREEM_PRODUCT_PRO_YEARLY ?? '')
        : (clientEnv.VITE_STRIPE_PRICE_PRO_YEARLY ?? ''),
      lifetime: isCreemPayment
        ? (clientEnv.VITE_CREEM_PRODUCT_LIFETIME ?? '')
        : (clientEnv.VITE_STRIPE_PRICE_LIFETIME ?? ''),
    }
  : { proMonthly: '', proYearly: '', lifetime: '' };

/**
 * Website config
 */
export const websiteConfig: WebsiteConfig = {
  ui: {
    mode: {
      defaultMode: 'light',
      enableSwitch: false,
    },
  },
  metadata: {
    name: 'Name100Challenge',
    title:
      'Name 100 Women Challenge - Can You Name 100 Famous Women in 12 Minutes?',
    description:
      'Play the free Name 100 Women Challenge online. 12 minutes to name 100 famous women - actresses, scientists, athletes, musicians. How many can you get?',
    images: {
      ogImage: '/og-image.png',
      logoLight: '/logo.png',
      logoDark: '/logo-dark.png',
    },
  },
  social: {
    github: 'https://github.com/bikai9289/100game',
    discord: '',
    twitter: '',
    youtube: '',
  },
  auth: {
    enable: false,
    enableGoogleLogin: true,
    enableCredentialLogin: true,
    enableDeleteAccount: true,
  },
  blog: {
    enable: false,
    paginationSize: 6,
  },
  mail: {
    enable: false,
    provider: 'cloudflare',
    fromEmail: '',
    supportEmail: '',
  },
  newsletter: {
    enable: false,
    provider: 'resend',
    autoSubscribeAfterSignUp: true,
  },
  notification: {
    enable: false,
    provider: 'discord',
  },
  storage: {
    enable: false,
    provider: 'r2',
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedTypes: DEFAULT_ALLOWED_TYPES,
    userFilesFolder: DEFAULT_USER_FILES_FOLDER,
  },
  payment: {
    enable: isPaymentEnabled,
    provider: isPaymentEnabled ? paymentProvider : undefined,
    price: {
      plans: {
        free: {
          id: 'free',
          prices: [],
          isFree: true,
          isLifetime: false,
          get name() {
            return m.pricing_plans_free_name();
          },
          get description() {
            return m.pricing_plans_free_description();
          },
          get features() {
            return [...getMessageList(m.pricing_plans_free_features())];
          },
          get limits() {
            return [...getMessageList(m.pricing_plans_free_limits())];
          },
        },
        pro: {
          id: 'pro',
          prices: [
            {
              type: 'subscription',
              priceId: priceIds.proMonthly,
              amount: 990,
              currency: 'USD',
              interval: 'month',
            },
            {
              type: 'subscription',
              priceId: priceIds.proYearly,
              amount: 9900,
              currency: 'USD',
              interval: 'year',
            },
          ],
          isFree: false,
          isLifetime: false,
          popular: true,
          get name() {
            return m.pricing_plans_pro_name();
          },
          get description() {
            return m.pricing_plans_pro_description();
          },
          get features() {
            return [...getMessageList(m.pricing_plans_pro_features())];
          },
          get limits() {
            return [...getMessageList(m.pricing_plans_pro_limits())];
          },
        },
        lifetime: {
          id: 'lifetime',
          prices: [
            {
              type: 'one_time',
              priceId: priceIds.lifetime,
              amount: 19900,
              currency: 'USD',
              allowPromotionCode: true,
            },
          ],
          isFree: false,
          isLifetime: true,
          get name() {
            return m.pricing_plans_lifetime_name();
          },
          get description() {
            return m.pricing_plans_lifetime_description();
          },
          get features() {
            return [...getMessageList(m.pricing_plans_lifetime_features())];
          },
          get limits() {
            return [...getMessageList(m.pricing_plans_lifetime_limits())];
          },
        },
      },
    },
  },
};
