import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupRealtimeWebSocket } from "./realtime";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server for OpenAI Realtime API
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/realtime"
  });

  wss.on("connection", (ws, req) => {
    // Extract company name from query parameter
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const company = url.searchParams.get("company");

    if (!company) {
      ws.close(1008, "Company parameter required");
      return;
    }

    console.log(`New WebSocket connection for company: ${company}`);
    setupRealtimeWebSocket(ws, company, req);
  });

  return httpServer;
}
