import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'Merchant Commerce Hub',
  port: parseInt(process.env.PORT ?? '3000', 10),
  prefix: process.env.APP_PREFIX ?? 'api',
  dashboardUrl: process.env.DASHBOARD_FRONTEND_URL,
  storefrontUrl: process.env.PUBLIC_STOREFRONT_URL,
}));
