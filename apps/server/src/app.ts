import cors from "cors";
import express from "express";

import { PRODUCT_OFFER, SIMULATION_CONFIG } from "@agorasim/core";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      product: PRODUCT_OFFER,
      simulation: SIMULATION_CONFIG,
    });
  });

  return app;
}
