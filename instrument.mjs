import * as Sentry from "@sentry/node";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("dotenv").config({ quiet: true });   // load env before Sentry init

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
    enabled: !!process.env.SENTRY_DSN
});