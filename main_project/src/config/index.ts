import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === "true";
export const { RAZORPAYX_API_KEY, RAZORPAYX_ACCOUNT_NUMBER, RAZORPAYX_API_SECRET, RAZORPAYX_WEBHOOK_SECRET, RAZORPAY_API_SECRET, RAZORPAY_API_KEY, WEBHOOK_SECRET, NODE_ENV, PORT, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN, REDIS_HOST, REDIS_PORT } =
  process.env;
export const { DB_URL } = process.env;

export const {
  COMMUNICATION_KEY,
  COMMUNICATION_KEY_ID,
  FRONT_END_URL,
  ADMIN_EMAIL,
  IMAGE_URL,
  S3_IMAGE_URL
} = process.env;

export const {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  QUEUE_URL,
  REGION,
  API_VERSION,
  LIVE_STREAM_BUCKET_NAME,
  BUCKET_REGION,
  SERVER_SECRET,
  APP_ID
} = process.env;

export const DATATABLE = { limit: 100, skip: 0 };

export const MODULES = [
  "user",
  "country",
  "review",
  "helpSupport",
  "category",
  "subscriptions",
];
export const FEATURES = {
  user: ["read", "write", "update", "delete"],
  country: ["read", "write", "update", "delete"],
  review: ["read", "write", "update", "delete"],
  helpSupport: ["read", "write", "update", "delete"],
  category: ["read", "write", "update", "delete"],
  subscriptions: ["read", "write", "update", "delete"],
};
export const ROLES = ["USER", "ADMIN"];
