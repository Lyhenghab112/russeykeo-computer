document.addEventListener('DOMContentLoaded', () => {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const backBtn = document.getElementById('back-btn');
    const productDetailMain = document.querySelector('main.product-detail');
    const isLoggedIn = productDetailMain ? productDetailMain.getAttribute('data-logged-in') === 'true' : false;

    function saveAvailableProducts(products) {
        localStorage.setItem('availableProducts', JSON.stringify(products));
    }

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (!isLoggedIn) {
                alert('Please log in to add products to your cart.');
                window.location.href = '/auth/login';
                return;
            }
            const productId = addToCartBtn.getAttribute('data-product-id');
            const productName = document.querySelector('.product-info h1').textContent.trim();
            const productPriceText = document.querySelector('.product-info .price').textContent.trim();
            const productPrice = parseFloat(productPriceText.replace('$', ''));

            if (!productId || !productName || isNaN(productPrice)) {
                alert('Product information is incomplete.');
                return;
            }

            let availableProducts = JSON.parse(localStorage.getItem('availableProducts')) || [];
            const existingProduct = availableProducts.find(item => item.id === parseInt(productId));
            if (!existingProduct) {
                availableProducts.push({ id: parseInt(productId), name: productName, price: productPrice });
                saveAvailableProducts(availableProducts);
                alert('Product added to products list!');
            } else {
                alert('Product already in products list.');
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            history.back();
        });
    }
});
