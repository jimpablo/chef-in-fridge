import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API

// For Vercel/Vite deployment it uses import.meta.env.VITE_GEMINI_API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;


if (!apiKey) {
  console.error("Gemini API Key is missing! Please set VITE_GEMINI_API_KEY in your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export interface Dish {
  dishName: string;
  ingredientsUsed: string[];
  instructions: string[];
  chefTip: string;
}

export interface MealPlan {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  difficulty: string;
  tags: string[];
  flavorProfile: string;
  dishes: Dish[];
  overallChefTip: string;
}

export async function generateMealPlan(
  ingredients: string[],
  cuisineStyle: string,
  cookingTime: string
): Promise<MealPlan> {
  const prompt = `你是一位富有创造力的米其林星级大厨。我的冰箱里有以下食材：${ingredients.join(', ')}。
  请根据这些食材，为我合理安排一顿餐食。
  
  重要要求：
  - 不要强行把所有不搭的食材做成一道菜！如果食材较多或种类丰富，请合理搭配成多道菜（例如：一荤一素、一汤一主食等）。如果食材很少，可以做成一道精致的单品。
  - 菜系风格偏好：${cuisineStyle}
  - 烹饪时间偏好：${cookingTime}
  - 你可以假设我有一些基本的厨房调料（盐、黑胡椒、食用油、酱油、水、糖等）。
  - 请为这顿饭起一个诱人的主题名称（title）。
  
  请以JSON格式返回这顿饭的安排。`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "这顿饭的主题名称" },
          description: { type: Type.STRING, description: "这顿饭的整体描述" },
          prepTime: { type: Type.STRING },
          cookTime: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-4个描述这顿饭的简短标签，如'营养均衡', '快手晚餐', '丰盛大餐'"
          },
          flavorProfile: { type: Type.STRING, description: "整体口味描述，如'清淡爽口', '咸鲜下饭'" },
          dishes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dishName: { type: Type.STRING },
                ingredientsUsed: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "这道菜使用的主要食材"
                },
                instructions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "分步烹饪指南"
                },
                chefTip: { type: Type.STRING, description: "这道菜的烹饪小贴士" }
              },
              required: ["dishName", "ingredientsUsed", "instructions", "chefTip"]
            },
            description: "这顿饭包含的菜品列表（1道或多道）"
          },
          overallChefTip: { type: Type.STRING, description: "关于这顿饭整体统筹、备菜顺序或营养搭配的建议" }
        },
        required: ["title", "description", "prepTime", "cookTime", "difficulty", "tags", "flavorProfile", "dishes", "overallChefTip"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function identifyIngredientsFromImage(base64Data: string, mimeType: string): Promise<string[]> {
  const prompt = `请识别这张图片中所有可见的食物食材。
  请以JSON数组的格式返回，数组中的每一项都是一个食材的中文名称（如 ["西红柿", "鸡蛋", "牛肉"]）。
  只返回JSON数组，不要包含任何其他说明文字。`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: mimeType } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
