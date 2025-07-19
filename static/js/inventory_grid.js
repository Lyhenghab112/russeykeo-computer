document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('product-grid-container');

    if (!gridContainer) {
        console.warn("Inventory Grid: Container element not found.");
        return;
    }

    async function fetchAllProducts() {
        try {
            // Fetch all products with a large page size
            const response = await fetch('/staff/inventory/search?page_size=1000');
            const data = await response.json();
            if (data.success) {
                renderProductGrid(data.products);
            } else {
                gridContainer.innerHTML = '<p>Error loading products.</p>';
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            gridContainer.innerHTML = '<p>Error loading products.</p>';
        }
    }

    function renderProductGrid(products) {
        gridContainer.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            card.innerHTML = `
                <img src="/static/uploads/products/${product.photo || 'placeholder.png'}" alt="${product.name}" class="product-image" />
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <p class="product-stock">Stock: ${product.stock}</p>
            `;

            gridContainer.appendChild(card);
        });
    }

    fetchAllProducts();
});
