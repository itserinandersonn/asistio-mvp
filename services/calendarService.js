// ==================== services/calendarService.js ====================
const { google } = require('googleapis');

class CalendarService {
  constructor(accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async getUpcomingEvents(maxResults = 10) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // New method to get events for a specific day
  async getEventsForDay(date, maxResults = 20) {
    try {
      // Create start and end of day timestamps
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events for day:', error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
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

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}

module.exports = CalendarService;