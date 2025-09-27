// ==================== services/calendarService.js (DEBUG VERSION) ====================
const { google } = require('googleapis');

class CalendarService {
  constructor(accessToken) {
    console.log('CalendarService: Initializing with access token:', accessToken ? 'Token present' : 'No token');
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async getUpcomingEvents(maxResults = 10) {
    try {
      console.log('CalendarService: Getting upcoming events, maxResults:', maxResults);
      
      const timeMin = new Date().toISOString();
      console.log('CalendarService: TimeMin:', timeMin);
      
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      console.log('CalendarService: API Response status:', response.status);
      console.log('CalendarService: API Response data:', JSON.stringify(response.data, null, 2));
      
      const events = response.data.items || [];
      console.log('CalendarService: Found', events.length, 'events');
      
      return events;
    } catch (error) {
      console.error('CalendarService: Error fetching upcoming events:', error.message);
      console.error('CalendarService: Error details:', error);
      throw error;
    }
  }

  // Enhanced method to get events for a specific day with better logging
  async getEventsForDay(date, maxResults = 20) {
    try {
      console.log('CalendarService: Getting events for day:', date);
      
      // Create start and end of day timestamps
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('CalendarService: Date range - Start:', startOfDay.toISOString());
      console.log('CalendarService: Date range - End:', endOfDay.toISOString());

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      console.log('CalendarService: Day events API Response status:', response.status);
      console.log('CalendarService: Day events API Response data:', JSON.stringify(response.data, null, 2));

      const events = response.data.items || [];
      console.log('CalendarService: Found', events.length, 'events for day');
      
      // Log each event for debugging
      events.forEach((event, index) => {
        console.log(`CalendarService: Event ${index + 1}:`, {
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          location: event.location
        });
      });

      return events;
    } catch (error) {
      console.error('CalendarService: Error fetching events for day:', error.message);
      console.error('CalendarService: Error details:', error);
      
      // Check if it's an authentication error
      if (error.code === 401) {
        console.error('CalendarService: Authentication error - check access token');
      }
      
      // Check if it's a scope error
      if (error.message.includes('scope')) {
        console.error('CalendarService: Scope error - check calendar permissions');
      }
      
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      console.log('CalendarService: Creating event:', eventData);
      
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'America/New_York'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'America/New_York'
        },
        attendees: eventData.attendees || [],
        location: eventData.location
      };

      console.log('CalendarService: Event object to create:', JSON.stringify(event, null, 2));

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      console.log('CalendarService: Event created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('CalendarService: Error creating event:', error.message);
      console.error('CalendarService: Error details:', error);
      throw error;
    }
  }
}

module.exports = CalendarService;