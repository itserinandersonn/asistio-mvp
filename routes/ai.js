// ==================== routes/ai.js ====================
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const OpenAIService = require('../services/openaiService');
const CalendarService = require('../services/calendarService');

// Analyze email with AI
router.post('/analyze-email', isAuthenticated, async (req, res) => {
  try {
    const openaiService = new OpenAIService();
    const analysis = await openaiService.analyzeEmail(req.body.email);
    
    // If it's a meeting, automatically create calendar event
    if (analysis.type === 'meeting' && analysis.confidence > 0.7) {
      try {
        const calendarService = new CalendarService(req.user.accessToken);
        const eventData = {
          summary: analysis.extractedData.summary || 'Meeting',
          description: analysis.extractedData.description || '',
          startTime: analysis.extractedData.startTime,
          endTime: analysis.extractedData.endTime,
          attendees: analysis.extractedData.attendees || [],
          location: analysis.extractedData.location || ''
        };
        
        const event = await calendarService.createEvent(eventData);
        analysis.createdEvent = event;
      } catch (calendarError) {
        console.error('Error creating calendar event:', calendarError);
      }
    }
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error analyzing email:', error);
    res.status(500).json({ error: 'Failed to analyze email' });
  }
});

// Generate travel options
router.post('/generate-travel', isAuthenticated, async (req, res) => {
  try {
    const openaiService = new OpenAIService();
    const travelOptions = await openaiService.generateTravelOptions(req.body.travelData);
    
    res.json({
      success: true,
      travelOptions: travelOptions
    });
  } catch (error) {
    console.error('Error generating travel options:', error);
    res.status(500).json({ error: 'Failed to generate travel options' });
  }
});

module.exports = router;