// ==================== script.js ====================

class ExecutiveAssistant {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.currentFolder = 'inbox'; // Add missing property
        this.emails = [];
        this.currentEmailPage = 1;
        this.totalEmailPages = 1;
        this.pageToken = null;
        this.currentCalendarView = 'list';
        this.currentCalendarDate = new Date();
        this.currentDashboardDate = new Date();
        this.currentEvents = [];
        this.currentEmailId = null;
        this.currentEmail = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login button
        document.getElementById('google-login-btn').addEventListener('click', () => {
            window.location.href = '/auth/google';
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Sidebar navigation
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                this.navigateToPage(page);
            });
        });

        // View all links in dashboard
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Folder navigation in dashboard
        document.querySelectorAll('.folder-item').forEach(folder => {
            folder.addEventListener('click', (e) => {
                const folderType = e.target.closest('.folder-item').dataset.folder;
                this.selectFolder(folderType);
            });
        });

        // Label filtering in dashboard
        document.querySelectorAll('.label-item').forEach(label => {
            label.addEventListener('click', (e) => {
                const labelText = e.target.closest('.label-item').textContent.trim();
                this.filterByLabel(labelText);
            });
        });

        // Back to email list button
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showEmailList();
        });

        // Email detail action buttons
        document.getElementById('detail-delete-btn').addEventListener('click', () => {
            this.deleteCurrentEmail();
        });

        document.getElementById('detail-archive-btn').addEventListener('click', () => {
            this.archiveCurrentEmail();
        });

        document.getElementById('detail-schedule-meeting-btn').addEventListener('click', () => {
            this.scheduleFromEmail();
        });

        document.getElementById('detail-reply-btn').addEventListener('click', () => {
            this.replyToEmail();
        });

        document.getElementById('detail-forward-btn').addEventListener('click', () => {
            this.forwardEmail();
        });

        // Dashboard calendar day navigation
        document.getElementById('prev-day-btn').addEventListener('click', () => {
            this.navigateDashboardDay(-1);
        });

        document.getElementById('next-day-btn').addEventListener('click', () => {
            this.navigateDashboardDay(1);
        });

        // Email search
        document.getElementById('email-search').addEventListener('input', (e) => {
            this.searchEmails(e.target.value);
        });

        // Refresh emails button
        document.getElementById('refresh-emails').addEventListener('click', () => {
            this.loadEmails(1);
        });

        // Calendar view controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('button').dataset.view;
                this.changeCalendarView(view);
            });
        });

        // Calendar navigation
        document.getElementById('calendar-prev').addEventListener('click', () => {
            this.navigateCalendar(-1);
        });

        document.getElementById('calendar-next').addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        // Snooze modal
        this.setupSnoozeModal();
    }

    setupSnoozeModal() {
        // Snooze modal close
        document.querySelector('#snooze-modal .modal-close').addEventListener('click', () => {
            this.closeSnoozeModal();
        });

        // Snooze option buttons
        document.querySelectorAll('.snooze-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const hours = parseInt(e.target.dataset.hours);
                this.snoozeEmail(hours);
            });
        });

        // Custom snooze
        document.getElementById('custom-snooze-btn').addEventListener('click', () => {
            const customTime = document.getElementById('custom-snooze-time').value;
            if (customTime) {
                const snoozeDate = new Date(customTime);
                const hoursFromNow = (snoozeDate - new Date()) / (1000 * 60 * 60);
                this.snoozeEmail(hoursFromNow, snoozeDate);
            }
        });

        // Close modal when clicking outside
        document.getElementById('snooze-modal').addEventListener('click', (e) => {
            if (e.target.id === 'snooze-modal') {
                this.closeSnoozeModal();
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/user');
            const data = await response.json();
            
            if (data.success && data.user) {
                this.currentUser = data.user;
                this.showApplication();
                await this.loadDashboardData();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    showApplication() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        // Update welcome message and user info
        document.getElementById('welcome-text').textContent = `Welcome, ${this.currentUser.firstName}!`;
        document.getElementById('user-name').textContent = this.currentUser.displayName;
        document.getElementById('user-avatar').src = this.currentUser.photo;
        
        // Update profile page
        document.getElementById('profile-name').textContent = this.currentUser.displayName;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('profile-avatar').src = this.currentUser.photo;
    }

    async logout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.showLoginScreen();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    navigateToPage(pageName) {
        // Update active sidebar link
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(`${pageName}-page`).classList.add('active');
        this.currentPage = pageName;

        // Reset email view when navigating to emails page
        if (pageName === 'emails') {
            this.showEmailList();
        }

        // Load page-specific data
        this.loadPageData(pageName);
    }

    async loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'emails':
                await this.loadEmails(1);
                break;
            case 'calendar':
                await this.loadCalendarEvents();
                break;
            case 'travel':
                await this.loadTravelData();
                break;
        }
    }

    // Folder and label management
    async selectFolder(folderType) {
        // Update active folder state
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folderType}"]`).classList.add('active');

        this.currentFolder = folderType;
        await this.loadEmailsForFolder(folderType);
    }

    async loadEmailsForFolder(folderType) {
        try {
            this.showLoading('dashboard-emails-list', 'Loading emails...');
            
            let query = '';
            switch (folderType) {
                case 'inbox':
                    query = 'in:inbox';
                    break;
                case 'sent':
                    query = 'in:sent';
                    break;
                case 'drafts':
                    query = 'in:drafts';
                    break;
                case 'archive':
                    query = 'in:all -in:inbox -in:sent -in:drafts -in:trash';
                    break;
                case 'trash':
                    query = 'in:trash';
                    break;
                default:
                    query = 'in:inbox';
            }

            const response = await fetch(`/api/emails?q=${encodeURIComponent(query)}&maxResults=20`);
            const data = await response.json();
            
            if (data.success) {
                this.renderDashboardEmails(data.emails);
                this.updateFolderCounts(data.totalResults);
            }
        } catch (error) {
            console.error('Error loading folder emails:', error);
            document.getElementById('dashboard-emails-list').innerHTML = '<div class="no-data">Failed to load emails</div>';
        }
    }

    async filterByLabel(labelName) {
        try {
            this.showLoading('dashboard-emails-list', 'Loading emails...');
            
            // Map label names to Gmail label queries
            let labelQuery = '';
            switch (labelName.toLowerCase()) {
                case 'important':
                    labelQuery = 'is:important';
                    break;
                case 'work':
                    labelQuery = 'label:work';
                    break;
                case 'personal':
                    labelQuery = 'label:personal';
                    break;
                case 'travel':
                    labelQuery = 'label:travel';
                    break;
                default:
                    labelQuery = `label:${labelName.toLowerCase()}`;
            }

            const response = await fetch(`/api/emails?q=${encodeURIComponent(labelQuery)}&maxResults=20`);
            const data = await response.json();
            
            if (data.success) {
                this.renderDashboardEmails(data.emails);
            }
        } catch (error) {
            console.error('Error filtering emails by label:', error);
            document.getElementById('dashboard-emails-list').innerHTML = '<div class="no-data">Failed to load emails</div>';
        }
    }

    updateFolderCounts(totalCount) {
        // Update the folder count display (this would ideally come from the API)
        const currentFolder = document.querySelector('.folder-item.active .folder-count');
        if (currentFolder && totalCount) {
            currentFolder.textContent = Math.min(totalCount, 99); // Limit display to 99+
        }
    }

    // Dashboard calendar day navigation
    navigateDashboardDay(direction) {
        this.currentDashboardDate.setDate(this.currentDashboardDate.getDate() + direction);
        this.updateDashboardDayDisplay();
        this.loadDashboardCalendar(); // This will now load events for the new date
    }

    updateDashboardDayDisplay() {
        const today = new Date();
        const isToday = this.currentDashboardDate.toDateString() === today.toDateString();
        const isYesterday = this.currentDashboardDate.toDateString() === new Date(today.getTime() - 24*60*60*1000).toDateString();
        const isTomorrow = this.currentDashboardDate.toDateString() === new Date(today.getTime() + 24*60*60*1000).toDateString();
        
        let displayText;
        if (isToday) {
            displayText = 'Today';
        } else if (isYesterday) {
            displayText = 'Yesterday';
        } else if (isTomorrow) {
            displayText = 'Tomorrow';
        } else {
            displayText = this.currentDashboardDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }
        
        document.getElementById('current-day-display').textContent = displayText;
    }

    // Dashboard data loading methods
    async loadDashboardData() {
        await Promise.all([
            this.loadDashboardEmails(),
            this.loadDashboardCalendar(),
            this.loadDashboardTravel()
        ]);
        this.updateDashboardDayDisplay();
    }

    async loadDashboardEmails() {
        try {
            // Load emails based on current folder selection or default to inbox
            const currentFolder = this.currentFolder || 'inbox';
            await this.loadEmailsForFolder(currentFolder);
        } catch (error) {
            console.error('Error loading dashboard emails:', error);
            document.getElementById('dashboard-emails-list').innerHTML = '<div class="no-data">Failed to load emails</div>';
        }
    }

    renderDashboardEmails(emails) {
        const container = document.getElementById('dashboard-emails-list');
        
        if (!emails || emails.length === 0) {
            container.innerHTML = '<div class="no-data">No emails found</div>';
            return;
        }

        container.innerHTML = emails.map((email, index) => `
            <div class="dashboard-email-item ${index === 0 ? 'selected' : ''}" onclick="app.selectDashboardEmail('${email.id}', this)">
                <div class="dashboard-email-time">${this.formatDate(email.date)}</div>
                <div class="dashboard-email-sender">${this.extractEmailAddress(email.from)}</div>
                <div class="dashboard-email-subject">${email.subject || 'No Subject'}</div>
                <div class="dashboard-email-preview">${email.snippet || 'No preview available'}</div>
            </div>
        `).join('');

        // Auto-select first email
        if (emails.length > 0) {
            this.selectDashboardEmail(emails[0].id, container.querySelector('.dashboard-email-item'));
        }
    }

    async selectDashboardEmail(emailId, element) {
        // Update selected state
        document.querySelectorAll('.dashboard-email-item').forEach(item => {
            item.classList.remove('selected');
        });
        element.classList.add('selected');

        // Load and show email details
        try {
            const response = await fetch(`/api/emails/${emailId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showDashboardEmailDetail(data.email);
                this.currentEmail = data.email;
                this.currentEmailId = emailId;
            }
        } catch (error) {
            console.error('Error loading email detail:', error);
        }
    }

    showDashboardEmailDetail(email) {
        const container = document.getElementById('dashboard-email-detail');
        
        container.innerHTML = `
            <div class="email-detail-content active">
                <div class="detail-header">
                    <div class="detail-subject">${email.subject || 'No Subject'}</div>
                    <div class="detail-meta">
                        <div class="detail-meta-row">
                            <span class="detail-meta-label">From:</span>
                            <span class="detail-meta-value">${email.from}</span>
                        </div>
                        <div class="detail-meta-row">
                            <span class="detail-meta-label">To:</span>
                            <span class="detail-meta-value">${email.to}</span>
                        </div>
                        <div class="detail-meta-row">
                            <span class="detail-meta-label">Date:</span>
                            <span class="detail-meta-value">${this.formatDate(email.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-body">
                    ${this.sanitizeHTML(email.body)}
                </div>
                <div class="detail-actions">
                    <div class="action-row">
                        <button class="btn btn-primary btn-sm" onclick="app.navigateToPage('emails')">
                            <i class="fas fa-external-link-alt"></i> Open
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="app.replyToEmail()">
                            <i class="fas fa-reply"></i> Reply
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="app.forwardEmail()">
                            <i class="fas fa-share"></i> Forward
                        </button>
                    </div>
                    <div class="action-row">
                        <button class="btn btn-success btn-sm" onclick="app.scheduleFromEmail()">
                            <i class="fas fa-calendar-plus"></i> Schedule Meeting
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.archiveCurrentEmail()">
                            <i class="fas fa-archive"></i> Archive
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="app.showSnoozeModal()">
                            <i class="fas fa-clock"></i> Snooze
                        </button>
                    </div>
                    <div class="action-row">
                        <button class="btn btn-danger btn-sm" onclick="app.deleteCurrentEmail()">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadDashboardCalendar() {
        try {
            this.showLoading('dashboard-calendar', 'Loading events...');
            
            // Format the date for the API call
            const dateParam = this.currentDashboardDate.toISOString().split('T')[0];
            const response = await fetch(`/api/calendar?date=${dateParam}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderDashboardCalendar(data.events);
                this.currentEvents = data.events;
            } else {
                document.getElementById('dashboard-calendar').innerHTML = '<div class="no-data">Failed to load events</div>';
            }
        } catch (error) {
            console.error('Error loading dashboard calendar:', error);
            document.getElementById('dashboard-calendar').innerHTML = '<div class="no-data">Failed to load events</div>';
        }
    }

    renderDashboardCalendar(events) {
        const container = document.getElementById('dashboard-calendar');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="no-data">No events for this day</div>';
            return;
        }

        // Sort events by start time
        const sortedEvents = events.sort((a, b) => {
            const timeA = new Date(a.start.dateTime || a.start.date);
            const timeB = new Date(b.start.dateTime || b.start.date);
            return timeA - timeB;
        });

        container.innerHTML = sortedEvents.map((event, index) => {
            const startTime = this.formatEventTime(event.start);
            const endTime = event.end ? this.formatEventTime(event.end) : null;
            const timeDisplay = endTime && event.start.dateTime ? 
                `${startTime} - ${endTime.split(' ').pop()}` : startTime;
            
            return `
                <div class="calendar-event-compact" onclick="app.showEventDetails('${event.id}', ${index})" title="Click to view details">
                    <div class="event-time-compact">${timeDisplay}</div>
                    <div class="event-title-compact">${event.summary || 'No Title'}</div>
                    ${event.location ? `<div class="event-location-compact">${event.location}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    showEventDetails(eventId, eventIndex) {
        if (!this.currentEvents || !this.currentEvents[eventIndex]) return;
        
        const event = this.currentEvents[eventIndex];
        const startTime = new Date(event.start.dateTime || event.start.date);
        const endTime = event.end ? new Date(event.end.dateTime || event.end.date) : null;
        
        let timeString = startTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: event.start.dateTime ? 'numeric' : undefined,
            minute: event.start.dateTime ? '2-digit' : undefined,
            hour12: event.start.dateTime ? true : undefined
        });
        
        if (endTime && event.start.dateTime) {
            timeString += ` - ${endTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })}`;
        }
        
        const eventDetails = `
            <strong>${event.summary || 'No Title'}</strong><br>
            📅 ${timeString}<br>
            ${event.location ? `📍 ${event.location}<br>` : ''}
            ${event.description ? `<br>${event.description}` : ''}
            ${event.attendees && event.attendees.length ? `<br><br>👥 ${event.attendees.length} attendee(s)` : ''}
        `;
        
        this.showNotification(eventDetails, 'info');
    }

    async loadDashboardTravel() {
        const container = document.getElementById('dashboard-travel');
        container.innerHTML = '<div class="no-data">No upcoming travel</div>';
    }

    // Email management functions
    async replyToEmail() {
        if (!this.currentEmail) return;
        
        try {
            this.showLoadingOverlay('Opening Gmail to reply...');
            
            // Create Gmail compose URL with reply parameters
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(this.currentEmail.from)}&su=${encodeURIComponent('Re: ' + this.currentEmail.subject)}&tf=1`;
            
            // Open in new tab
            window.open(gmailUrl, '_blank');
            
            this.showNotification('Gmail opened in new tab for reply', 'success');
        } catch (error) {
            console.error('Error opening reply:', error);
            this.showNotification('Failed to open reply', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async forwardEmail() {
        if (!this.currentEmail) return;
        
        try {
            this.showLoadingOverlay('Opening Gmail to forward...');
            
            // Create Gmail compose URL with forward parameters
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Fwd: ' + this.currentEmail.subject)}&body=${encodeURIComponent('---------- Forwarded message ---------\\nFrom: ' + this.currentEmail.from + '\\nSubject: ' + this.currentEmail.subject)}&tf=1`;
            
            // Open in new tab
            window.open(gmailUrl, '_blank');
            
            this.showNotification('Gmail opened in new tab for forwarding', 'success');
        } catch (error) {
            console.error('Error opening forward:', error);
            this.showNotification('Failed to open forward', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    showSnoozeModal() {
        document.getElementById('snooze-modal').style.display = 'flex';
        
        // Set default custom snooze time to tomorrow at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('custom-snooze-time').value = tomorrow.toISOString().slice(0, 16);
    }

    closeSnoozeModal() {
        document.getElementById('snooze-modal').style.display = 'none';
    }

    async snoozeEmail(hours, customDate = null) {
        if (!this.currentEmailId) return;
        
        try {
            this.showLoadingOverlay('Snoozing email...');
            
            const snoozeUntil = customDate || new Date(Date.now() + hours * 60 * 60 * 1000);
            
            const response = await fetch(`/api/emails/${this.currentEmailId}/snooze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeSnoozeModal();
                // Clear the email detail view
                document.getElementById('dashboard-email-detail').innerHTML = `
                    <div class="no-email-selected">
                        <i class="fas fa-envelope-open"></i>
                        <p>Select an email to view details</p>
                    </div>
                `;
                
                // Reload the current folder's emails
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardEmails();
                } else {
                    await this.loadEmails(this.currentEmailPage);
                }
                
                this.showNotification(`Email snoozed until ${snoozeUntil.toLocaleString()}`, 'success');
                this.currentEmail = null;
                this.currentEmailId = null;
            }
        } catch (error) {
            console.error('Error snoozing email:', error);
            this.showNotification('Failed to snooze email', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async deleteCurrentEmail() {
        if (!this.currentEmailId) return;
        
        if (!confirm('Are you sure you want to delete this email?')) {
            return;
        }
        
        try {
            this.showLoadingOverlay('Deleting email...');
            
            const response = await fetch(`/api/emails/${this.currentEmailId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear the email detail view
                document.getElementById('dashboard-email-detail').innerHTML = `
                    <div class="no-email-selected">
                        <i class="fas fa-envelope-open"></i>
                        <p>Select an email to view details</p>
                    </div>
                `;
                
                // Reload the current folder's emails
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardEmails();
                } else {
                    this.showEmailList();
                    await this.loadEmails(this.currentEmailPage);
                }
                
                this.showNotification('Email deleted successfully', 'success');
                this.currentEmail = null;
                this.currentEmailId = null;
            }
        } catch (error) {
            console.error('Error deleting email:', error);
            this.showNotification('Failed to delete email', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async archiveCurrentEmail() {
        if (!this.currentEmailId) return;
        
        try {
            this.showLoadingOverlay('Archiving email...');
            
            const response = await fetch(`/api/emails/${this.currentEmailId}/archive`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear the email detail view
                document.getElementById('dashboard-email-detail').innerHTML = `
                    <div class="no-email-selected">
                        <i class="fas fa-envelope-open"></i>
                        <p>Select an email to view details</p>
                    </div>
                `;
                
                // Reload the current folder's emails
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardEmails();
                } else {
                    this.showEmailList();
                    await this.loadEmails(this.currentEmailPage);
                }
                
                this.showNotification('Email archived successfully', 'success');
                this.currentEmail = null;
                this.currentEmailId = null;
            }
        } catch (error) {
            console.error('Error archiving email:', error);
            this.showNotification('Failed to archive email', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async scheduleFromEmail() {
        try {
            this.showLoadingOverlay('AI analyzing email for meeting details...');
            
            const response = await fetch('/api/ai/analyze-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: this.currentEmail,
                    extractMeetingDetails: true
                })
            });

            const data = await response.json();
            this.hideLoadingOverlay();
            
            if (data.success && data.analysis) {
                this.showScheduleMeetingPopup(this.currentEmail, data.analysis);
            } else {
                this.showScheduleMeetingPopup(this.currentEmail, {
                    extractedData: {
                        summary: this.extractMeetingTitle(this.currentEmail),
                        location: 'Google Meet',
                        description: `Meeting scheduled from email: ${this.currentEmail.subject}`
                    }
                });
            }
        } catch (error) {
            console.error('Error analyzing email for meeting:', error);
            this.hideLoadingOverlay();
            
            this.showScheduleMeetingPopup(this.currentEmail, {
                extractedData: {
                    summary: this.extractMeetingTitle(this.currentEmail),
                    location: 'Google Meet',
                    description: `Meeting scheduled from email: ${this.currentEmail.subject}`
                }
            });
        }
    }

    // Additional methods that might be missing - adding the rest of the functionality

    async loadEmails(page = 1) {
        try {
            this.showLoading('emails-list', 'Loading emails...');
            
            const response = await fetch(`/api/emails?page=${page}&maxResults=20`);
            const data = await response.json();
            
            if (data.success) {
                this.emails = data.emails;
                this.renderEmails(data.emails);
                this.renderPagination(data.currentPage, Math.ceil(data.totalResults / 20));
                this.currentEmailPage = page;
            }
        } catch (error) {
            console.error('Error loading emails:', error);
            document.getElementById('emails-list').innerHTML = '<div class="no-data">Failed to load emails</div>';
        }
    }

    renderEmails(emails) {
        const container = document.getElementById('emails-list');
        
        if (!emails || emails.length === 0) {
            container.innerHTML = '<div class="no-data">No emails found</div>';
            return;
        }

        container.innerHTML = emails.map(email => `
            <div class="email-item" onclick="app.showEmailDetail('${email.id}')">
                <div class="email-sender">${this.extractEmailAddress(email.from)}</div>
                <div class="email-content">
                    <div class="email-subject">${email.subject || 'No Subject'}</div>
                    <div class="email-preview">${email.snippet || 'No preview available'}</div>
                </div>
                <div class="email-time">${this.formatDate(email.date)}</div>
            </div>
        `).join('');
    }

    async showEmailDetail(emailId) {
        try {
            const response = await fetch(`/api/emails/${emailId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentEmail = data.email;
                this.currentEmailId = emailId;
                this.displayEmailDetail(data.email);
                this.showEmailDetailView();
            }
        } catch (error) {
            console.error('Error loading email detail:', error);
        }
    }

    displayEmailDetail(email) {
        document.getElementById('detail-email-subject').textContent = email.subject || 'No Subject';
        document.getElementById('detail-email-from').textContent = email.from;
        document.getElementById('detail-email-to').textContent = email.to;
        document.getElementById('detail-email-date').textContent = this.formatDate(email.date);
        document.getElementById('detail-email-body').innerHTML = this.sanitizeHTML(email.body);
        
        // Show CC if exists
        if (email.cc) {
            document.getElementById('detail-email-cc').textContent = email.cc;
            document.getElementById('detail-email-cc-row').style.display = 'flex';
        } else {
            document.getElementById('detail-email-cc-row').style.display = 'none';
        }
    }

    showEmailDetailView() {
        document.getElementById('email-list-view').style.display = 'none';
        document.getElementById('email-detail-view').style.display = 'block';
        document.getElementById('back-to-list').style.display = 'inline-flex';
    }

    showEmailList() {
        document.getElementById('email-list-view').style.display = 'block';
        document.getElementById('email-detail-view').style.display = 'none';
        document.getElementById('back-to-list').style.display = 'none';
    }

    renderPagination(currentPage, totalPages) {
        const container = document.getElementById('email-pagination');
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="pagination">';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="app.loadEmails(${currentPage - 1})">Previous</button>`;
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="app.loadEmails(${i})">${i}</button>`;
        }
        
        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="app.loadEmails(${currentPage + 1})">Next</button>`;
        
        html += '</div>';
        container.innerHTML = html;
    }

    async searchEmails(query) {
        if (query.length < 2) {
            await this.loadEmails(1);
            return;
        }

        try {
            this.showLoading('emails-list', 'Searching emails...');
            
            const response = await fetch(`/api/emails?q=${encodeURIComponent(query)}&maxResults=20`);
            const data = await response.json();
            
            if (data.success) {
                this.renderEmails(data.emails);
                document.getElementById('email-pagination').innerHTML = '';
            }
        } catch (error) {
            console.error('Error searching emails:', error);
            document.getElementById('emails-list').innerHTML = '<div class="no-data">Search failed</div>';
        }
    }

    async loadCalendarEvents() {
        try {
            this.showLoading('calendar-events', 'Loading calendar events...');
            
            const response = await fetch('/api/calendar');
            const data = await response.json();
            
            if (data.success) {
                this.renderCalendarEvents(data.events);
            }
        } catch (error) {
            console.error('Error loading calendar events:', error);
            document.getElementById('calendar-events').innerHTML = '<div class="no-data">Failed to load events</div>';
        }
    }

    renderCalendarEvents(events) {
        const container = document.getElementById('calendar-events');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="no-data">No upcoming events</div>';
            return;
        }

        const eventsHtml = events.map(event => {
            const startTime = new Date(event.start.dateTime || event.start.date);
            const endTime = event.end ? new Date(event.end.dateTime || event.end.date) : null;
            
            let timeDisplay;
            if (event.start.date && !event.start.dateTime) {
                // All day event
                timeDisplay = startTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                // Time specific event
                timeDisplay = startTime.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                
                if (endTime) {
                    timeDisplay += ` - ${endTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}`;
                }
            }
            
            return `
                <div class="calendar-event">
                    <div class="event-time">${timeDisplay}</div>
                    <div class="event-title">${event.summary || 'No Title'}</div>
                    ${event.location ? `<div class="event-location">📍 ${event.location}</div>` : ''}
                    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="calendar-list-view">${eventsHtml}</div>`;
    }

    changeCalendarView(view) {
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.currentCalendarView = view;
        this.renderCalendarInView(view);
    }

    renderCalendarInView(view) {
        // This would render the calendar in different views (day, week, month)
        // For now, we'll just show the list view
        this.loadCalendarEvents();
    }

    navigateCalendar(direction) {
        const currentDate = this.currentCalendarDate;
        
        switch (this.currentCalendarView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + direction);
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() + (direction * 7));
                break;
            case 'month':
                currentDate.setMonth(currentDate.getMonth() + direction);
                break;
            default:
                // For list view, just reload
                break;
        }
        
        this.updateCalendarTitle();
        this.loadCalendarEvents();
    }

    updateCalendarTitle() {
        const titleElement = document.getElementById('calendar-title');
        const currentDate = this.currentCalendarDate;
        
        switch (this.currentCalendarView) {
            case 'day':
                titleElement.textContent = currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                break;
            case 'week':
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                titleElement.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                break;
            case 'month':
                titleElement.textContent = currentDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                });
                break;
            default:
                titleElement.textContent = 'Upcoming Events';
        }
    }

    async loadTravelData() {
        const container = document.getElementById('travel-options');
        container.innerHTML = '<div class="no-data">No travel information available</div>';
    }

    extractMeetingTitle(email) {
        if (!email) return 'Meeting';
        
        const subject = email.subject || 'Meeting';
        
        // Remove common email prefixes
        return subject
            .replace(/^(re:|fwd?:|fw:)\s*/i, '')
            .trim() || 'Meeting';
    }

    showScheduleMeetingPopup(email, analysis) {
        const extractedData = analysis.extractedData || {};
        
        // Create a simple form popup for scheduling
        const popup = document.createElement('div');
        popup.className = 'modal-overlay';
        popup.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> Schedule Meeting</h3>
                    <span class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="meeting-form">
                        <div style="margin-bottom: 15px;">
                            <label>Meeting Title:</label>
                            <input type="text" id="meeting-title" value="${extractedData.summary || this.extractMeetingTitle(email)}" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>Start Date & Time:</label>
                            <input type="datetime-local" id="meeting-start" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>End Date & Time:</label>
                            <input type="datetime-local" id="meeting-end" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>Location:</label>
                            <input type="text" id="meeting-location" value="${extractedData.location || 'Google Meet'}" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>Description:</label>
                            <textarea id="meeting-description" style="width: 100%; padding: 8px; margin-top: 5px; height: 80px;">${extractedData.description || ''}</textarea>
                        </div>
                        <div style="text-align: center; margin-top: 20px;">
                            <button type="submit" class="btn btn-success">Create Meeting</button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="margin-left: 10px;">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Set default times (next hour for 1 hour duration)
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        nextHour.setMinutes(0);
        const endTime = new Date(nextHour.getTime() + 60 * 60 * 1000);
        
        document.getElementById('meeting-start').value = nextHour.toISOString().slice(0, 16);
        document.getElementById('meeting-end').value = endTime.toISOString().slice(0, 16);
        
        // Handle form submission
        document.getElementById('meeting-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createMeetingFromForm(popup);
        });
        
        // Close popup when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    }

    async createMeetingFromForm(popup) {
        try {
            this.showLoadingOverlay('Creating calendar event...');
            
            const formData = {
                summary: document.getElementById('meeting-title').value,
                startTime: document.getElementById('meeting-start').value,
                endTime: document.getElementById('meeting-end').value,
                location: document.getElementById('meeting-location').value,
                description: document.getElementById('meeting-description').value
            };
            
            const response = await fetch('/api/calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                popup.remove();
                this.showNotification('Meeting created successfully!', 'success');
                
                // Reload calendar data if on dashboard
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardCalendar();
                }
            } else {
                this.showNotification('Failed to create meeting', 'error');
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            this.showNotification('Failed to create meeting', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Utility Methods
    extractEmailAddress(emailString) {
        const match = emailString.match(/<(.+?)>/) || emailString.match(/(\S+@\S+)/);
        return match ? match[1] : emailString;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    formatEventTime(eventTime) {
        try {
            const date = new Date(eventTime.dateTime || eventTime.date);
            
            if (eventTime.date && !eventTime.dateTime) {
                // All-day event
                return 'All day';
            } else {
                // Time-specific event
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
            }
        } catch (error) {
            console.error('Error formatting event time:', error);
            return 'Time unavailable';
        }
    }

    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        
        const scripts = div.querySelectorAll('script, object, embed, iframe');
        scripts.forEach(script => script.remove());
        
        return div.innerHTML;
    }

    showLoading(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="loading">${message}</div>`;
    }

    showLoadingOverlay(message = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('p');
        text.textContent = message;
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 1000;
                    animation: slideInRight 0.3s ease-out;
                    max-width: 350px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .notification-success { background: #27ae60; }
                .notification-error { background: #e74c3c; }
                .notification-info { background: #3498db; }
                .notification-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .notification-content span {
                    line-height: 1.4;
                    font-size: 13px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, type === 'info' ? 7000 : 5000); // Show info notifications longer
    }
}

// Initialize the application
const app = new ExecutiveAssistant();

// Make app globally available for onclick handlers
window.app = app;