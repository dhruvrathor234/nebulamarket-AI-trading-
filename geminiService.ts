import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, TradeType, NewsSource, Symbol, BacktestScenario } from "../types";

// Helper to safely parse JSON from markdown code blocks or raw text
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let content = text;
  
  // Remove markdown code blocks if present
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    content = match[1];
  }
  
  // Find JSON object boundaries to strip extraneous text
  const firstOpen = content.indexOf('{');
  const lastClose = content.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    return content.substring(firstOpen, lastClose + 1);
  }
  
  return content.trim();
};

export const analyzeMarket = async (symbol: Symbol): Promise<MarketAnalysis> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing in environment variables.");
    return {
      symbol,
      timestamp: Date.now(),
      decision: TradeType.HOLD,
      sentimentScore: 0,
      sentimentCategory: 'NEUTRAL',
      reasoning: "API Key missing. Please configure process.env.API_KEY.",
      sources: []
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";

  const systemInstruction = "Act as a professional crypto and forex trader. Your job is to analyze real-time market data and news to make trading decisions.";

  const prompt = `
    Analyze the current market for ${symbol}.
    
    1. Search for the very latest news, economic indicators, and price action specifically for ${symbol}.
    2. Analyze the sentiment of these findings.
    3. Decide on a trading action: BUY, SELL, or HOLD.
    4. Provide a sentiment score (-1 to 1).
    
    Return ONLY a JSON object in this format:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "sentimentScore": number,
      "sentimentCategory": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "reasoning": "Brief summary of the analysis"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        // responseMimeType is NOT allowed with googleSearch, so we must parse the text manually.
      },
    });

    const text = response.text || "{}";
    // console.log(`Gemini Response for ${symbol}:`, text); 

    let data: any = {};
    try {
        data = JSON.parse(cleanJson(text));
    } catch (parseError) {
        console.warn(`JSON Parse failed for ${symbol}. Raw text:`, text);
        // Fallback: try to infer from text if JSON parsing failed
        data = {
            decision: "HOLD",
            sentimentScore: 0,
            sentimentCategory: "NEUTRAL",
            reasoning: text.slice(0, 300) || "Analysis failed to parse."
        };
    }

    // Validate Decision Enum
    let decision: TradeType = TradeType.HOLD;
    if (data.decision?.toUpperCase() === 'BUY') decision = TradeType.BUY;
    if (data.decision?.toUpperCase() === 'SELL') decision = TradeType.SELL;

    // Extract Sources from Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: NewsSource[] = groundingChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri,
      }));

    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map((item) => [item.url, item])).values());

    return {
      symbol,
      timestamp: Date.now(),
      decision,
      sentimentScore: typeof data.sentimentScore === 'number' ? data.sentimentScore : 0,
      sentimentCategory: data.sentimentCategory || 'NEUTRAL',
      reasoning: data.reasoning || "No reasoning provided.",
      sources: uniqueSources,
    };

  } catch (error) {
    console.error(`Gemini Analysis Failed for ${symbol}:`, error);
    return {
      symbol,
      timestamp: Date.now(),
      decision: TradeType.HOLD,
      sentimentScore: 0,
      sentimentCategory: 'NEUTRAL',
      reasoning: "Analysis failed due to API error or rate limit.",
      sources: []
    };
  }
};

export const generateBacktestData = async (): Promise<BacktestScenario[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";

  const prompt = `
    Generate 5 realistic historical market scenarios for Gold (XAUUSD) covering the last year.
    For each scenario, provide:
    1. A date (YYYY-MM-DD).
    2. A realistic news headline.
    3. Sentiment (POSITIVE/NEGATIVE/NEUTRAL).
    4. Price change in USD.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              headline: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              priceChange: { type: Type.NUMBER },
            },
            required: ["id", "date", "headline", "sentiment", "priceChange"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);
    
    // Safe mapping
    return data.map((item: any) => ({
      id: item.id || crypto.randomUUID(),
      date: item.date,
      headline: item.headline,
      sentiment: item.sentiment,
      priceChange: Number(item.priceChange),
      simulatedPnL: 0
    }));

  } catch (error) {
    console.error("Backtest Generation Failed:", error);
    return [
      { id: "1", date: "2023-11-01", headline: "Fed holds rates steady (Fallback Data)", sentiment: "POSITIVE", priceChange: 15.20, simulatedPnL: 0 },
      { id: "2", date: "2023-11-15", headline: "Inflation data higher than expected (Fallback Data)", sentiment: "NEGATIVE", priceChange: -22.50, simulatedPnL: 0 }
    ];
  }
};
