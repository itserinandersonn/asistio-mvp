// ==================== script.js ====================

class ExecutiveAssistant {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.emails = [];
        this.currentEmailPage = 1;
        this.totalEmailPages = 1;
        this.pageToken = null;
        this.currentCalendarView = 'list';
        this.currentCalendarDate = new Date();
        this.currentDashboardDate = new Date(); // For dashboard calendar day switching
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
        this.currentDashboardDate.setDate(this.currentDashboardDate.getDate() + direction);
        this.updateDashboardDayDisplay();
        this.loadDashboardCalendar();
    }
    

    // Dashboard calendar day navigation
    navigateDashboardDay(direction) {
        this.currentDashboardDate.setDate(this.currentDashboardDate.getDate() + direction);
        this.updateDashboardDayDisplay();
        this.loadDashboardCalendar();
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
                this.showEmailList();
                await this.loadEmails(this.currentEmailPage);
                this.showNotification(`Email snoozed until ${snoozeUntil.toLocaleString()}`, 'success');
            }
        } catch (error) {
            console.error('Error snoozing email:', error);
            this.showNotification('Failed to snooze email', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Add these methods to your ExecutiveAssistant class

async loadDashboardData() {
    await Promise.all([
        this.loadDashboardEmails(),
        this.loadDashboardCalendar(),
        this.loadDashboardTravel()
    ]);
}

async loadDashboardEmails() {
    try {
        const response = await fetch('/api/emails?maxResults=20');
        const data = await response.json();
        
        if (data.success) {
            this.renderDashboardEmails(data.emails);
        }
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
        </div>
    `;
}

async loadDashboardCalendar() {
    try {
        const response = await fetch('/api/calendar');
        const data = await response.json();
        
        if (data.success) {
            this.renderDashboardCalendar(data.events);
        }
    } catch (error) {
        console.error('Error loading dashboard calendar:', error);
        document.getElementById('dashboard-calendar').innerHTML = '<div class="no-data">Failed to load events</div>';
    }
}

// Update the renderDashboardCalendar method
renderDashboardCalendar(events) {
    const container = document.getElementById('dashboard-calendar');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="no-data">No events today</div>';
        return;
    }

    // Show only today's events
    const today = new Date().toDateString();
    const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        return eventDate.toDateString() === today;
    });

    if (todayEvents.length === 0) {
        container.innerHTML = '<div class="no-data">No events today</div>';
        return;
    }

    container.innerHTML = todayEvents.slice(0, 8).map(event => `
        <div class="calendar-event-compact">
            <div class="event-time-compact">${this.formatEventTime(event.start)}</div>
            <div class="event-title-compact">${event.summary || 'No Title'}</div>
            ${event.location ? `<div class="event-location-compact">${event.location}</div>` : ''}
        </div>
    `).join('');
}

// Update the showDashboardEmailDetail method
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
                <button class="btn btn-primary btn-sm" onclick="app.navigateToPage('emails')">
                    <i class="fas fa-external-link-alt"></i> Open in Emails
                </button>
            </div>
        </div>
    `;
}

async loadDashboardTravel() {
    const container = document.getElementById('dashboard-travel');
    container.innerHTML = '<div class="no-data">No upcoming travel</div>';
}

    async loadTopEmails() {
        try {
            const response = await fetch('/api/emails?maxResults=5');
            const data = await response.json();
            
            if (data.success) {
                // Only show top 5 emails for dashboard
                const top5Emails = data.emails.slice(0, 5);
                this.renderTopEmails(top5Emails);
            }
        } catch (error) {
            console.error('Error loading top emails:', error);
            document.getElementById('top-emails').innerHTML = '<div class="no-data">Failed to load emails</div>';
        }
    }

    renderTopEmails(emails) {
        const container = document.getElementById('top-emails');
        
        if (!emails || emails.length === 0) {
            container.innerHTML = '<div class="no-data">No emails found</div>';
            return;
        }

        container.innerHTML = emails.map(email => `
            <div class="email-item" onclick="app.openEmailFromDashboard('${email.id}')">
                <div class="email-sender">${this.extractEmailAddress(email.from)}</div>
                <div class="email-content">
                    <div class="email-subject">${email.subject || 'No Subject'}</div>
                    <div class="email-preview">${email.snippet || 'No preview available'}</div>
                </div>
                <div class="email-time">${this.formatDate(email.date)}</div>
            </div>
        `).join('');
    }

    async openEmailFromDashboard(emailId) {
        // Navigate to emails page and open the specific email
        this.navigateToPage('emails');
        setTimeout(() => {
            this.openEmailModal(emailId);
        }, 100);
    }

    async loadUpcomingEvents() {
        try {
            const response = await fetch('/api/calendar');
            const data = await response.json();
            
            if (data.success) {
                this.renderUpcomingEvents(data.events);
            }
        } catch (error) {
            console.error('Error loading calendar events:', error);
            document.getElementById('upcoming-events').innerHTML = '<div class="no-data">Failed to load events</div>';
        }
    }

    renderUpcomingEvents(events) {
        const container = document.getElementById('upcoming-events');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="no-data">No upcoming events</div>';
            return;
        }

        container.innerHTML = events.slice(0, 5).map(event => `
            <div class="calendar-event">
                <div class="event-title">${event.summary || 'No Title'}</div>
                <div class="event-time">${this.formatEventTime(event.start)}</div>
                ${event.location ? `<div class="event-location">${event.location}</div>` : ''}
            </div>
        `).join('');
    }

    async loadRecentTravel() {
        document.getElementById('recent-travel').innerHTML = '<div class="no-data">No recent travel found</div>';
    }

    async loadEmails(page = 1, pageToken = null) {
        try {
            this.showLoading('emails-list', 'Loading emails...');
            
            let url = `/api/emails?page=${page}`;
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.emails = data.emails;
                this.currentEmailPage = page;
                this.pageToken = data.nextPageToken;
                this.renderEmails(data.emails);
                this.renderEmailPagination(data);
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
            <div class="email-item" onclick="app.openEmailModal('${email.id}')">
                <div class="email-sender">${this.extractEmailAddress(email.from)}</div>
                <div class="email-content">
                    <div class="email-subject">${email.subject || 'No Subject'}</div>
                    <div class="email-preview">${email.snippet || 'No preview available'}</div>
                </div>
                <div class="email-time">${this.formatDate(email.date)}</div>
            </div>
        `).join('');
    }

    renderEmailPagination(data) {
        const container = document.getElementById('email-pagination');
        const currentPage = this.currentEmailPage;
        const hasNext = !!data.nextPageToken;
        const hasPrev = currentPage > 1;

        let paginationHTML = '<div class="pagination">';
        
        paginationHTML += `<button ${!hasPrev ? 'disabled' : ''} onclick="app.loadEmails(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>`;

        paginationHTML += `<button class="active">${currentPage}</button>`;

        paginationHTML += `<button ${!hasNext ? 'disabled' : ''} onclick="app.loadEmails(${currentPage + 1}, '${data.nextPageToken || ''}')">
            Next <i class="fas fa-chevron-right"></i>
        </button>`;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    async openEmailModal(emailId) {
        try {
            this.showLoadingOverlay('Loading email...');
            
            const response = await fetch(`/api/emails/${emailId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showEmailDetail(data.email);
                this.currentEmailId = emailId;
                this.currentEmail = data.email;
            }
        } catch (error) {
            console.error('Error loading email:', error);
            this.showNotification('Failed to load email', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    showEmailDetail(email) {
        document.getElementById('email-list-view').style.display = 'none';
        document.getElementById('email-detail-view').style.display = 'block';
        document.getElementById('back-to-list').style.display = 'inline-flex';
        
        document.getElementById('detail-email-subject').textContent = email.subject || 'No Subject';
        document.getElementById('detail-email-from').textContent = email.from;
        document.getElementById('detail-email-to').textContent = email.to;
        document.getElementById('detail-email-date').textContent = this.formatDate(email.date);
        
        if (email.cc) {
            document.getElementById('detail-email-cc').textContent = email.cc;
            document.getElementById('detail-email-cc-row').style.display = 'flex';
        } else {
            document.getElementById('detail-email-cc-row').style.display = 'none';
        }
        
        document.getElementById('detail-email-body').innerHTML = this.sanitizeHTML(email.body);
        this.checkForMeetingContent(email);
    }

    showEmailList() {
        document.getElementById('email-list-view').style.display = 'block';
        document.getElementById('email-detail-view').style.display = 'none';
        document.getElementById('back-to-list').style.display = 'none';
        this.currentEmail = null;
        this.currentEmailId = null;
    }

    checkForMeetingContent(email) {
        const scheduleBtn = document.getElementById('detail-schedule-meeting-btn');
        const emailContent = (email.subject + ' ' + email.body).toLowerCase();
        
        const meetingKeywords = [
            'meeting', 'schedule', 'appointment', 'call', 'zoom', 'teams', 
            'conference', 'discuss', 'review', 'catch up', 'sync', 'standup',
            'one-on-one', '1:1', 'demo', 'presentation', 'interview'
        ];
        
        const timeKeywords = [
            'tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 
            'friday', 'saturday', 'sunday', 'am', 'pm', 'time', 'at ', 'on ',
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        
        const hasMeetingKeyword = meetingKeywords.some(keyword => emailContent.includes(keyword));
        const hasTimeKeyword = timeKeywords.some(keyword => emailContent.includes(keyword));
        
        scheduleBtn.style.display = 'inline-flex';
        
        if (hasMeetingKeyword && hasTimeKeyword) {
            scheduleBtn.classList.add('btn-pulse');
        } else {
            scheduleBtn.classList.remove('btn-pulse');
        }
    }

    async deleteCurrentEmail() {
        if (!this.currentEmailId) return;
        
        try {
            this.showLoadingOverlay('Deleting email...');
            
            const response = await fetch(`/api/emails/${this.currentEmailId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showEmailList();
                await this.loadEmails(this.currentEmailPage);
                this.showNotification('Email deleted successfully', 'success');
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
                this.showEmailList();
                await this.loadEmails(this.currentEmailPage);
                this.showNotification('Email archived successfully', 'success');
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

    showScheduleMeetingPopup(email, analysis) {
        const popup = document.createElement('div');
        popup.className = 'ai-popup-overlay';
        popup.innerHTML = `
            <div class="ai-popup">
                <div class="ai-popup-header">
                    <h3><i class="fas fa-calendar-plus"></i> Schedule Meeting from Email</h3>
                    <span class="ai-popup-close">&times;</span>
                </div>
                <div class="ai-popup-body">
                    <div class="ai-suggestion">
                        <p><strong>📧 Creating meeting from email:</strong></p>
                        <p><em>"${email.subject}"</em></p>
                        <p>Please review and confirm the meeting details below:</p>
                    </div>
                    
                    <div class="event-details">
                        <div class="form-group">
                            <label>Meeting Title:</label>
                            <input type="text" id="schedule-event-title" value="${analysis.extractedData.summary || this.extractMeetingTitle(email)}" />
                        </div>
                        
                        <div class="form-group">
                            <label>Date & Time:</label>
                            <input type="datetime-local" id="schedule-event-datetime" value="${this.formatDateTimeForInput(analysis.extractedData.startTime)}" />
                        </div>
                        
                        <div class="form-group">
                            <label>Duration:</label>
                            <select id="schedule-event-duration">
                                <option value="0.5">30 minutes</option>
                                <option value="1" selected>1 hour</option>
                                <option value="1.5">1.5 hours</option>
                                <option value="2">2 hours</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Location:</label>
                            <input type="text" id="schedule-event-location" value="${analysis.extractedData.location || 'Google Meet'}" />
                            <small>Meeting room, address, or video call link</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Attendees:</label>
                            <textarea id="schedule-event-attendees" rows="3" placeholder="Enter email addresses separated by commas">${this.extractAttendees(email).join(', ')}</textarea>
                            <small>Automatically detected from email participants</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Meeting Description:</label>
                            <textarea id="schedule-event-description" rows="3">${analysis.extractedData.description || `Meeting scheduled from email: ${email.subject}`}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="send-invites" checked>
                                Send calendar invites to attendees
                            </label>
                        </div>
                    </div>
                    
                    <div class="ai-popup-actions">
                        <button class="btn btn-success" onclick="app.confirmScheduleMeeting()">
                            <i class="fas fa-calendar-check"></i> Confirm & Schedule
                        </button>
                        <button class="btn btn-secondary" onclick="app.closeSchedulePopup()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.addPopupStyles();
        document.body.appendChild(popup);
        
        popup.addEventListener('click', (e) => {
            if (e.target === popup || e.target.classList.contains('ai-popup-close')) {
                this.closeSchedulePopup();
            }
        });
    }

    addPopupStyles() {
        if (!document.getElementById('ai-popup-styles')) {
            const style = document.createElement('style');
            style.id = 'ai-popup-styles';
            style.textContent = `
                .ai-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                    backdrop-filter: blur(5px);
                }
                .ai-popup {
                    background: white;
                    border-radius: 15px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    animation: popupSlideIn 0.3s ease-out;
                }
                @keyframes popupSlideIn {
                    from { transform: scale(0.8) translateY(-50px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .ai-popup-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 15px 15px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ai-popup-header h3 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .ai-popup-close {
                    font-size: 24px;
                    cursor: pointer;
                    opacity: 0.8;
                    transition: opacity 0.3s;
                }
                .ai-popup-close:hover {
                    opacity: 1;
                }
                .ai-popup-body {
                    padding: 25px;
                }
                .ai-suggestion {
                    background: #e8f5e8;
                    border: 1px solid #27ae60;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                    color: #333;
                }
                .form-group input, .form-group select, .form-group textarea {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                    box-sizing: border-box;
                }
                .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: #3498db;
                }
                .form-group small {
                    color: #666;
                    font-size: 12px;
                    display: block;
                    margin-top: 5px;
                }
                .form-group input[type="checkbox"] {
                    width: auto;
                    margin-right: 8px;
                }
                .ai-popup-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                }
                .btn {
                    padding: 10px 15px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s;
                }
                .btn-success {
                    background: #27ae60;
                    color: white;
                }
                .btn-success:hover {
                    background: #229954;
                }
                .btn-secondary {
                    background: #95a5a6;
                    color: white;
                }
                .btn-secondary:hover {
                    background: #7f8c8d;
                }
                .btn-pulse {
                    animation: btnPulse 2s infinite;
                }
                @keyframes btnPulse {
                    0% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(39, 174, 96, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async confirmScheduleMeeting() {
        try {
            const eventData = {
                summary: document.getElementById('schedule-event-title').value,
                startTime: new Date(document.getElementById('schedule-event-datetime').value).toISOString(),
                endTime: new Date(new Date(document.getElementById('schedule-event-datetime').value).getTime() + 
                        parseFloat(document.getElementById('schedule-event-duration').value) * 60 * 60 * 1000).toISOString(),
                location: document.getElementById('schedule-event-location').value,
                description: document.getElementById('schedule-event-description').value,
                attendees: document.getElementById('schedule-event-attendees').value
                    .split(',')
                    .map(email => ({ email: email.trim() }))
                    .filter(attendee => attendee.email),
                sendUpdates: document.getElementById('send-invites').checked ? 'all' : 'none'
            };

            this.showLoadingOverlay('Creating meeting and sending invites...');
            
            const response = await fetch('/api/calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Meeting scheduled successfully! Calendar invites sent.', 'success');
                this.closeSchedulePopup();
                
                const currentCount = parseInt(document.getElementById('ai-actions').textContent) || 0;
                document.getElementById('ai-actions').textContent = currentCount + 1;
                
                if (this.currentPage === 'calendar') {
                    await this.loadCalendarEvents();
                }
            } else {
                throw new Error(data.error || 'Failed to create meeting');
            }
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            this.showNotification('Failed to schedule meeting. Please try again.', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    closeSchedulePopup() {
        const popup = document.querySelector('.ai-popup-overlay');
        if (popup) {
            popup.remove();
        }
    }

    extractMeetingTitle(email) {
        const subject = email.subject || '';
        let title = subject.replace(/^(RE:|FWD:|FW:)\s*/i, '').trim();
        
        const meetingWords = ['meeting', 'call', 'discussion', 'review', 'sync', 'standup', 'demo'];
        if (meetingWords.some(word => title.toLowerCase().includes(word))) {
            return title;
        }
        
        return title ? `Meeting: ${title}` : 'Meeting';
    }

    extractAttendees(email) {
        const attendees = [];
        
        const fromEmail = this.extractEmailAddress(email.from);
        if (fromEmail) attendees.push(fromEmail);
        
        if (email.cc) {
            const ccEmails = email.cc.split(',').map(cc => this.extractEmailAddress(cc.trim()));
            attendees.push(...ccEmails.filter(email => email));
        }
        
        if (email.to) {
            const toEmails = email.to.split(',').map(to => this.extractEmailAddress(to.trim()));
            attendees.push(...toEmails.filter(email => email && email !== this.currentUser.email));
        }
        
        return [...new Set(attendees)];
    }

    formatDateTimeForInput(dateString) {
        if (!dateString) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(14, 0, 0, 0);
            return tomorrow.toISOString().slice(0, 16);
        }
        
        try {
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16);
        } catch (error) {
            const defaultDate = new Date();
            defaultDate.setHours(14, 0, 0, 0);
            return defaultDate.toISOString().slice(0, 16);
        }
    }

    // Calendar Methods
    async loadCalendarEvents() {
        try {
            this.showLoading('calendar-events', 'Loading calendar events...');
            
            const response = await fetch('/api/calendar');
            const data = await response.json();
            
            if (data.success) {
                this.currentEvents = data.events;
                this.renderCalendarInView(data.events, this.currentCalendarView || 'list');
                this.updateCalendarTitle();
            }
        } catch (error) {
            console.error('Error loading calendar events:', error);
            document.getElementById('calendar-events').innerHTML = '<div class="no-data">Failed to load calendar events</div>';
        }
    }

    changeCalendarView(view) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.currentCalendarView = view;
        this.renderCalendarInView(this.currentEvents || [], view);
    }

    navigateCalendar(direction) {
        const currentDate = this.currentCalendarDate || new Date();
        let newDate;
        
        switch (this.currentCalendarView) {
            case 'day':
                newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + direction);
                break;
            case 'week':
                newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + (direction * 7));
                break;
            case 'month':
                newDate = new Date(currentDate);
                newDate.setMonth(currentDate.getMonth() + direction);
                break;
            default:
                return;
        }
        
        this.currentCalendarDate = newDate;
        this.updateCalendarTitle();
        this.loadCalendarEvents();
    }

    updateCalendarTitle() {
        const titleElement = document.getElementById('calendar-title');
        const date = this.currentCalendarDate || new Date();
        
        switch (this.currentCalendarView) {
            case 'day':
                titleElement.textContent = date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                break;
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                titleElement.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                break;
            case 'month':
                titleElement.textContent = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                break;
            default:
                titleElement.textContent = 'All Events';
        }
    }

    renderCalendarInView(events, view) {
        const container = document.getElementById('calendar-events');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="no-data">No calendar events found</div>';
            return;
        }

        switch (view) {
            case 'list':
                this.renderCalendarListView(events, container);
                break;
            case 'day':
                this.renderCalendarDayView(events, container);
                break;
            case 'week':
                this.renderCalendarWeekView(events, container);
                break;
            case 'month':
                this.renderCalendarMonthView(events, container);
                break;
            default:
                this.renderCalendarListView(events, container);
        }
    }

    renderCalendarListView(events, container) {
        container.className = 'calendar-container calendar-list-view';
        container.innerHTML = events.map(event => `
            <div class="calendar-event">
                <div class="event-title">${event.summary || 'No Title'}</div>
                <div class="event-time">${this.formatEventTime(event.start)} - ${this.formatEventTime(event.end)}</div>
                ${event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                ${event.attendees ? `<div class="event-attendees"><i class="fas fa-users"></i> ${event.attendees.length} attendee(s)</div>` : ''}
            </div>
        `).join('');
    }

    renderCalendarDayView(events, container) {
        container.className = 'calendar-container calendar-day-view';
        const targetDate = this.currentCalendarDate || new Date();
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            return eventDate.toDateString() === targetDate.toDateString();
        });

        let html = `
            <div class="day-header">
                ${targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="day-timeline">
                <div class="hour-labels">
        `;

        for (let hour = 0; hour < 24; hour++) {
            const timeStr = hour === 0 ? '12 AM' : hour < 12 ? 
                `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            html += `<div class="hour-label">${timeStr}</div>`;
        }

        html += `</div><div class="day-events">`;

        dayEvents.forEach(event => {
            if (event.start.dateTime) {
                const startTime = new Date(event.start.dateTime);
                const endTime = new Date(event.end.dateTime);
                const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
                const duration = (endTime - startTime) / (1000 * 60 * 60);
                
                html += `
                    <div class="day-event" style="top: ${startHour * 60}px; height: ${Math.max(duration * 60, 30)}px;">
                        <div class="event-title">${event.summary}</div>
                        <div class="event-time">${this.formatEventTime(event.start)}</div>
                    </div>
                `;
            }
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    renderCalendarWeekView(events, container) {
        container.className = 'calendar-container calendar-week-view';
        const targetDate = this.currentCalendarDate || new Date();
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());

        let html = '<div></div>';

        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            html += `
                <div class="week-day-header">
                    ${day.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </div>
            `;
        }

        for (let hour = 0; hour < 24; hour++) {
            const timeStr = hour === 0 ? '12 AM' : hour < 12 ? 
                `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            html += `<div class="hour-label">${timeStr}</div>`;

            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const currentDay = new Date(weekStart);
                currentDay.setDate(weekStart.getDate() + dayIndex);
                
                const dayEvents = events.filter(event => {
                    if (!event.start.dateTime) return false;
                    const eventDate = new Date(event.start.dateTime);
                    return eventDate.toDateString() === currentDay.toDateString() &&
                           eventDate.getHours() === hour;
                });

                html += `<div class="week-day-column">`;
                dayEvents.forEach(event => {
                    html += `
                        <div class="day-event">
                            <div class="event-title">${event.summary}</div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
        }

        container.innerHTML = html;
    }

    renderCalendarMonthView(events, container) {
        container.className = 'calendar-container calendar-month-view';
        const targetDate = this.currentCalendarDate || new Date();
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = `
            <div class="month-header">
                <div class="month-day-header">Sun</div>
                <div class="month-day-header">Mon</div>
                <div class="month-day-header">Tue</div>
                <div class="month-day-header">Wed</div>
                <div class="month-day-header">Thu</div>
                <div class="month-day-header">Fri</div>
                <div class="month-day-header">Sat</div>
            </div>
            <div class="month-grid">
        `;

        const today = new Date();
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === today.toDateString();
            
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.start.dateTime || event.start.date);
                return eventDate.toDateString() === currentDate.toDateString();
            });

            html += `
                <div class="month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                    <div class="month-day-number">${currentDate.getDate()}</div>
            `;

            dayEvents.slice(0, 3).forEach(event => {
                html += `
                    <div class="month-event" title="${event.summary}">
                        ${event.summary}
                    </div>
                `;
            });

            if (dayEvents.length > 3) {
                html += `<div class="month-event">+${dayEvents.length - 3} more</div>`;
            }

            html += `</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    // Travel Methods
    async loadTravelData() {
        const container = document.getElementById('travel-options');
        container.innerHTML = '<div class="no-data">No travel information available</div>';
    }

    // Search Methods
    searchEmails(query) {
        if (!query) {
            this.renderEmails(this.emails);
            return;
        }
        
        const filteredEmails = this.emails.filter(email => 
            email.subject.toLowerCase().includes(query.toLowerCase()) ||
            email.from.toLowerCase().includes(query.toLowerCase()) ||
            email.snippet.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderEmails(filteredEmails);
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
            if (eventTime.date) {
                return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
            } else {
                return date.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            return eventTime.dateTime || eventTime.date || 'Unknown time';
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
                }
                .notification-success { background: #27ae60; }
                .notification-error { background: #e74c3c; }
                .notification-info { background: #3498db; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
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
        }, 5000);
    }
}

// Initialize the application
const app = new ExecutiveAssistant();

// Make app globally available for onclick handlers
window.app = app;