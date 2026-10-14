// server.js
// Entry point — opens the DB (async) and starts listening.

import env from './src/config/env.js';
import { getDb } from './src/config/database.js';
import { createApp } from './src/app.js';

(async () => {
  const db  = await getDb();
  const app = createApp(db);

  app.listen(env.PORT, () => {
    console.log(`🚀 Internship Board API running on http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Database    : ${env.DB_PATH}`);
  });
})();
