document.addEventListener('DOMContentLoaded', function () {
    const brandElements = document.querySelectorAll('.categories .categories .category');

    brandElements.forEach((brandElement, index) => {
        brandElement.style.cursor = 'pointer';
        brandElement.addEventListener('click', () => {
            // Map index to brand names - adjust as needed
            const brandNames = {
                0: 'msi',
                1: 'asus',
                2: 'lenovo',
                
                3: 'acer',
                4:  'dell',
                5: 'razer',
                6: 'hp',



            };
            const brandName = brandNames[index];
            if (brandName) {
                window.location.href = `/products/brand/${brandName}`;
            }
        });
    });
});

