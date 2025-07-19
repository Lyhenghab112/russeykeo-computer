// Function to fetch colors and populate dropdowns
async function fetchAndPopulateColors() {
    try {
        const response = await fetch('/api/colors');
        const data = await response.json();

        if (data.success && data.colors) {
            const productColorSelect = document.getElementById('product-color');
            const editProductColorSelect = document.getElementById('edit-product-color');

            // Clear existing options except the default "Select Color"
            productColorSelect.innerHTML = '<option value="">Select Color</option>';
            editProductColorSelect.innerHTML = '<option value="">Select Color</option>';

            data.colors.forEach(color => {
                const option = document.createElement('option');
                option.value = color.name; // Changed from color.id to color.name to send color name to backend
                option.textContent = color.name;
                productColorSelect.appendChild(option);
                editProductColorSelect.appendChild(option.cloneNode(true)); // Clone for the edit modal
            });
        } else {
            console.error('Error fetching colors:', data.error);
            alert('Could not load colors. Please try again later.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while fetching colors.');
    }
}