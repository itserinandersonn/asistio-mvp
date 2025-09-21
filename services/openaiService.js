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
        const extractMeetingDetails = emailContent.extractMeetingDetails || false;
        
        let prompt = `
        Analyze this email and determine if it contains:
        1. Travel booking requests or travel-related information
        2. Meeting/calendar scheduling requests
        
        Email content:
        Subject: ${emailContent.email?.subject || emailContent.subject}
        From: ${emailContent.email?.from || emailContent.from}
        To: ${emailContent.email?.to || emailContent.to}
        Body: ${emailContent.email?.body || emailContent.body}
        `;

        if (extractMeetingDetails) {
            prompt += `
            
            If this email contains meeting information, please extract:
            - Meeting title/subject
            - Proposed date and time (if mentioned)
            - Location (meeting room, address, or if it should be virtual)
            - Duration (if specified)
            - Any specific agenda or meeting purpose
            
            For dates, look for patterns like:
            - "tomorrow at 2pm"
            - "Friday the 15th"
            - "next Tuesday"
            - Specific dates and times
            
            Convert relative dates to actual dates based on today being ${new Date().toDateString()}.
            `;
        }

        prompt += `
        Respond with JSON format:
        {
            "type": "travel" | "meeting" | "other",
            "confidence": number between 0-1,
            "extractedData": {
                "summary": "meeting title",
                "startTime": "ISO date string",
                "endTime": "ISO date string",
                "location": "location or 'Google Meet'",
                "description": "meeting description",
                "attendees": ["email1", "email2"]
            }
        }
        `;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI assistant that analyzes emails to extract travel and meeting information. Always respond with valid JSON. Be smart about extracting meeting details from natural language.'
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