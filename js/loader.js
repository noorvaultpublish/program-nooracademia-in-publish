async function initNoorPage() {
    const layoutWrapper = document.getElementById('layout-wrapper');
    const pageContent = document.getElementById('page-content');

    if (!layoutWrapper || !pageContent) {
        console.error("Critical Error: #layout-wrapper or #page-content missing from index.html");
        return;
    }

    try {
        // 1. Fetch all HTML parts
        const headerResponse = await fetch('/templates/header.html');
        if (!headerResponse.ok) throw new Error('Header file not found at /templates/header.html');

        const menuResponse = await fetch('/templates/menu.html');
        if (!menuResponse.ok) throw new Error('Menu file not found at /templates/menu.html');

        const response = await fetch('/templates/default.html');
        if (!response.ok) throw new Error('Template file not found at /templates/default.html');

        const footerResponse = await fetch('/templates/footer.html');
        if (!footerResponse.ok) throw new Error('Footer file not found at /templates/footer.html');
        
        let headerHtml = await headerResponse.text(); // Use 'let' because we'll modify it
        const menuHtml = await menuResponse.text();
        const templateHtml = await response.text();
        const footerHtml = await footerResponse.text();

        // Inject menuHtml into headerHtml before combining
        const parser = new DOMParser();
        const headerDoc = parser.parseFromString(headerHtml, 'text/html');
        const navElement = headerDoc.querySelector('nav');
        if (navElement) {
            navElement.innerHTML = menuHtml; // Inject menu content
            headerHtml = headerDoc.body.innerHTML; // Get the modified header HTML
        } else {
            console.warn("Warning: <nav> element not found in header.html. Menu might not be injected correctly.");
        }

        const combinedHtml = headerHtml + templateHtml + footerHtml;
        
        // 2. Inject the template
        layoutWrapper.innerHTML = combinedHtml;

        // 3. SECURE RENDER: Wait for the browser to recognize the new HTML
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