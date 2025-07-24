import { GoogleGenAI } from "@google/genai";

// Optional: Load env variables (only if not already loaded elsewhere)
import dotenv from "dotenv";
dotenv.config();

export const generateRecomendation = async (req, res) => {
  try {
    // Log for debugging
    console.log("🧠 Received request to generate recommendations");

    // Ensure the API key is loaded
    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
      console.error("❌ Missing GEMINI_KEY in environment variables");
      return res.status(500).json({
        status: "error",
        message: "Server misconfiguration: Missing GEMINI_KEY",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userInfo = req.body;

    const prompt = `You are being used to generate some 4-6 healthy leetcode recommendations for user based on their data which is being given to you below. Make the responses good and based on the data. The data is: ${JSON.stringify(
      userInfo
    )} which is a stringyfied object with details fetched from user's leetcode profile. Make the responses without any bold,italic syling. Number each point and add them in seperate lines. You exactly shouldnt only recommend questions to be solved but also general tips. And just get straight into the point with points. No need to say 'Here are tips. Keep the points short and readable so it can get covered in 2 lines max each. If you are trying to generate bigger points, reduce their number to 2-3. make sure total words dont go above 600`;

    // Log before hitting API
    console.log("📨 Sending prompt to Gemini API...");

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    console.log("✅ Gemini response received");

    const text = result.text;
    const data = { status: "success", message: text };

    res.send(data);
  } catch (err) {
    console.error("❌ Error in generateRecomendation controller:");
    console.error(err);

    res.status(500).json({
      status: "error",
      message: "Failed to generate recommendations",
      error: err.message || err.toString(),
    });
  }
};
