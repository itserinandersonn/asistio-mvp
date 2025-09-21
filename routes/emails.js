// ==================== routes/emails.js ====================
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const GmailService = require('../services/gmailService');

// Get emails with pagination
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, pageToken } = req.query;
    const gmailService = new GmailService(req.user.accessToken);
    
    const result = await gmailService.getEmails(pageToken, 50);
    
    res.json({
      success: true,
      ...result,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get specific email
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const gmailService = new GmailService(req.user.accessToken);
    const email = await gmailService.getEmail(req.params.id);
    
    res.json({
      success: true,
      email: email
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Delete email
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const gmailService = new GmailService(req.user.accessToken);
    await gmailService.deleteEmail(req.params.id);
    
    res.json({ success: true, message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Archive email
router.post('/:id/archive', isAuthenticated, async (req, res) => {
  try {
    const gmailService = new GmailService(req.user.accessToken);
    await gmailService.archiveEmail(req.params.id);
    
    res.json({ success: true, message: 'Email archived successfully' });
  } catch (error) {
    console.error('Error archiving email:', error);
    res.status(500).json({ error: 'Failed to archive email' });
  }
});

module.exports = router;