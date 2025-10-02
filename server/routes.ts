import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    res.json({
      status: "Realtime voice server is up",
      environment: process.env.NODE_ENV || 'unknown',
      deployment: process.env.REPLIT_DEPLOYMENT === '1',
      apiKeyConfigured: hasApiKey
    });
  });

  // Session endpoint to mint ephemeral client secrets
  app.post("/api/session", async (req, res) => {
    try {
      const { voice = "marin", model = "gpt-realtime" } = req.body;

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error("OpenAI API key missing. Environment:", {
          isDevelopment: process.env.NODE_ENV === 'development',
          isDeployment: process.env.REPLIT_DEPLOYMENT === '1',
          availableKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
        });
        return res.status(500).json({ 
          error: "OpenAI API key not configured. Please ensure OPENAI_API_KEY is set in your Replit Secrets." 
        });
      }

      // Call OpenAI's client secrets endpoint to mint ephemeral token
      const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: voice,
        }),
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        return res.status(sessionResponse.status).json({ 
          error: `OpenAI API error: ${errorText}` 
        });
      }

      const sessionData = await sessionResponse.json();

      res.json({
        client_secret: sessionData.client_secret,
        session: sessionData,
      });
    } catch (error) {
      console.error("Session creation error:", error);
      res.status(500).json({ 
        error: "Failed to create session. Please check your OpenAI API key and try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}