// --- Configuration ---
const API_BASE_URL = 'https://confident-jemima-school1660440-5a325843.koyeb.app';
const CONTENT_ENDPOINT = `${API_BASE_URL}/api/content`;
const TRACK_VIEW_ENDPOINT = `${API_BASE_URL}/api/track-view`;
const TELEGRAM_LINK = 'https://t.me/+oOdTY-zbwCY3MzA1';
const ITEMS_PER_PAGE = 20;

// --- Global State ---
let currentPage = 1;
let totalPages = 0; // Initialize to 0

// --- Utility Functions ---

/**
 * Tracks a view for a given content item asynchronously.
 * Added to window scope to be called by inline event handlers.
 * @param {string} contentId 
 */
window.trackView = (contentId) => {
    fetch(TRACK_VIEW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId }),
    }).catch(error => console.error("Failed to track view:", error));
};

/**
 * Handles the "Request Content" button click.
 * Added to window scope.
 */
window.requestContent = () => {
    window.open(TELEGRAM_LINK, '_blank');
};

/**
 * Toggles the visibility of the search bar.
 * Added to window scope.
 */
window.toggleSearchBar = () => {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    
    // Toggle the 'active' class to apply transition effects
    searchContainer.classList.toggle('active');

    // If active, focus the input field for immediate use
    if (searchContainer.classList.contains('active')) {
        searchInput.focus();
    } else {
        // Clear search on close to reset the filter
        searchInput.value = '';
        // If closing the bar and there was a search term, reload content
        // Only reload if not already on page 1 (since closing the search bar should conceptually reset/refresh)
        if (currentPage !== 1) {
             loadContent(1);
        }
    }
};

/**
 * Creates the HTML element for a single content card.
 * @param {object} content 
 * @returns {HTMLElement}
 */
const createContentCard = (content) => {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-id', content._id);

    // Limit tags shown on the card to the first 3 for cleanliness
    const tagsHtml = content.tags.slice(0, 3).map(tag => `<span>${tag}</span>`).join('');
    const date = content.created_at ? new Date(content.created_at).toLocaleDateString() : 'N/A';
    const views = content.views !== undefined ? content.views.toLocaleString() : 'N/A';
    
    // NEW LOGIC: Use multi-link format if there is more than 1 link.
    const isMultiLink = content.links && content.links.length > 1;
    
    let actionAreaHtml = '';

    if (isMultiLink) {
        // --- Multi-Link / Series Link Logic ---
        // Applies to series AND any video with multiple links (mirrors)
        
        // Use "Link X" if episode_title is missing for non-series content
        const episodeLinks = content.links.map((link, index) => {
            const linkTitle = link.episode_title || `Link ${index + 1}`;
            return `
                <a href="${link.url}" target="_blank" class="episode-link" 
                   onclick="event.stopPropagation(); trackView('${content._id}');"
                   title="${linkTitle}">
                    ${linkTitle}
                </a>
            `;
        }).join('');

        const linkTypeName = content.type && content.type.toLowerCase().includes('series') ? 'Episodes' : 'Mirrors';

        actionAreaHtml = `
            <div class="episodes-list-container">
                <p style="color: var(--primary-color); font-size: 0.95em; margin: 0 0 10px 0; font-weight: 600;">${linkTypeName} (${content.links.length})</p>
                <div class="episodes-grid">
                    ${episodeLinks}
                </div>
            </div>
        `;
        // Multi-link/Series cards shouldn't have a click action on the whole card
        card.style.cursor = 'default';

    } else if (content.links && content.links.length === 1) {
        // --- Single Video/Main Link Logic (Only 1 link) ---
        // Show a prominent "Watch Now" button (using the first link)
        actionAreaHtml = `
            <div class="action-button">
                <span class="watch-btn" onclick="event.stopPropagation(); window.open('${content.links[0].url}', '_blank'); trackView('${content._id}');">
                    Watch Now
                </span>
            </div>
        `;
         // Make the entire card clickable for single-link content
         card.onclick = () => {
            window.trackView(content._id);
            window.open(content.links[0].url, '_blank');
         };

    } else {
        // --- No Links Logic ---
        // No links available: Request content action
        actionAreaHtml = `
            <div class="action-button">
                <span class="request-btn" onclick="event.stopPropagation(); requestContent();">
                    No Link - Request Content
                </span>
            </div>
        `;
        // Make the entire card clickable to request content
        card.onclick = () => { window.requestContent(); };
    }

    // Generate HTML structure
    card.innerHTML = `
        <img class="card-image" src="${content.thumbnail_url || 'https://via.placeholder.com/300x200?text=StreamHub'}" alt="${content.title}">
        <div class="card-info">
            <h3>${content.title}</h3>
            <div class="card-meta">
                <span>${content.type.toUpperCase() || 'UNKNOWN'}</span>
                <span>${date}</span>
            </div>
            <p class="card-meta">Views: <strong>${views}</strong></p>
            ${actionAreaHtml}
            <div class="card-tags">${tagsHtml}</div>
        </div>
    `;
    return card;
};


// --- Core Data Functions ---

/**
 * Fetches and displays content based on current page and search query.
 * Added to window scope to be called by inline event handlers.
 * @param {number} page 
 */
window.loadContent = async (page = 1) => {
    const grid = document.getElementById('content-grid');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const searchInput = document.getElementById('search-input');
    
    const searchQuery = searchInput.value.trim();

    grid.innerHTML = '<p class="status-message">Loading content, please wait...</p>';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    pageInfo.textContent = '';

    let url = `${CONTENT_ENDPOINT}?page=${page}&limit=${ITEMS_PER_PAGE}`;
    
    // Use generic 'q' (query) parameter for search
    if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`; 
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            grid.innerHTML = '';
            data.data.forEach(content => {
                grid.appendChild(createContentCard(content));
            });

            // Update Pagination State
            currentPage = data.pagination.page;
            totalPages = data.pagination.pages;
            
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;

        } else {
            const message = searchQuery 
                ? `😢 No results found for "${searchQuery}".` 
                : '😢 No content is currently available.';

            grid.innerHTML = `<p class="status-message">${message}</p>`;
            pageInfo.textContent = 'Page 0 of 0';
            
            // Ensure totalPages is 0 if there are no results
            totalPages = 0; 
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        const warningColor = getComputedStyle(document.documentElement).getPropertyValue('--warning-color');
        grid.innerHTML = `<p class="status-message" style="color: ${warningColor};">🚨 Failed to connect to the StreamHub API.</p>`;
    }
};

/**
 * Handles page navigation for the pagination buttons.
 * Added to window scope to be called by inline event handlers.
 * @param {number} delta 
 */
window.changePage = (delta) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadContent(newPage);
    }
};


// --- Initialization ---

// Auto-load content on page open
document.addEventListener('DOMContentLoaded', () => {
    window.loadContent(1); 
});
