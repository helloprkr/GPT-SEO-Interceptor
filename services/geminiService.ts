import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateContentStrategy = async (keyword: string, queries: string[]): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    You are an elite SEO Strategist. 
    
    I have reverse-engineered ChatGPT's internal search logic for the keyword: "${keyword}".
    To answer this request, ChatGPT performed the following REAL search queries (Search Grounding):
    ${JSON.stringify(queries, null, 2)}
    
    Based on these actual search intents, generate a high-ranking Content Outline (H2 and H3 structure).
    
    Rules:
    1. Analyze why the AI searched for these specific terms.
    2. Create a content skeleton that covers these gaps.
    3. Return ONLY the content outline in Markdown format.
    4. Do not include introductory text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Failed to generate strategy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content strategy using Gemini.");
  }
};