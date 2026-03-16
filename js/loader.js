let allCourses = []; // To store the master list of courses

async function initNoorPage() {
    const layoutWrapper = document.getElementById('layout-wrapper');
    const pageContent = document.getElementById('page-content');

    if (!layoutWrapper || !pageContent) {
        console.error("Critical Error: #layout-wrapper or #page-content missing from index.html");
        return;
    }

    try {
        // 1. Fetch all HTML parts in parallel for faster loading
        const responses = await Promise.all([
            fetch('./templates/header.html'),
            fetch('./templates/menu.html'),
            fetch('./templates/default.html'),
            fetch('./templates/footer.html')
        ]);
        
        // 2. Check all responses for errors
        const [headerResponse, menuResponse, defaultResponse, footerResponse] = responses;
        if (!headerResponse.ok) throw new Error('Header file not found');
        if (!menuResponse.ok) throw new Error('Menu file not found');
        if (!defaultResponse.ok) throw new Error('Default template not found');
        if (!footerResponse.ok) throw new Error('Footer file not found');

        // 3. Get text from all responses in parallel
        let [headerHtml, menuHtml, templateHtml, footerHtml] = await Promise.all(
            responses.map(res => res.text())
        );

        // 4. More performant menu injection using string replacement instead of DOMParser
        if (headerHtml.includes('<!--MENU_PLACEHOLDER-->')) {
            headerHtml = headerHtml.replace('<!--MENU_PLACEHOLDER-->', menuHtml);
        } else {
            console.warn("Warning: <!--MENU_PLACEHOLDER--> not found in header.html. Menu will not be injected.");
        }

        const combinedHtml = headerHtml + templateHtml + footerHtml;
        
        // 5. Inject the final combined HTML
        layoutWrapper.innerHTML = combinedHtml;

        // 6. SECURE RENDER: Wait for the browser to recognize the new HTML
        // We use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
            const renderArea = document.getElementById('main-content'); // Changed to target main-content as per template
            if (renderArea) {
                renderArea.appendChild(pageContent.content.cloneNode(true)); // Append page-content to main-content
                console.log("Noor Academia: Page loaded successfully.");
                applyActiveState(); // Apply active style to the current page's menu item
                loadCourses(); // Load and render the course cards
                setupMobileMenu(); // Set up the hamburger menu
                setupAnnouncementBar(); // Set up the dismissible banner
            } else {
                console.error("Error: #main-content not found inside /templates/default.html");
            }
        });

    } catch (err) {
        console.error("Loader Error:", err.message);
    }
}

// Ensure the script runs only after the main page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNoorPage);
} else {
    initNoorPage();
}

function applyActiveState() {
    // Normalize current URL (remove trailing slash and 'www.')
    const currentUrl = window.location.href.replace(/\/$/, "").replace(/www\./, '');
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        // Normalize link URL for comparison
        const linkUrl = link.href.replace(/\/$/, "").replace(/www\./, '');

        // The CSS class already handles pointer-events, so we just add/remove the class.
        link.classList.remove('active-program-link');

        // Check if the normalized URLs match
        if (currentUrl === linkUrl) {
            link.classList.add('active-program-link');
        }
    });
}

async function loadCourses() {
    const gridContainer = document.getElementById('course-grid-container');
    if (!gridContainer) {
        console.error("Course grid container not found.");
        return;
    }

    try {
        const response = await fetch('./assets/data/courses.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch course data. Server responded with status: ${response.status}`);
        }
        
        // Manually parse to provide better error logging
        const responseText = await response.text();
        let courses;
        try {
            allCourses = JSON.parse(responseText); // Store courses in the module-level variable
        } catch (parseError) {
            console.error("JSON Parsing Error:", parseError.message);
            console.error("The following text was received from the server but could not be parsed as JSON. It might be an HTML error page.", responseText);
            throw new Error("Invalid JSON format received from server.");
        }

        renderCourses(allCourses); // Initial render
        setupSearchFilter(); // Set up the search input listener

    } catch (err) {
        console.error("Error loading courses:", err.message);
        gridContainer.innerHTML = '<p style="text-align: center; color: red;">Could not load course catalog.</p>';
    }
}

function renderCourses(courses) {
    const gridContainer = document.getElementById('course-grid-container');
    if (!gridContainer) return;

    if (courses.length === 0) {
        gridContainer.innerHTML = '<p class="no-courses-found">No courses found matching your search.</p>';
        return;
    }

    let cardsHtml = '';
    courses.forEach(course => {
        let badge = '';
        let cardClass = 'course-card';

        if (course.status === 'coming-soon') {
            cardClass += ' coming-soon';
            badge = '<span class="badge-soon">Coming Soon</span>';
        } else if (course.status === 'available') {
            badge = '<span class="badge-available">Available</span>';
        }

        cardsHtml += `
            <a href="${course.url}" class="${cardClass}">
                ${badge}
                <div class="card-icon">
                    <img src="${course.iconUrl}" alt="${course.title} Icon" data-icon-text="${course.iconText}" data-cdn-url="${course.iconCdnUrl || ''}">
                </div>
                <h3>${course.title}</h3>
                <p>${course.description}</p>
            </a>
        `;
    });

    gridContainer.innerHTML = cardsHtml;

    // Add error handlers for images to provide a fallback
    const images = gridContainer.querySelectorAll('.card-icon img');
    images.forEach(img => {
        img.onerror = function() {
            // First error: local file failed. Try CDN.
            const cdnUrl = this.dataset.cdnUrl;
            if (cdnUrl && this.src !== cdnUrl) {
                console.warn(`Local icon for ${this.alt} not found. Falling back to CDN: ${cdnUrl}`);
                this.src = cdnUrl;
                // Set a new onerror for the CDN image itself
                this.onerror = function() {
                    // Second error: CDN also failed. Fallback to text.
                    console.error(`CDN icon for ${this.alt} also failed to load. Falling back to text.`);
                    const cardIconDiv = this.parentElement;
                    const fallbackText = this.dataset.iconText || 'N/A';
                    cardIconDiv.innerHTML = fallbackText;
                    cardIconDiv.classList.add('icon-fallback');
                };
            } else {
                // No CDN URL provided, or CDN URL already failed. Fallback to text immediately.
                const cardIconDiv = this.parentElement;
                const fallbackText = this.dataset.iconText || 'N/A';
                cardIconDiv.innerHTML = fallbackText;
                cardIconDiv.classList.add('icon-fallback');
            }
        };
    });
}

function setupSearchFilter() {
    const searchInput = document.getElementById('course-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filteredCourses = allCourses.filter(course => 
            course.title.toLowerCase().includes(searchTerm)
        );
        renderCourses(filteredCourses);
    });
}

function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const overlay = document.querySelector('.overlay');

    if (menuToggle && navLinks && overlay) {
        const closeMenu = () => {
            navLinks.classList.remove('nav-active');
            menuToggle.classList.remove('active');
            document.body.classList.remove('menu-open');
        };

        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            menuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        overlay.addEventListener('click', closeMenu);
    } else {
        // This might run before the menu is injected, so a soft warning is fine.
        console.warn("Mobile menu components (toggle, nav-links, or overlay) not found. Hamburger will not work.");
    }
}

function setupAnnouncementBar() {
    const banner = document.querySelector('.announcement-bar');
    const dismissBtn = document.querySelector('.dismiss-banner-btn');

    if (banner && dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            banner.classList.add('dismissed');
        });
    }
}
