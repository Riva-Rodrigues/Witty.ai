// geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBNc3oVCF4yzrX5Sve5ojEnQm21bNluTfY");

export async function getFieldGuidance(fieldName, formTitle, formDescription) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Context:
      Form Title: ${formTitle}
      Form Description: ${formDescription}

      Provide guidance for filling out the form field: ${fieldName}, in plain text under (no markup language) 100 words.
      Give a clear explanation of:
      What information should be entered in the provided field.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const plainText = response.text().replace(/\*/g, '');
    return plainText;
  } catch (error) {
    console.error('Error getting field guidance:', error);
    return "Unable to load guidance at this time. Please try again later.";
  }
}