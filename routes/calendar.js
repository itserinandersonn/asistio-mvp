// ==================== routes/calendar.js (DEBUG VERSION) ====================
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const CalendarService = require('../services/calendarService');

// Get upcoming calendar events
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Calendar Route: Request received');
    console.log('Calendar Route: Query params:', req.query);
    console.log('Calendar Route: User:', {
      id: req.user?.id,
      email: req.user?.email,
      hasAccessToken: !!req.user?.accessToken
    });
    
    const { date } = req.query;
    
    if (!req.user?.accessToken) {
      console.error('Calendar Route: No access token found for user');
      return res.status(401).json({ 
        success: false, 
        error: 'No access token found. Please re-authenticate.' 
      });
    }
    
    const calendarService = new CalendarService(req.user.accessToken);
    
    let events;
    if (date) {
      console.log('Calendar Route: Getting events for specific date:', date);
      // Get events for a specific day
      const targetDate = new Date(date);
      console.log('Calendar Route: Parsed target date:', targetDate);
      events = await calendarService.getEventsForDay(targetDate, 20);
    } else {
      console.log('Calendar Route: Getting upcoming events');
      // Get upcoming events
      events = await calendarService.getUpcomingEvents(10);
    }
    
    console.log('Calendar Route: Retrieved', events?.length || 0, 'events');
    
    res.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      requestedDate: date || null
    });
    
  } catch (error) {
    console.error('Calendar Route: Error fetching calendar events:', error.message);
    console.error('Calendar Route: Full error:', error);
    
    // Check for specific error types
    let errorMessage = 'Failed to fetch calendar events';
    let statusCode = 500;
    
    if (error.code === 401 || error.message.includes('Invalid Credentials')) {
      errorMessage = 'Authentication failed. Please re-login.';
      statusCode = 401;
    } else if (error.message.includes('insufficient')) {
      errorMessage = 'Insufficient permissions to access calendar. Please re-authorize.';
      statusCode = 403;
    } else if (error.code === 403) {
      errorMessage = 'Calendar access forbidden. Check API quotas or permissions.';
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: error.message
    });
  }
});

// Create new calendar event
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Calendar Route: Create event request received');
    console.log('Calendar Route: Event data:', req.body);
    
    if (!req.user?.accessToken) {
      console.error('Calendar Route: No access token found for user');
      return res.status(401).json({ 
        success: false, 
        error: 'No access token found. Please re-authenticate.' 
      });
    }
    
    const calendarService = new CalendarService(req.user.accessToken);
    const event = await calendarService.createEvent(req.body);
    
    console.log('Calendar Route: Event created successfully');
    
    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('Calendar Route: Error creating calendar event:', error.message);
    console.error('Calendar Route: Full error:', error);
    
    let errorMessage = 'Failed to create calendar event';
    let statusCode = 500;
    
    if (error.code === 401) {
      errorMessage = 'Authentication failed. Please re-login.';
      statusCode = 401;
    } else if (error.code === 403) {
      errorMessage = 'Insufficient permissions to create events.';
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: error.message
    });
  }
});

// Add this to your routes/calendar.js file as a test endpoint

// Test endpoint to diagnose calendar issues
router.get('/test', isAuthenticated, async (req, res) => {
  console.log('=== CALENDAR API DEBUG TEST ===');
  
  try {
    // Check user authentication
    console.log('1. User Check:');
    console.log('   - User ID:', req.user?.id);
    console.log('   - User Email:', req.user?.email);
    console.log('   - Has Access Token:', !!req.user?.accessToken);
    console.log('   - Access Token (first 20 chars):', req.user?.accessToken?.substring(0, 20) + '...');
    
    if (!req.user?.accessToken) {
      return res.json({
        success: false,
        error: 'No access token found',
        step: 'authentication'
      });
    }

    // Test calendar service initialization
    console.log('2. Calendar Service Initialization:');
    const calendarService = new CalendarService(req.user.accessToken);
    console.log('   - Service created successfully');

    // Test basic API call - list calendars first
    console.log('3. Testing Calendar List API:');
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    try {
      const calendarListResponse = await calendar.calendarList.list();
      console.log('   - Calendar List API successful');
      console.log('   - Found calendars:', calendarListResponse.data.items?.length || 0);
      
      calendarListResponse.data.items?.forEach((cal, index) => {
        console.log(`   - Calendar ${index + 1}:`, {
          id: cal.id,
          summary: cal.summary,
          primary: cal.primary,
          accessRole: cal.accessRole
        });
      });
    } catch (calError) {
      console.error('   - Calendar List API failed:', calError.message);
      return res.json({
        success: false,
        error: 'Calendar List API failed',
        details: calError.message,
        step: 'calendar_list'
      });
    }

    // Test events API with a simple call
    console.log('4. Testing Events API (simple):');
    try {
      const simpleEventsResponse = await calendar.events.list({
        calendarId: 'primary',
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      console.log('   - Simple Events API successful');
      console.log('   - Found events:', simpleEventsResponse.data.items?.length || 0);
      
      simpleEventsResponse.data.items?.forEach((event, index) => {
        console.log(`   - Event ${index + 1}:`, {
          id: event.id,
          summary: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date
        });
      });
    } catch (eventsError) {
      console.error('   - Simple Events API failed:', eventsError.message);
      return res.json({
        success: false,
        error: 'Events API failed',
        details: eventsError.message,
        step: 'events_simple'
      });
    }

    // Test events API with date range (today)
    console.log('5. Testing Events API (today):');
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('   - Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

      const todayEventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      console.log('   - Today Events API successful');
      console.log('   - Found today events:', todayEventsResponse.data.items?.length || 0);
      
    } catch (todayError) {
      console.error('   - Today Events API failed:', todayError.message);
      return res.json({
        success: false,
        error: 'Today Events API failed',
        details: todayError.message,
        step: 'events_today'
      });
    }

    // Test our service method
    console.log('6. Testing CalendarService methods:');
    try {
      const serviceEvents = await calendarService.getUpcomingEvents(5);
      console.log('   - CalendarService.getUpcomingEvents successful');
      console.log('   - Service found events:', serviceEvents?.length || 0);
      
      const todayServiceEvents = await calendarService.getEventsForDay(new Date(), 10);
      console.log('   - CalendarService.getEventsForDay successful');
      console.log('   - Service found today events:', todayServiceEvents?.length || 0);
      
    } catch (serviceError) {
      console.error('   - CalendarService methods failed:', serviceError.message);
      return res.json({
        success: false,
        error: 'CalendarService failed',
        details: serviceError.message,
        step: 'calendar_service'
      });
    }

    console.log('=== ALL TESTS PASSED ===');
    
    res.json({
      success: true,
      message: 'All calendar API tests passed',
      tests: [
        'User authentication',
        'Calendar service initialization',
        'Calendar list API',
        'Simple events API',
        'Today events API',
        'Calendar service methods'
      ]
    });

  } catch (error) {
    console.error('Calendar Test: Unexpected error:', error);
    res.json({
      success: false,
      error: 'Unexpected error during testing',
      details: error.message,
      step: 'unexpected'
    });
  }
});

module.exports = router;