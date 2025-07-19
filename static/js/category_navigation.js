document.addEventListener('DOMContentLoaded', function () {
    const categoryElements = document.querySelectorAll('.custom-container .category');

    categoryElements.forEach((categoryElement, index) => {
        categoryElement.style.cursor = 'pointer';
        categoryElement.addEventListener('click', () => {
            // Assuming the categories are in the order: Accessories, Laptops, Desktops, PC Components
            // Map index to category IDs - you may need to adjust these IDs to match your database
            const categoryIds = {
                0: [1, 5], 
                1: 2, 
                2: 3, 
            };
            const categoryId = categoryIds[index];
            if (Array.isArray(categoryId)) {
                // Redirect to multi-category route with comma-separated IDs
                window.location.href = `/products/category/multi/${categoryId.join(',')}`;
            } else if (categoryId) {
                window.location.href = `/products/category/${categoryId}`;
            }
        });
    });
});

