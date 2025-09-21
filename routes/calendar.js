// ==================== routes/calendar.js ====================
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const CalendarService = require('../services/calendarService');

// Get upcoming calendar events
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const calendarService = new CalendarService(req.user.accessToken);
    const events = await calendarService.getUpcomingEvents(10);
    
    res.json({
      success: true,
      events: events
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Create new calendar event
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const calendarService = new CalendarService(req.user.accessToken);
    const event = await calendarService.createEvent(req.body);
    
    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

module.exports = router;