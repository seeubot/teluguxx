// --- CONFIGURATION CONSTANTS ---
// INSERT YOUR API BASE URL HERE
const API_BASE_URL = 'https://confident-jemima-school1660440-5a325843.koyeb.app';

// INSERT YOUR TELEGRAM URL HERE
const TELEGRAM_URL = 'https://t.me/+oOdTY-zbwCY3MzA1';

// INSERT YOUR BOOKMARK SITE URL HERE
const BOOKMARK_SITE_URL = 'https://domains-kappa.vercel.app/';

// API Endpoints
const CONTENT_ENDPOINT = `${API_BASE_URL}/api/content`;
const TRACK_VIEW_ENDPOINT = `${API_BASE_URL}/api/track-view`;
const CATEGORIES_ENDPOINT = `${API_BASE_URL}/api/categories`; 

// App Configuration
const ITEMS_PER_PAGE = 20;
const RETRY_DELAY_MS = 5000; 
const MAX_TITLE_LENGTH = 35; 
const SIMILAR_CONTENT_LIMIT = 6; 

// --- Global State ---
let currentPage = 0; 
let totalPages = 0;
let lastScrollTop = 0; 
let currentFilterCategory = ''; 
let isLoading = false; 
let retryTimeout = null; 
let countdownInterval = null; 
let currentVideoContent = null; 
let similarContentPage = 1; 
let hasMoreSimilarContent = true; 

// --- DOM Elements ---
let header, grid, pageInfo, categoriesContainer, searchInput, statusContainer, statusMessage;
let fabScrollTop, pageNumbersContainer, mainContent, videoPlayerPage, videoPlayerTitle;
let videoPlayerIframe, videoLinksContainer, similarContentGrid, similarContentLoading;
let loadMoreButton, similarContentSection, sideMenu, menuBackdrop, searchContainer;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    setupTelegramLinks();
    
    if (header) {
        header.style.transition = 'top 0.3s ease-in-out';
    }
    
    window.loadContent(1); // Initial content load
    window.fetchCategories(); 
});

/**
 * Initialize all DOM elements
 */
function initializeDOMElements() {
    header = document.querySelector('header');
    grid = document.getElementById('content-grid');
    pageInfo = document.getElementById('page-info');
    categoriesContainer = document.getElementById('categories-container');
    searchInput = document.getElementById('search-input');
    statusContainer = document.getElementById('status-container');
    statusMessage = document.getElementById('status-message');
    fabScrollTop = document.getElementById('fab-scroll-top');
    pageNumbersContainer = document.getElementById('page-numbers-container');
    mainContent = document.getElementById('main-content');
    videoPlayerPage = document.getElementById('video-player-page');
    videoPlayerTitle = document.getElementById('video-player-title');
    videoPlayerIframe = document.getElementById('video-player-iframe');
    videoLinksContainer = document.getElementById('video-links');
    similarContentGrid = document.getElementById('similar-content-grid');
    similarContentLoading = document.getElementById('similar-content-loading');
    similarContentSection = document.getElementById('similar-content-section');
    sideMenu = document.getElementById('side-menu');
    menuBackdrop = document.querySelector('.menu-backdrop');
    searchContainer = document.getElementById('search-container');
    
    // Create Load More button for similar content
    loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'load-more-similar';
    loadMoreButton.className = 'load-more-btn mt-6 mx-auto px-6 py-3 text-background-dark rounded-xl font-semibold btn-smooth hidden';
    loadMoreButton.style.backgroundColor = 'var(--primary-color)';
    loadMoreButton.innerHTML = '<i class="fas fa-plus-circle mr-2"></i> Load More Similar Content';
    loadMoreButton.onclick = () => window.loadMoreSimilarContent();
    similarContentSection.appendChild(loadMoreButton);
}

/**
 * Setup Telegram links with the configured URL
 */
function setupTelegramLinks() {
    const telegramLinkMenu = document.getElementById('telegram-link-menu');
    const footerTelegramLink = document.getElementById('footer-telegram-link');
    
    if (telegramLinkMenu) telegramLinkMenu.href = TELEGRAM_URL;
    if (footerTelegramLink) footerTelegramLink.href = TELEGRAM_URL;
}

// --- Utility Functions ---

/**
 * Toggles the side menu visibility
 */
window.toggleSideMenu = () => {
    if (!sideMenu || !menuBackdrop) return;
    
    if (searchContainer.classList.contains('active')) {
        window.toggleSearchBar(true); // Close search bar if open
    }
    
    sideMenu.classList.toggle('active');
    menuBackdrop.style.display = sideMenu.classList.contains('active') ? 'block' : 'none';
};

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
    if (!header || !fabScrollTop) return;

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // Header logic (Hide/Show on scroll)
    if (currentScroll > lastScrollTop && currentScroll > header.offsetHeight) {
        header.style.top = `-${header.offsetHeight + 10}px`; 
        if (searchContainer.classList.contains('active')) {
            searchContainer.style.top = `-100px`; // Also hide search bar smoothly
        }
    } else {
        header.style.top = '0';
        if (searchContainer.classList.contains('active')) {
             searchContainer.style.top = `${header.offsetHeight}px`; // Move search bar back down
        }
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    
    // FAB logic
    if (currentScroll > 500) { 
        fabScrollTop.style.display = 'flex'; 
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
        
        // Define button styles based on context
        let baseClass = 'px-4 py-3 rounded-xl font-semibold btn-smooth focus:outline-none text-sm col-span-1';
        let styleClass = '';
        if (btn.type === 'confirm') {
            styleClass = 'bg-primary-color hover:bg-secondary-color text-background-dark shadow-md';
        } else if (btn.type === 'cancel') {
             styleClass = 'bg-dark-gray hover:bg-[#4b5563] text-white';
        } else {
            styleClass = 'bg-dark-gray hover:bg-[#4b5563] text-white';
        }

        buttonElement.className = `${baseClass} ${styleClass}`; 
        
        buttonElement.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300); 
            if (btn.handler) {
                btn.handler();
            }
        };
        buttonsContainer.appendChild(buttonElement);
    });

    buttonsContainer.className = 'mt-6 grid grid-cols-2 gap-4';

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Shows the About Modal.
 */
window.showAboutModal = () => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#4ade80';
    const message = `
        <p style="color: ${primaryColor}; font-weight:900; font-size:1.6em; margin-bottom: 25px;">
            <i class="fas fa-info-circle"></i> About This Hub
        </p>
        <p style="text-align: center; margin-bottom: 20px; font-size: 1.1em; color: var(--text-primary);">
            Welcome to the Minimalist Content Hub.
        </p>
        <p style="font-size: 0.9em; text-align: center; color: var(--text-secondary);">
            The modern interface ensures a smooth experience across all devices. Data is sourced from a dedicated backend API.
        </p>
    `;

    const actionButtons = [
        { 
            text: 'Close', 
            type: 'cancel',
            handler: () => {} 
        },
    ];

    showCustomModal(message, actionButtons);
};

/**
 * Handles the "Bookmark Site" button click, showing the backup URL and report info.
 */
window.bookmarkSite = () => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#4ade80';
    const darkGray = getComputedStyle(document.documentElement).getPropertyValue('--card-dark') || '#1f2937';
    const warningColor = '#ef4444'; // Red for warning
    
    const message = `
        <p style="color: ${primaryColor}; font-weight:900; font-size:1.6em; margin-bottom: 25px;">
            <i class="fas fa-link"></i> Permanent Site
        </p>
        <p style="text-align: left; margin-bottom: 20px; font-size: 1.1em; color: var(--text-primary);">
            Bookmark this link to always find us:
        </p>
        <div style="background-color: ${darkGray}; padding: 18px; border-radius: 12px; margin-bottom: 25px; word-break: break-all; border: 2px solid ${primaryColor};">
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
            type: 'cancel',
            handler: () => window.open(TELEGRAM_URL, '_blank') 
        },
        { 
            text: '<i class="fas fa-external-link-alt"></i> Go to Backup Site', 
            type: 'confirm',
            handler: () => window.open(BOOKMARK_SITE_URL, '_blank') 
        }
    ];

    showCustomModal(message, actionButtons);
};

/**
 * Shows the video player page with the selected content
 */
window.showVideoPlayer = (content) => {
    
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content.replace(/&quot;/g, '"'));
        } catch (e) {
            console.error("Failed to parse content JSON string:", e);
            showCustomModal('<p class="text-xl font-bold text-red-500">Video Load Error</p><p class="mt-4">The content data could not be parsed. Please try refreshing the page.</p>', [{ text: 'OK', type: 'confirm', handler: () => {} }]);
            return; 
        }
    }
    
    window.trackView(content._id);
    currentVideoContent = content;
    similarContentPage = 1;
    hasMoreSimilarContent = true;
    videoPlayerTitle.textContent = content.title;
    videoPlayerIframe.src = ''; 
    videoLinksContainer.innerHTML = '';
    
    if (content.links && content.links.length > 0) {
        videoPlayerIframe.src = content.links[0].url;

        content.links.forEach((link, index) => {
            const linkButton = document.createElement('button');
            const isActive = index === 0 ? 'active' : '';
            
            linkButton.className = `episode-link-chip px-3 py-2 btn-smooth ${isActive}`;
            linkButton.textContent = link.episode_title || `Link ${index + 1}`;
            
            // Set style for link buttons (defined inline here for simplicity)
            linkButton.style.backgroundColor = 'var(--dark-gray)';
            linkButton.style.color = 'var(--text-primary)';
            if (isActive) {
                 linkButton.style.backgroundColor = 'var(--primary-color)';
                 linkButton.style.color = 'var(--background-dark)';
            }
            linkButton.onmouseover = () => linkButton.style.backgroundColor = isActive ? 'var(--secondary-color)' : '#4b5563';
            linkButton.onmouseout = () => linkButton.style.backgroundColor = isActive ? 'var(--primary-color)' : 'var(--dark-gray)';


            linkButton.onclick = (event) => {
                videoLinksContainer.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = 'var(--dark-gray)';
                    btn.style.color = 'var(--text-primary)';
                });
                event.target.classList.add('active');
                event.target.style.backgroundColor = 'var(--primary-color)';
                event.target.style.color = 'var(--background-dark)';

                videoPlayerIframe.src = link.url;
            };
            videoLinksContainer.appendChild(linkButton);
        });
    }
    
    mainContent.style.display = 'none';
    videoPlayerPage.style.display = 'block';
    
    window.loadSimilarContent(content, 1, true);
    
    window.scrollToTop();
};

/**
 * Shows the main content page and hides the video player
 */
window.showMainPage = () => {
    mainContent.style.display = 'block';
    videoPlayerPage.style.display = 'none';
    
    videoPlayerIframe.src = '';
    videoPlayerTitle.textContent = '';
    videoLinksContainer.innerHTML = '';
    similarContentGrid.innerHTML = '';
    if (loadMoreButton) loadMoreButton.classList.add('hidden');
    currentVideoContent = null;
    
    window.scrollToTop();
};

/**
 * Loads similar content based on the tags of the current video
 */
window.loadSimilarContent = async (content, page = 1, clearExisting = false) => {
    if (!similarContentGrid) return;
    
    if (clearExisting) {
        similarContentGrid.innerHTML = '';
        loadMoreButton.classList.add('hidden');
    }
    
    if (!content.tags || content.tags.length === 0) {
        if (clearExisting) {
            similarContentGrid.innerHTML = '<p class="col-span-full text-center text-secondary-text">No related tags available to find similar content.</p>';
        }
        similarContentLoading.style.display = 'none';
        loadMoreButton.classList.add('hidden');
        return;
    }

    similarContentLoading.style.display = 'flex';
    loadMoreButton.classList.add('hidden');

    try {
        // Use the first tag for similarity matching
        const tag = content.tags[0];
        const url = `${CONTENT_ENDPOINT}?tag=${encodeURIComponent(tag)}&limit=${SIMILAR_CONTENT_LIMIT}&page=${page}`; 
        
        const response = await fetchWithRetry(url, {}, 2);
        const data = await response.json();

        similarContentLoading.style.display = 'none';

        if (data.success && data.data) {
            
            const similarContent = data.data.filter(item => item._id !== content._id);
            
            if (similarContent.length > 0 || !clearExisting) {
                const similarContentHTML = similarContent.map(item => createSimilarContentCard(item)).join('');
                
                if (clearExisting) {
                    similarContentGrid.innerHTML = similarContentHTML;
                } else {
                    similarContentGrid.innerHTML += similarContentHTML;
                }
                
                const isFinalPage = data.pagination && data.pagination.page * SIMILAR_CONTENT_LIMIT >= data.pagination.total_items;

                if (data.pagination && data.pagination.page < data.pagination.pages && !isFinalPage) {
                    hasMoreSimilarContent = true;
                    loadMoreButton.classList.remove('hidden');
                } else {
                    hasMoreSimilarContent = false;
                    loadMoreButton.classList.add('hidden');
                }
            } else {
                if (clearExisting) {
                    similarContentGrid.innerHTML = '<p class="col-span-full text-center text-secondary-text">No similar content found.</p>';
                }
                loadMoreButton.classList.add('hidden');
            }
        } else {
            if (clearExisting) {
                similarContentGrid.innerHTML = '<p class="col-span-full text-center text-secondary-text">No similar content found.</p>';
            }
            loadMoreButton.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error loading similar content:", error);
        similarContentLoading.style.display = 'none';
        if (clearExisting) {
            similarContentGrid.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load similar content.</p>';
        }
        loadMoreButton.classList.add('hidden');
    }
};

/**
 * Loads more similar content when Load More button is clicked
 */
window.loadMoreSimilarContent = async () => {
    if (!currentVideoContent || !hasMoreSimilarContent) return;
    
    loadMoreButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading...';
    loadMoreButton.disabled = true;

    similarContentPage++;
    await window.loadSimilarContent(currentVideoContent, similarContentPage, false);
    
    loadMoreButton.innerHTML = '<i class="fas fa-plus-circle mr-2"></i> Load More Similar Content';
    loadMoreButton.disabled = false;
};

/**
 * Creates a card for similar content
 */
const createSimilarContentCard = (content) => {
    const truncatedTitle = content.title.length > 50 
        ? content.title.substring(0, 50).trim() + '...' 
        : content.title;
        
    const views = content.views !== undefined && !isNaN(content.views) ? Number(content.views).toLocaleString() : '0';
    const staticThumbnail = content.thumbnail_url || 'https://placehold.co/300x200/1f2937/4ade80?text=ADULT-HUB';
    
    const contentString = JSON.stringify(content).replace(/"/g, '&quot;');
    
    return `
        <div class="similar-content-card" onclick="window.showVideoPlayer('${contentString}')">
            <div class="similar-card-image-container relative">
                <img class="similar-card-image" 
                     src="${staticThumbnail}" 
                     alt="${content.title}" 
                     onerror="this.onerror=null; this.src='https://placehold.co/300x200/1f2937/4ade80?text=ADULT-HUB Placeholder'">
            </div>
            <div class="similar-card-info">
                <h3 class="similar-card-title text-sm font-extrabold text-white mb-1" title="${content.title}">${truncatedTitle}</h3>
                <div class="similar-card-meta text-xs text-secondary-text">
                    <span class="flex items-center"><i class="fas fa-eye mr-1 text-primary-color"></i> ${views}</span>
                    <span class="ml-2">${content.type ? content.type.toUpperCase() : 'UNKNOWN'}</span>
                </div>
            </div>
        </div>
    `;
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
 * @param {boolean} forceClose - If true, forces the search bar to close without toggling.
 */
window.toggleSearchBar = (forceClose = false) => {
    
    if (!searchContainer || !searchInput) return;

    if (sideMenu.classList.contains('active')) {
        window.toggleSideMenu(); // Close side menu if open
    }

    if (forceClose || searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        searchContainer.style.top = `${header.offsetHeight}px`; // Reset for smooth closing transition
        searchContainer.style.top = '-100px'; 
        
        // If search was active, but input is now empty, treat it as closing
        const wasSearching = searchInput.value.trim() !== '';
        if (!forceClose && !wasSearching && (wasSearching || currentFilterCategory)) {
            currentFilterCategory = ''; 
            window.loadContent(1); 
            window.fetchCategories(); 
        }
        searchInput.value = '';
    } else {
        searchContainer.classList.add('active');
        searchContainer.style.top = `${header.offsetHeight}px`; // Ensure it slides down right under header
        searchInput.focus();
    }
};

/**
 * Fetches and renders unique content categories inside the side menu.
 */
window.fetchCategories = async () => {
    if (!categoriesContainer) return;
    
    if (categoriesContainer.innerHTML.includes('No categories available') || categoriesContainer.innerHTML.includes('Failed to load categories') || categoriesContainer.innerHTML === '') {
         categoriesContainer.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading categories...';
    } 

    try {
        const response = await fetchWithRetry(CATEGORIES_ENDPOINT, {}, 2); 
        const data = await response.json();

        if (data.success && data.tags && data.tags.length > 0) {
            
            let categoriesHtml = `<span class="chip ${currentFilterCategory === '' ? 'active-category' : ''} px-3 py-1 rounded-full text-xs font-medium cursor-pointer btn-smooth" onclick="window.filterByCategory('')">All Content</span>`;
            
            categoriesHtml += data.tags.map(category => {
                const isActive = category === currentFilterCategory ? 'active-category' : '';
                return `<span class="chip ${isActive} px-3 py-1 rounded-full text-xs font-medium cursor-pointer btn-smooth" onclick="window.filterByCategory('${category}')">${category}</span>`;
            }).join('');
            
            categoriesContainer.innerHTML = categoriesHtml;
        } else {
            categoriesContainer.innerHTML = '<span class="text-sm text-secondary-text">No categories available.</span>';
        }
    } catch (error) {
        console.error("Category Fetch Error:", error);
        categoriesContainer.innerHTML = '<span class="text-sm text-red-500">Failed to load categories.</span>';
    }
};

/**
 * Handles filtering content by clicking a category chip.
 */
window.filterByCategory = (category) => {
    searchInput.value = ''; 
    
    currentFilterCategory = category; 
    
    window.loadContent(1);
    window.fetchCategories(); // Re-render categories to ensure highlighting is correct
    window.toggleSideMenu(); // Close the menu after selecting a category
};

/**
 * Creates the HTML element for a single content card. 
 */
const createContentCard = (content) => {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-id', content._id);

    const truncatedTitle = content.title.length > MAX_TITLE_LENGTH 
        ? content.title.substring(0, MAX_TITLE_LENGTH).trim() + '...' 
        : content.title;

    const tagsHtml = (content.tags || []).slice(0, 3).map(tag => `<span class="chip px-2 py-1 rounded-full text-xs">${tag}</span>`).join('');
    const date = content.created_at ? new Date(content.created_at).toLocaleDateString() : 'N/A';
    const views = content.views !== undefined && !isNaN(content.views) ? Number(content.views).toLocaleString() : '0';
    
    const staticThumbnail = content.thumbnail_url || 'https://placehold.co/300x200/1f2937/4ade80?text=ADULT-HUB';
    
    const contentString = JSON.stringify(content).replace(/"/g, '&quot;');
    
    // MODIFICATION START: Updated action area for centering and full-width button on mobile
    const actionAreaHtml = `
        <div class="action-button mt-4 flex justify-center w-full">
            <button class="watch-btn btn-smooth shadow-xl w-full sm:w-auto text-lg" onclick="event.stopPropagation(); window.showVideoPlayer('${contentString}')">
                <i class="fas fa-play-circle mr-1"></i> Watch Now
            </button>
        </div>
    `;
    // MODIFICATION END: Updated action area for centering and full-width button on mobile

    card.onclick = () => window.showVideoPlayer(contentString);

    card.innerHTML = `
        <div class="card-image-container relative">
            <img class="card-image" 
                    src="${staticThumbnail}" 
                    alt="${content.title}" 
                    onerror="this.onerror=null; this.src='https://placehold.co/300x200/1f2937/4ade80?text=ADULT-HUB Placeholder'}">
        </div>
        
        <div class="card-info p-5 flex flex-col flex-grow">
            <h3 class="text-xl font-extrabold mb-2" title="${content.title}">${truncatedTitle}</h3>
            <div class="flex justify-between text-sm text-secondary-text mb-2">
                <span class="font-semibold"><i class="fas fa-tag text-primary-color mr-1"></i> ${content.type ? content.type.toUpperCase() : 'UNKNOWN'}</span>
                <span><i class="fas fa-calendar-alt text-primary-color mr-1"></i> ${date}</span>
            </div>
            <p class="flex items-center text-sm mb-2 text-secondary-text">
                <i class="fas fa-eye text-primary-color mr-2"></i> 
                Views: <strong class="views-count ml-1 text-white">${views}</strong>
            </p>
            ${actionAreaHtml}
            <div class="mt-auto pt-4 border-t border-[#374151] flex flex-wrap gap-2">${tagsHtml}</div>
        </div>
    `;
    
    return card;
};

/**
 * Creates and renders the clickable page number buttons.
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
 * Fetches and displays content based on current page and search query/category filter.
 */
window.loadContent = async (page = 1) => {
    clearRetryTimers();
    
    if (isLoading) return; 

    const pageToLoad = page < 1 ? 1 : page; 
    
    // Hide search bar if content is being loaded (or cleared)
    if (searchContainer.classList.contains('active') && !searchInput.value.trim() && !currentFilterCategory) {
        window.toggleSearchBar(true); 
    }


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
        currentFilterCategory = ''; 
    } else if (currentFilterCategory) {
         url += `&tag=${encodeURIComponent(currentFilterCategory)}`;
    }

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
            statusContainer.style.display = 'none'; 

        } else {
            let message = '😢 No content is currently available.';
            if (searchInput.value.trim()) {
                message = `😢 No results found for "<strong class="text-primary-color">${searchInput.value.trim()}</strong>". Try simplifying your search.`;
            } else if (currentFilterCategory) {
                message = `😢 No content found in category: "<strong class="text-primary-color">${currentFilterCategory}</strong>".`;
            }
            
            statusMessage.innerHTML = message;
            pageInfo.textContent = 'Page 0 of 0';
            pageNumbersContainer.innerHTML = '';
            totalPages = 0; 
        }
    } catch (error) {
        console.error("Content Load Error:", error);
        
        statusContainer.style.display = 'block';
        let remainingTime = RETRY_DELAY_MS / 1000;
        
        statusMessage.innerHTML = `🚨 Failed to connect. Retrying in ${remainingTime}s...`;
        
        countdownInterval = setInterval(() => {
            remainingTime--;
            statusMessage.innerHTML = `🚨 Failed to connect. Retrying in ${remainingTime}s...`;
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        retryTimeout = setTimeout(() => {
            window.loadContent(pageToLoad); 
        }, RETRY_DELAY_MS);
        
        pageInfo.textContent = 'Error';
    } finally {
        isLoading = false;
    }
};
