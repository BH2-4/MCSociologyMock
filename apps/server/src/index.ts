import { createApp } from "./app.js";

const port = Number(process.env.SERVER_PORT ?? 4100);

createApp().listen(port, () => {
  console.log(`AgoraSim API listening on http://localhost:${port}`);
});
