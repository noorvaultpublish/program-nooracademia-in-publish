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
