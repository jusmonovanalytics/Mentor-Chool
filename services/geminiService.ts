
import { GoogleGenAI, Type } from "@google/genai";
import { Customer, Product } from "../types";

export const getSalesAssistantAdvice = async (customer: Customer, products: Product[]) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return { 
      error: "API_KEY_MISSING", 
      message: "Tizimda API kaliti sozlanmagan. Vercel Dashboard orqali API_KEY qo'shing." 
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = "Siz professional savdo operatorisiz. Mijoz ma'lumotlari va mahsulotlar ro'yxati asosida eng mos 2 ta mahsulotni tanlang va o'zbek tilida savdo ssenariysi (script) hamda ekspert maslahati bering.";
  
  const prompt = `
    Mijoz: ${customer.ism} ${customer.familiya}
    Telefon: ${customer.telefon}
    Manzil: ${customer.manzil}
    Izoh: ${customer.izoh}
    
    Mavjud mahsulotlar: ${products.map(p => p.nomi).join(', ')}
    
    Javobni faqat JSON formatida qaytaring.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedProducts: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Tavsiya etilgan mahsulotlar"
            },
            script: { 
              type: Type.STRING,
              description: "O'zbek tilidagi sotuv ssenariysi"
            },
            advice: { 
              type: Type.STRING,
              description: "Operator uchun maslahat"
            }
          },
          required: ["suggestedProducts", "script", "advice"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Model bo'sh javob qaytardi.");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    const errorStr = JSON.stringify(error);
    
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      return { 
        error: "QUOTA_EXCEEDED", 
        message: "Bepul so'rovlar limiti tugadi. Iltimos, 1 daqiqa kuting yoki keyinroq urinib ko'ring (Google Gemini bepul kvotasi)." 
      };
    }
    
    if (error.message?.includes('API key not valid')) {
      return { error: "INVALID_KEY", message: "API kalitingiz noto'g'ri." };
    }
    
    return { 
      error: "API_ERROR", 
      message: "AI xizmatida kutilmagan xatolik. Iltimos, qayta urinib ko'ring." 
    };
  }
};
