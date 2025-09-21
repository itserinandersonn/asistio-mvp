// ==================== script.js ====================

class ExecutiveAssistant {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.emails = [];
        this.currentEmailPage = 1;
        this.totalEmailPages = 1;
        this.pageToken = null;
        
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

        // Email modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeEmailModal();
        });

        // Click outside modal to close
        document.getElementById('email-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeEmailModal();
            }
        });

        // Email search
        document.getElementById('email-search').addEventListener('input', (e) => {
            this.searchEmails(e.target.value);
        });

        // Refresh emails button
        document.getElementById('refresh-emails').addEventListener('click', () => {
            this.loadEmails(1);
        });

        // Email action buttons
        document.getElementById('delete-btn').addEventListener('click', () => {
            this.deleteCurrentEmail();
        });

        document.getElementById('archive-btn').addEventListener('click', () => {
            this.archiveCurrentEmail();
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

    async loadDashboardData() {
        await Promise.all([
            this.loadTopEmails(),
            this.loadUpcomingEvents(),
            this.loadRecentTravel()
        ]);
    }

    async loadTopEmails() {
        try {
            const response = await fetch('/api/emails?maxResults=5');
            const data = await response.json();
            
            if (data.success) {
                this.renderTopEmails(data.emails);
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
        // For now, show placeholder
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
                
                // Process emails with AI
                this.processEmailsWithAI(data.emails);
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
        
        // Previous button
        paginationHTML += `<button ${!hasPrev ? 'disabled' : ''} onclick="app.loadEmails(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>`;

        // Page numbers (simplified - show current page)
        paginationHTML += `<button class="active">${currentPage}</button>`;

        // Next button
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
                this.showEmailModal(data.email);
                this.currentEmailId = emailId;
            }
        } catch (error) {
            console.error('Error loading email:', error);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    showEmailModal(email) {
        document.getElementById('email-subject').textContent = email.subject || 'No Subject';
        document.getElementById('email-from').textContent = email.from;
        document.getElementById('email-to').textContent = email.to;
        document.getElementById('email-date').textContent = this.formatDate(email.date);
        
        if (email.cc) {
            document.getElementById('email-cc').textContent = email.cc;
            document.getElementById('email-cc-row').style.display = 'block';
        } else {
            document.getElementById('email-cc-row').style.display = 'none';
        }
        
        document.getElementById('email-body').innerHTML = this.sanitizeHTML(email.body);
        document.getElementById('email-modal').style.display = 'block';
    }

    closeEmailModal() {
        document.getElementById('email-modal').style.display = 'none';
        this.currentEmailId = null;
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
                this.closeEmailModal();
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
                this.closeEmailModal();
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

    async processEmailsWithAI(emails) {
        try {
            for (const email of emails) {
                // Only process emails that haven't been processed yet
                if (!email.processed) {
                    await this.analyzeEmailWithAI(email);
                }
            }
        } catch (error) {
            console.error('Error processing emails with AI:', error);
        }
    }

    async analyzeEmailWithAI(email) {
        try {
            const response = await fetch('/api/ai/analyze-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (data.success && data.analysis) {
                this.handleAIAnalysis(email, data.analysis);
            }
        } catch (error) {
            console.error('Error analyzing email with AI:', error);
        }
    }

    handleAIAnalysis(email, analysis) {
        if (analysis.type === 'travel' && analysis.confidence > 0.7) {
            this.handleTravelEmail(email, analysis);
        } else if (analysis.type === 'meeting' && analysis.confidence > 0.7) {
            this.handleMeetingEmail(email, analysis);
        }
    }

    async handleTravelEmail(email, analysis) {
        try {
            // Generate travel options
            const response = await fetch('/api/ai/generate-travel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ travelData: analysis.extractedData })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`AI detected travel planning in email: ${email.subject}`, 'info');
                // Store travel options for travel page
                this.storeTravelOptions(data.travelOptions);
            }
        } catch (error) {
            console.error('Error handling travel email:', error);
        }
    }

    handleMeetingEmail(email, analysis) {
        if (analysis.createdEvent) {
            this.showNotification(`AI created calendar event from email: ${email.subject}`, 'success');
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
            document.getElementById('calendar-events').innerHTML = '<div class="no-data">Failed to load calendar events</div>';
        }
    }

    renderCalendarEvents(events) {
        const container = document.getElementById('calendar-events');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="no-data">No calendar events found</div>';
            return;
        }

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

    async loadTravelData() {
        // For now, show stored travel options or placeholder
        const container = document.getElementById('travel-options');
        const storedTravel = localStorage.getItem('travelOptions');
        
        if (storedTravel) {
            try {
                const travelOptions = JSON.parse(storedTravel);
                this.renderTravelOptions(travelOptions);
            } catch (error) {
                container.innerHTML = '<div class="no-data">No travel information available</div>';
            }
        } else {
            container.innerHTML = '<div class="no-data">No travel information available</div>';
        }
    }

    renderTravelOptions(travelOptions) {
        const container = document.getElementById('travel-options');
        
        let html = '<div class="travel-options">';
        
        if (travelOptions.flights) {
            html += '<div class="travel-section"><h3><i class="fas fa-plane"></i> Flight Options</h3>';
            html += travelOptions.flights.map(flight => `
                <div class="travel-item">
                    <div class="travel-title">${flight.airline} - ${flight.route}</div>
                    <div class="travel-details">
                        <span><i class="fas fa-clock"></i> ${flight.duration}</span>
                        <span><i class="fas fa-dollar-sign"></i> ${flight.price}</span>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }
        
        if (travelOptions.hotels) {
            html += '<div class="travel-section"><h3><i class="fas fa-bed"></i> Hotel Options</h3>';
            html += travelOptions.hotels.map(hotel => `
                <div class="travel-item">
                    <div class="travel-title">${hotel.name}</div>
                    <div class="travel-details">
                        <span><i class="fas fa-star"></i> ${hotel.rating} stars</span>
                        <span><i class="fas fa-dollar-sign"></i> ${hotel.price}/night</span>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    storeTravelOptions(travelOptions) {
        localStorage.setItem('travelOptions', JSON.stringify(travelOptions));
    }

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

    // Utility methods
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
                // All-day event
                return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
            } else {
                // Timed event
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
        // Basic HTML sanitization - in production, use a proper library like DOMPurify
        const div = document.createElement('div');
        div.innerHTML = html;
        
        // Remove script tags and other potentially dangerous elements
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
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles if not already added
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
        
        // Remove notification after 5 seconds
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