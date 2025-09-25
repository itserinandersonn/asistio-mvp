// ==================== services/gmailService.js ====================
const { google } = require('googleapis');

class GmailService {
  constructor(accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async getEmails(pageToken = null, maxResults = 50, query = null) {
    try {
      const params = {
        userId: 'me',
        maxResults: maxResults,
        pageToken: pageToken
      };
      
      if (query) {
        params.q = query;
      }

      const response = await this.gmail.users.messages.list(params);

      const messages = response.data.messages || [];
      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          const details = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          return this.parseEmailData(details.data);
        })
      );

      return {
        emails: emailDetails,
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.resultSizeEstimate
      };
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  async getEmail(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      return this.parseEmailData(response.data, true);
    } catch (error) {
      console.error('Error fetching email:', error);
      throw error;
    }
  }

  parseEmailData(emailData, includeBody = false) {
    const headers = emailData.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    let body = '';
    if (includeBody) {
      body = this.extractEmailBody(emailData.payload);
    }

    return {
      id: emailData.id,
      threadId: emailData.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      bcc: getHeader('Bcc'),
      date: getHeader('Date'),
      snippet: emailData.snippet,
      body: body,
      labels: emailData.labelIds || []
    };
  }

  extractEmailBody(payload) {
    let body = '';
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString();
          }
        } else if (part.parts) {
          body += this.extractEmailBody(part);
        }
      }
    } else if (payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    }
    
    return body;
  }

  async deleteEmail(messageId) {
    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  }

  async archiveEmail(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['INBOX']
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error archiving email:', error);
      throw error;
    }
  }

  async snoozeEmail(messageId, snoozeUntil) {
    try {
      // Convert snoozeUntil to the timestamp format Gmail expects
      const snoozeTimestamp = Math.floor(new Date(snoozeUntil).getTime() / 1000);
      
      // Remove from inbox and add snooze label
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['INBOX'],
          addLabelIds: ['SNOOZED']
        }
      });

      // Note: The actual snooze functionality in Gmail API requires special handling
      // For now, we'll simulate it by removing from inbox and adding a snooze label
      // In a production environment, you'd want to implement a scheduler to bring
      // the email back to the inbox at the specified time
      
      return { success: true };
    } catch (error) {
      console.error('Error snoozing email:', error);
      throw error;
    }
  }

  async replyToEmail(messageId, replyContent) {
    try {
      // This method would be used if implementing direct reply functionality
      // For now, we'll redirect to Gmail's compose interface
      return { success: true, redirectToGmail: true };
    } catch (error) {
      console.error('Error replying to email:', error);
      throw error;
    }
  }

  async forwardEmail(messageId, forwardContent) {
    try {
      // This method would be used if implementing direct forward functionality
      // For now, we'll redirect to Gmail's compose interface
      return { success: true, redirectToGmail: true };
    } catch (error) {
      console.error('Error forwarding email:', error);
      throw error;
    }
  }
}

module.exports = GmailService;