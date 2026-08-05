import "dotenv/config";
import app from "./app";
import { env } from "./config/env";

const port = env.PORT ?? 5000;

// Start server (skip when running under a serverless function)
if (process.env.NETLIFY !== "true") {
  app.listen(port, () => {
    console.log(`[SmartGovern] API listening on http://localhost:${port}`);
  });
}

export default app;
</content>
