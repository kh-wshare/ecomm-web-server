import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'MyApp',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    prefix: process.env.APP_PREFIX ?? 'api',
}));