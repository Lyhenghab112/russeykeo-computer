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

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for all View Product buttons
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('view-product-btn')) {
            const productName = event.target.getAttribute('data-product-name');
            if (productName) {
                // Redirect to product detail page using slug
                window.location.href = `/products/${generateSlug(productName)}`;
            }
        }
    });
});
