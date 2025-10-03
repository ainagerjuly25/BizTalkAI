import type { Express } from "express";
import { createServer, type Server } from "http";

// Helper function to generate company-specific instructions
function getCompanyInstructions(company: string): string {
  const companyLower = company.toLowerCase();

  let baseInstructions = `You are an AI assistant working as the Enterprise Front Manager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

  if (companyLower.includes("bakery")) {
    baseInstructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
  } else if (companyLower.includes("restaurant")) {
    baseInstructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    baseInstructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
  } else if (companyLower.includes("hotel")) {
    baseInstructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
  } else if (companyLower.includes("bank")) {
    baseInstructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    baseInstructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    baseInstructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    baseInstructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
  } else if (companyLower.includes("foods")) {
    baseInstructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
  } else {
    baseInstructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
  }

  baseInstructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;

  return baseInstructions;
}

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
      const { voice = "marin", model = "gpt-realtime", company = "" } = req.body;

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
      const sessionBody: any = {
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: voice,
      };

      // Add company-specific instructions if company is provided
      if (company) {
        sessionBody.instructions = getCompanyInstructions(company);
      }

      const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionBody),
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