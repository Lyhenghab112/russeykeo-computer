// Utility function to generate URL slugs
function generateSlug(text) {
    if (!text) return "";

    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove special characters except spaces and hyphens
        .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

document.addEventListener('DOMContentLoaded', function () {
    // Carousel
    const sections = document.querySelectorAll('.hero-section');
    const dots = document.querySelectorAll('.dot');
    let currentIndex = 0;

    function showSection(index) {
        if (!sections.length || !dots.length) return;
        sections.forEach((section, i) => {
            section.classList.remove('active', 'animate-in');
            if (i === index) {
                section.classList.add('active', 'animate-in');
            }
        });
        dots.forEach(dot => dot.classList.remove('active'));
        dots[index].classList.add('active');
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            showSection(currentIndex);
        });
        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                currentIndex = index;
                showSection(currentIndex);
            }
        });
    });

    function autoSlide() {
        currentIndex = (currentIndex + 1) % sections.length;
        showSection(currentIndex);
    }

    if (sections.length && dots.length) {
        showSection(currentIndex);
        setInterval(autoSlide, 5000);
    }

    // Login and Create Account
    const loginButton = document.querySelector('nav ul li a[href="login.html"]');
    const createAccountButton = document.querySelector('nav ul li a[href="Register.html"]');

    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    if (createAccountButton) {
        createAccountButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'Register.html';
        });
    }

    // Dropdown Menu
    const menuItems = document.querySelectorAll('nav ul li');
    const mainContent = document.querySelector('.content');

    menuItems.forEach(item => {
        const dropdown = item.querySelector('.dropdown');
        const link = item.querySelector('a[aria-haspopup="true"]');
        if (dropdown && link) {
            item.addEventListener('mouseover', () => {
                dropdown.style.display = 'block';
                link.setAttribute('aria-expanded', 'true');
                if (mainContent) mainContent.classList.add('blur');
            });

            item.addEventListener('mouseout', () => {
                dropdown.style.display = 'none';
                link.setAttribute('aria-expanded', 'false');
                if (mainContent) mainContent.classList.remove('blur');
            });

            item.addEventListener('focusin', () => {
                dropdown.style.display = 'block';
                link.setAttribute('aria-expanded', 'true');
                if (mainContent) mainContent.classList.add('blur');
            });

            item.addEventListener('focusout', (e) => {
                if (!item.contains(e.relatedTarget)) {
                    dropdown.style.display = 'none';
                    link.setAttribute('aria-expanded', 'false');
                    if (mainContent) mainContent.classList.remove('blur');
                }
            });

            // Touch support for dropdowns
            link.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const isExpanded = dropdown.style.display === 'block';
                    dropdown.style.display = isExpanded ? 'none' : 'block';
                    link.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
                    if (mainContent) mainContent.classList.toggle('blur', !isExpanded);
                }
            });
        }
    });

    // Search Bar
    const searchContainer = document.querySelector('.search-container');
    const searchIcon = document.querySelector('.search-icon');
    const searchInput = document.querySelector('.search-input');

    // Use existing suggestions container from HTML
    const suggestionsContainer = document.querySelector('.search-suggestions');

    // Ensure the search container has relative positioning for the dropdown
    if (searchContainer) {
        searchContainer.style.position = 'relative';
    }

    function clearSuggestions() {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }

    function createSuggestionItem(suggestion) {
        const item = document.createElement('div');
        item.textContent = suggestion.name;
        item.style.padding = '8px 12px';
        item.style.borderBottom = '1px solid #333';
        item.style.color = '#000000';
        item.style.backgroundColor = '#ffffff';
        item.addEventListener('click', () => {
            window.location.href = `/products/${generateSlug(suggestion.name)}`;
        });
        item.addEventListener('mouseover', () => {
            item.style.backgroundColor = '#0c0c0c';
            item.style.color = '#ffffff';
        });
        item.addEventListener('mouseout', () => {
            item.style.backgroundColor = '#ffffff';
            item.style.color = '#000000';
        });
        return item;
    }

    async function fetchSuggestions(query) {
        if (!query) {
            clearSuggestions();
            return;
        }
        console.log('Fetching suggestions for query:', query);
        try {
            const response = await fetch(`/api/search_suggestions?q=${encodeURIComponent(query)}`);
            console.log('Response status:', response.status);
            if (!response.ok) {
                console.error('Response not ok:', response.status, response.statusText);
                clearSuggestions();
                return;
            }
            const data = await response.json();
            console.log('Response data:', data);
            if (data.success && data.suggestions.length > 0) {
                console.log('Found suggestions:', data.suggestions.length);
                suggestionsContainer.innerHTML = '';
                data.suggestions.forEach(suggestion => {
                    const item = createSuggestionItem(suggestion);
                    suggestionsContainer.appendChild(item);
                });
                suggestionsContainer.style.display = 'block';
                console.log('Suggestions container displayed');
            } else {
                console.log('No suggestions found or data.success is false');
                clearSuggestions();
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            clearSuggestions();
        }
    }

    if (searchContainer && searchIcon && searchInput) {
        // Handle hover events for search icon
        searchIcon.addEventListener('mouseenter', (event) => {
            searchContainer.classList.add('active');
            searchIcon.setAttribute('aria-expanded', 'true');
            searchInput.focus();
        });

        searchContainer.addEventListener('mouseleave', (event) => {
            // Don't auto-close on mouse leave - let user control when to close
            // This prevents accidental closing while editing text
        });

        // Handle click events for search icon
        searchIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();

            // If search container is not active, just expand it
            if (!searchContainer.classList.contains('active')) {
                searchContainer.classList.add('active');
                searchIcon.setAttribute('aria-expanded', 'true');
                // Use setTimeout to ensure focus is applied after DOM updates
                setTimeout(() => {
                    searchInput.focus();
                }, 10);
            } else {
                // If search container is active, check if there's text
                const query = searchInput.value.trim();
                if (query) {
                    // If there's text, submit the search
                    const form = searchContainer.closest('form');
                    if (form) {
                        form.submit();
                    }
                } else {
                    // If no text, collapse the search
                    searchContainer.classList.remove('active');
                    searchIcon.setAttribute('aria-expanded', 'false');
                    clearSuggestions();
                }
            }
        });

        searchIcon.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();

                // If search container is not active, just expand it
                if (!searchContainer.classList.contains('active')) {
                    searchContainer.classList.add('active');
                    searchIcon.setAttribute('aria-expanded', 'true');
                    searchInput.focus();
                } else {
                    // If search container is active and has text, submit the search
                    const query = searchInput.value.trim();
                    if (query) {
                        // Submit the form
                        const form = searchContainer.closest('form');
                        if (form) {
                            form.submit();
                        }
                    } else {
                        // If no text, just collapse the search
                        searchContainer.classList.remove('active');
                        searchIcon.setAttribute('aria-expanded', 'false');
                        clearSuggestions();
                    }
                }
            }
        });

        // Handle input events
        searchInput.addEventListener('input', (event) => {
            const query = event.target.value.trim();
            console.log('Input event triggered, query:', query);
            fetchSuggestions(query);
        });

        searchInput.addEventListener('focus', (event) => {
            searchContainer.classList.add('active');
            searchIcon.setAttribute('aria-expanded', 'true');
            const query = event.target.value.trim();
            if (query) {
                fetchSuggestions(query);
            }
        });

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    // Use the form's action URL instead of hardcoded search.html
                    const form = searchContainer.closest('form');
                    if (form) {
                        form.submit();
                    } else {
                        window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    }
                }
            } else if (event.key === 'Escape') {
                // Close search on Escape key
                event.preventDefault();
                searchContainer.classList.remove('active');
                searchIcon.setAttribute('aria-expanded', 'false');
                clearSuggestions();
                searchInput.blur(); // Remove focus
            }
        });

        // Handle clicks outside search container
        document.addEventListener('click', (event) => {
            // Don't interfere with navigation links
            if (event.target.tagName === 'A' && event.target.href) {
                return; // Let navigation links work normally
            }

            if (!searchContainer.contains(event.target)) {
                // Only close if the input is empty, otherwise keep it open for editing
                if (!searchInput.value.trim()) {
                    searchContainer.classList.remove('active');
                    searchIcon.setAttribute('aria-expanded', 'false');
                    clearSuggestions();
                } else {
                    // If there's text, just hide suggestions but keep search open
                    clearSuggestions();
                }
            }
        });
    }
});
