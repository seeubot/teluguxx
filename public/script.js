// --- CONFIGURATION CONSTANTS (Refactored for clarity) ---
const API_BASE_URL = 'https://confident-jemima-school1660440-5a325843.koyeb.app';
const CONTENT_ENDPOINT = `${API_BASE_URL}/api/content`;
const TRACK_VIEW_ENDPOINT = `${API_BASE_URL}/api/track-view`;
const TAGS_ENDPOINT = `${API_BASE_URL}/api/tags`; 

const BOOKMARK_SITE_URL = 'https://domains-kappa.vercel.app/'; 
const TELEGRAM_URL = 'https://t.me/+oOdTY-zbwCY3MzA1'; 

const ITEMS_PER_PAGE = 20;
const RETRY_DELAY_MS = 5000; // 5 seconds retry delay

// --- Global State ---
let currentPage = 0; 
let totalPages = 0;
let lastScrollTop = 0; 
let currentFilterTag = ''; 
let isLoading = false; 
let retryTimeout = null; // To hold the timer for auto-refresh
let countdownInterval = null; // To hold the interval for the countdown display

// --- DOM Elements ---
const header = document.querySelector('header');
let headerHeight = 0; 
const grid = document.getElementById('content-grid');
const pageInfo = document.getElementById('page-info');
const tagsContainer = document.getElementById('tags-container');
const searchInput = document.getElementById('search-input');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const fabScrollTop = document.getElementById('fab-scroll-top');
const pageNumbersContainer = document.getElementById('page-numbers-container');


document.addEventListener('DOMContentLoaded', () => {
    if (header) {
        header.style.transition = 'top 0.3s ease-in-out';
        headerHeight = header.offsetHeight; 
    }
    window.loadContent(1); // Initial content load
    window.fetchTags(); 
});

// --- Utility Functions ---

/**
 * Clears any active retry timers or countdowns.
 */
const clearRetryTimers = () => {
    if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
};

/**
* Handles the scroll event to hide/show the header and FAB.
*/
function handleScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // Header logic (Hide/Show on scroll)
    if (currentScroll > lastScrollTop && currentScroll > headerHeight) {
        header.style.top = `-${headerHeight + 10}px`; 
    } else {
        header.style.top = '0';
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    
    // FAB logic
    if (currentScroll > 500) { // Show after scrolling 500px
        fabScrollTop.style.display = 'block';
    } else {
        fabScrollTop.style.display = 'none';
    }
}
window.addEventListener('scroll', handleScroll);

/**
* Scrolls the viewport to the top of the page smoothly.
*/
window.scrollToTop = () => {
     window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
* Displays a reusable custom modal with flexible buttons.
*/
function showCustomModal(message, buttons) {
    const modal = document.getElementById('custom-modal');
    const messageElement = document.getElementById('modal-message');
    const buttonsContainer = document.getElementById('modal-buttons');

    if (!modal || !messageElement || !buttonsContainer) return; 

    messageElement.innerHTML = message;
    buttonsContainer.innerHTML = '';

    buttons.forEach(btn => {
        const buttonElement = document.createElement('button');
        buttonElement.innerHTML = btn.text;
        buttonElement.className = `${btn.className} px-4 py-3 rounded-xl font-semibold btn-smooth focus:outline-none text-sm w-full`; 
        buttonElement.onclick = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            if (btn.handler) {
                btn.handler();
            }
        };
        buttonsContainer.appendChild(buttonElement);
    });

    // Set up a grid for button display
    buttonsContainer.className = 'mt-6 grid grid-cols-2 gap-4';

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
* Handles the "Bookmark Site" button click, showing the backup URL and report info.
*/
window.bookmarkSite = () => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#ff4500';
    const warningColor = '#ff6347'; 
    
    const message = `
        <p style="color: ${primaryColor}; font-weight:900; font-size:1.6em; margin-bottom: 25px;">
            <i class="fas fa-link"></i> Permanent Site
        </p>
        <p style="text-align: left; margin-bottom: 20px; font-size: 1.1em;">
            Bookmark this link to always find us, even if the current URL changes:
        </p>
        <div style="background-color: #222222; padding: 18px; border-radius: 12px; margin-bottom: 25px; word-break: break-all; border: 2px solid ${primaryColor};">
            <p style="font-size: 1.2em; font-weight: 700; color: white;">
                ${BOOKMARK_SITE_URL}
            </p>
        </div>
        <p style="color: ${warningColor}; font-weight: 600; font-size: 0.9em; text-align: left;">
            <i class="fas fa-exclamation-triangle"></i> Note: Report illegal content by contacting the source host directly.
        </p>
    `;

    const actionButtons = [
        { 
            text: '<i class="fab fa-telegram-plane"></i> Telegram', 
            className: 'modal-cancel bg-dark-gray hover:bg-[#333333]', 
            handler: () => window.open(TELEGRAM_URL, '_blank') 
        },
        { 
            text: '<i class="fas fa-external-link-alt"></i> Go to Backup Site', 
            className: 'modal-confirm bg-primary-color hover:bg-[#ff5e1e]', 
            handler: () => window.open(BOOKMARK_SITE_URL, '_blank') 
        }
    ];

    showCustomModal(message, actionButtons);
};


// --- Core Application Logic ---

/**
* Fetches data with exponential backoff retry mechanism.
*/
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};


/**
* Tracks a view for a given content item asynchronously.
*/
window.trackView = (contentId) => {
    fetch(TRACK_VIEW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId }),
    }).catch(error => console.error("Failed to track view:", error));
};

/**
* Toggles the visibility of the search bar.
*/
window.toggleSearchBar = () => {
    const searchContainer = document.getElementById('search-container');
    
    if (!searchContainer || !searchInput) return;

    searchContainer.classList.toggle('active');

    if (searchContainer.classList.contains('active')) {
        searchInput.focus();
    } else {
        const wasSearching = searchInput.value.trim() !== '';
        searchInput.value = '';
        
        if (wasSearching || currentFilterTag) {
            currentFilterTag = ''; 
            window.loadContent(1); // Full refresh
        }
    }
};

/**
 * Fetches and renders unique content tags.
 */
window.fetchTags = async () => {
    if (!tagsContainer) return;

    try {
        const response = await fetchWithRetry(TAGS_ENDPOINT, {}, 2); 
        const data = await response.json();

        if (data.success && data.tags && data.tags.length > 0) {
            tagsContainer.innerHTML = data.tags.map(tag => {
                const isActive = tag === currentFilterTag ? 'active-tag' : '';
                return `<span class="tag-chip ${isActive} px-3 py-1 rounded-full text-xs font-medium cursor-pointer btn-smooth" onclick="window.filterByTag('${tag}')">${tag}</span>`;
            }).join('');
        } else {
            tagsContainer.innerHTML = '<span class="text-sm text-secondary-text">No tags available.</span>';
        }
    } catch (error) {
        tagsContainer.innerHTML = '';
    }
};

/**
 * Handles filtering content by clicking a tag.
 */
window.filterByTag = (tag) => {
    searchInput.value = ''; 
    currentFilterTag = tag === currentFilterTag ? '' : tag; 
    
    window.loadContent(1);

    // Re-render tags to ensure highlighting is correct
    window.fetchTags();
};

/**
* Creates the HTML element for a single content card. 
*/
const createContentCard = (content) => {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-id', content._id);

    const tagsHtml = (content.tags || []).slice(0, 3).map(tag => `<span class="tag-chip px-2 py-1 rounded-full text-xs">${tag}</span>`).join('');
    const date = content.created_at ? new Date(content.created_at).toLocaleDateString() : 'N/A';
    const views = content.views !== undefined ? content.views.toLocaleString() : 'N/A';
    
    const isMultiLink = content.links && content.links.length > 1;
    
    const staticThumbnail = content.thumbnail_url || 'https://placehold.co/300x200/1a1a1a/ff4500?text=ADULT-HUB';
    
    let actionAreaHtml = '';
    
    card.style.cursor = 'default'; 

    if (isMultiLink) {
        const episodeLinks = content.links.map((link, index) => {
            const linkTitle = link.episode_title || `Link ${index + 1}`;
            return `
                <a href="${link.url}" target="_blank" class="episode-link-chip px-2 py-1 rounded-md"
                    onclick="event.stopPropagation(); window.trackView('${content._id}');"
                    title="${linkTitle}">
                    ${linkTitle}
                </a>
            `;
        }).join('');

        const linkTypeName = content.type && content.type.toLowerCase().includes('series') ? 'Episodes' : 'Mirrors';

        actionAreaHtml = `
            <div class="episodes-list-container my-3">
                <p style="color: var(--primary-color); font-size: 0.95em; margin: 0 0 10px 0; font-weight: 600;">${linkTypeName} (${content.links.length})</p>
                <div class="episode-link-grid">
                    ${episodeLinks}
                </div>
            </div>
        `;
    } else if (content.links && content.links.length === 1) {
        actionAreaHtml = `
            <div class="action-button mt-3">
                <span class="watch-btn btn-smooth" onclick="event.stopPropagation(); window.open('${content.links[0].url}', '_blank'); window.trackView('${content._id}');">
                    <i class="fas fa-play-circle mr-1"></i> Watch Now
                </span>
            </div>
        `;
        card.style.cursor = 'pointer';
        card.onclick = () => {
            window.trackView(content._id);
            window.open(content.links[0].url, '_blank');
        };

    } else {
        actionAreaHtml = `
            <div class="action-button mt-3">
                <span class="watch-btn btn-smooth" onclick="event.stopPropagation(); window.bookmarkSite();">
                    <i class="fas fa-link mr-1"></i> Find Backup Site
                </span>
            </div>
        `;
        card.style.cursor = 'pointer';
        card.onclick = () => { window.bookmarkSite(); };
    }


    card.innerHTML = `
        <div class="card-image-container relative">
            <img class="card-image" 
                    src="${staticThumbnail}" 
                    alt="${content.title}" 
                    onerror="this.onerror=null; this.src='https://placehold.co/300x200/1a1a1a/ff4500?text=ADULT-HUB Placeholder'}">
        </div>
        
        <div class="card-info p-5 flex flex-col flex-grow">
            <h3 class="text-xl font-extrabold mb-1">${content.title}</h3>
            <div class="flex justify-between text-sm text-secondary-text mb-2">
                <span><i class="fas fa-tag text-primary-color mr-1"></i> ${content.type.toUpperCase() || 'UNKNOWN'}</span>
                <span><i class="fas fa-calendar-alt text-primary-color mr-1"></i> ${date}</span>
            </div>
            <p class="flex items-center text-sm mb-2">
                <i class="fas fa-eye text-primary-color mr-2"></i> 
                Views: <strong class="views-count ml-1">${views}</strong>
            </p>
            ${actionAreaHtml}
            <div class="mt-auto pt-3 border-t border-[#333333] flex flex-wrap gap-2">${tagsHtml}</div>
        </div>
    `;
    
    return card;
};

/**
 * Creates and renders the clickable page number buttons, focusing on a max of 9 buttons.
 */
const renderPageNumbers = (totalPages, currentPage) => {
    pageNumbersContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        pageInfo.textContent = `Page ${totalPages > 0 ? 1 : 0} of ${totalPages}`;
        return;
    }

    const maxButtons = 9;
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxButtons) {
        const half = Math.floor(maxButtons / 2);
        startPage = Math.max(1, currentPage - half + 1);
        endPage = Math.min(totalPages, currentPage + half);

        if (currentPage < half) {
            endPage = maxButtons;
        }
        if (currentPage > totalPages - half) {
            startPage = totalPages - maxButtons + 1;
        }
    }

    startPage = Math.max(1, startPage);
    endPage = Math.min(totalPages, endPage);


    // Render "..." at start
    if (startPage > 1) {
        pageNumbersContainer.innerHTML += '<span class="text-xl text-primary-color px-2 py-1 select-none">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = `page-number-btn text-sm md:text-base btn-smooth ${i === currentPage ? 'active' : ''}`;
        button.onclick = () => {
            window.scrollToTop(); 
            window.loadContent(i);
        };
        pageNumbersContainer.appendChild(button);
    }
    
    // Render "..." at end
    if (endPage < totalPages) {
        pageNumbersContainer.innerHTML += '<span class="text-xl text-primary-color px-2 py-1 select-none">...</span>';
    }
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
};


/**
* Fetches and displays content based on current page and search query/tag filter.
*/
window.loadContent = async (page = 1) => {
    // Clear any pending retry timer before starting a new load
    clearRetryTimers();
    
    if (isLoading) return; 

    const pageToLoad = page < 1 ? 1 : page; 

    // 1. Set Loading State
    isLoading = true;
    statusContainer.style.display = 'block';
    statusMessage.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Fetching new content...';
    
    pageNumbersContainer.innerHTML = '';
    pageInfo.textContent = '...';
    grid.innerHTML = '';

    let url = `${CONTENT_ENDPOINT}?page=${pageToLoad}&limit=${ITEMS_PER_PAGE}`;
    
    if (searchInput.value.trim()) {
        url += `&q=${encodeURIComponent(searchInput.value.trim())}`; 
        currentFilterTag = ''; 
    } else if (currentFilterTag) {
         url += `&tag=${encodeURIComponent(currentFilterTag)}`;
    }

    window.fetchTags(); 

    try {
        const response = await fetchWithRetry(url, {}, 3); 
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            
            data.data.forEach(content => {
                grid.appendChild(createContentCard(content));
            });

            currentPage = data.pagination.page;
            totalPages = data.pagination.pages;
            
            renderPageNumbers(totalPages, currentPage);
            statusContainer.style.display = 'none'; // Hide status on success

        } else {
            let message = '😢 No content is currently available.';
            if (searchInput.value.trim()) {
                message = `😢 No results found for "${searchInput.value.trim()}". Try simplifying your search.`;
            } else if (currentFilterTag) {
                message = `😢 No content found with tag: "${currentFilterTag}".`;
            }
            
            statusMessage.innerHTML = message;
            pageInfo.textContent = 'Page 0 of 0';
            pageNumbersContainer.innerHTML = '';
            totalPages = 0; 
        }
    } catch (error) {
        console.error("Content Load Error:", error);
        
        // On failure, initiate auto-retry sequence
        statusContainer.style.display = 'block';
        let remainingTime = RETRY_DELAY_MS / 1000;
        
        // Set initial message and start the countdown timer
        statusMessage.innerHTML = `🚨 Failed to connect. Retrying in ${remainingTime}s...`;
        
        countdownInterval = setInterval(() => {
            remainingTime--;
            statusMessage.innerHTML = `🚨 Failed to connect. Retrying in ${remainingTime}s...`;
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        // Set the main retry timeout
        retryTimeout = setTimeout(() => {
            // This will clear the interval inside itself via clearRetryTimers()
            window.loadContent(pageToLoad); 
        }, RETRY_DELAY_MS);
        
        pageInfo.textContent = 'Error';
    } finally {
        // 3. Reset Loading State
        isLoading = false;
    }
};
