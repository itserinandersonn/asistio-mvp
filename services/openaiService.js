// ==================== services/openaiService.js ====================
const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeEmail(emailContent) {
    try {
      const prompt = `
      Analyze this email and determine if it contains:
      1. Travel booking requests or travel-related information
      2. Meeting/calendar scheduling requests
      
      Email content:
      Subject: ${emailContent.subject}
      From: ${emailContent.from}
      Body: ${emailContent.body}
      
      Respond with JSON format:
      {
        "type": "travel" | "meeting" | "other",
        "confidence": number between 0-1,
        "extractedData": {
          // For travel: destination, dates, preferences, etc.
          // For meetings: attendees, date, time, location, agenda, etc.
        }
      }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes emails to extract travel and meeting information. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing email with OpenAI:', error);
      throw error;
    }
  }

  async generateTravelOptions(travelData) {
    try {
      const prompt = `
      Based on this travel information, generate travel options:
      ${JSON.stringify(travelData)}
      
      Provide suggestions for flights, hotels, and activities in JSON format.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant. Provide realistic travel suggestions in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating travel options:', error);
      throw error;
    }
  }
}

module.exports = OpenAIService;