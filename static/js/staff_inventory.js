document.addEventListener('DOMContentLoaded', () => {
    const addProductModal = document.getElementById('add-product-modal');
    const editProductModal = document.getElementById('edit-product-modal');
    const addProductBtn = document.getElementById('add-product-btn');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const productForm = document.getElementById('product-form');
    const editProductForm = document.getElementById('edit-product-form');
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const mobileInventoryList = document.getElementById('mobile-inventory-list');
    const searchInput = document.getElementById('search-products');
    const searchBtn = document.getElementById('search-btn');
    const paginationContainer = document.getElementById('pagination');

    let currentPage = 1;
    let pageSize = 10;
    let sortBy = 'id';
    let sortDir = 'asc';
    let currentQuery = '';
    let currentCategoryFilter = '';
    let currentBrandFilter = '';
    let currentStockFilter = '';

    let selectedFiles = [null, null, null];
    const labels = ['Main Image', 'Back View', 'Left Rear View'];
    let editSelectedFiles = [null, null, null];
    const editLabels = ['Main Image', 'Back View', 'Left Rear View'];

    const imagesInput = document.getElementById('product-images');
    const previewContainer = document.getElementById('image-preview-container');
    const editImagesInput = document.getElementById('edit-product-images');
    const editPreviewContainer = document.getElementById('edit-image-preview-container');

    // Responsive image preview handling
    function updatePreviews() {
        const previewImagesDiv = previewContainer.querySelector('.preview-images');
        previewImagesDiv.innerHTML = '';
        const screenWidth = window.innerWidth;
        const imageSize = screenWidth < 576 ? '80px' : '100px';

        const hasAnyFile = selectedFiles.some(file => file !== null);
        if (!hasAnyFile) {
            previewContainer.style.display = 'none';
            return;
        }

        previewContainer.style.display = 'flex';
        selectedFiles.forEach((file, index) => {
            if (file) {
                const reader = new FileReader();
                reader.onload = function(readerEvent) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'image-preview-item';
                    previewDiv.style.cssText = `
                        text-align: center;
                        border: 1px solid #ddd;
                        padding: 8px;
                        border-radius: 6px;
                        position: relative;
                        background: #f9f9f9;
                        width: ${screenWidth < 576 ? '100%' : 'auto'};
                        max-width: ${imageSize};
                    `;
                    previewDiv.innerHTML = `
                        <div style="font-size: ${screenWidth < 576 ? '10px' : '12px'}; font-weight: bold; margin-bottom: 5px; color: #495057;">
                            ${labels[index]}
                        </div>
                        <img src="${readerEvent.target.result}" style="max-width: ${imageSize}; max-height: ${imageSize}; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                        <div style="font-size: ${screenWidth < 576 ? '8px' : '10px'}; margin-top: 4px; color: #6c757d; word-break: break-all;">
                            ${file.name}
                        </div>
                        <button type="button" onclick="removeImage(${index})" style="position: absolute; top: 2px; right: 2px; background: none; color: #666; border: none; font-size: ${screenWidth < 576 ? '12px' : '14px'}; cursor: pointer; line-height: 1; padding: 0; width: 16px; height: 16px;" title="Remove image">×</button>
                        <button type="button" onclick="replaceImage(${index})" style="position: absolute; bottom: 2px; right: 2px; background: #007bff; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: ${screenWidth < 576 ? '8px' : '10px'}; cursor: pointer;" title="Replace image">Replace</button>
                    `;
                    previewImagesDiv.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function updateEditPreviews() {
        const editPreviewImagesDiv = editPreviewContainer.querySelector('.preview-images');
        editPreviewImagesDiv.innerHTML = '';
        const screenWidth = window.innerWidth;
        const imageSize = screenWidth < 576 ? '80px' : '100px';

        const hasAnyFile = editSelectedFiles.some(file => file !== null);
        if (!hasAnyFile) {
            editPreviewContainer.style.display = 'none';
            return;
        }

        editPreviewContainer.style.display = 'flex';
        editSelectedFiles.forEach((file, index) => {
            if (file) {
                const reader = new FileReader();
                reader.onload = function(readerEvent) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'image-preview-item';
                    previewDiv.style.cssText = `
                        text-align: center;
                        border: 1px solid #ddd;
                        padding: 8px;
                        border-radius: 6px;
                        position: relative;
                        background: #f9f9f9;
                        width: ${screenWidth < 576 ? '100%' : 'auto'};
                        max-width: ${imageSize};
                    `;
                    previewDiv.innerHTML = `
                        <div style="font-size: ${screenWidth < 576 ? '10px' : '12px'}; font-weight: bold; margin-bottom: 5px; color: #495057;">
                            ${editLabels[index]}
                        </div>
                        <img src="${readerEvent.target.result}" style="max-width: ${imageSize}; max-height: ${imageSize}; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                        <div style="font-size: ${screenWidth < 576 ? '8px' : '10px'}; margin-top: 4px; color: #6c757d; word-break: break-all;">
                            ${file.name}
                        </div>
                        <button type="button" onclick="removeEditImage(${index})" style="position: absolute; top: 2px; right: 2px; background: none; color: #666; border: none; font-size: ${screenWidth < 576 ? '12px' : '14px'}; cursor: pointer; line-height: 1; padding: 0; width: 16px; height: 16px;" title="Remove image">×</button>
                        <button type="button" onclick="replaceEditImage(${index})" style="position: absolute; bottom: 2px; right: 2px; background: #007bff; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: ${screenWidth < 576 ? '8px' : '10px'}; cursor: pointer;" title="Replace image">Replace</button>
                    `;
                    editPreviewImagesDiv.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Image selection handlers
    if (imagesInput && previewContainer) {
        const previewImagesDiv = previewContainer.querySelector('.preview-images');
        imagesInput.setAttribute('multiple', 'multiple');

        imagesInput.addEventListener('change', function(e) {
            let files = Array.from(e.target.files);
            if (files.length === 0) return;

            if (files.length > 3) {
                showMessage('Maximum 3 images allowed. Only the first 3 will be used.', 'warning');
                files = files.slice(0, 3);
            }

            let fileIndex = 0;
            const currentCount = selectedFiles.filter(file => file !== null).length;

            if (files.length === 1 && currentCount > 0) {
                for (let slotIndex = 0; slotIndex < 3 && fileIndex < files.length; slotIndex++) {
                    if (selectedFiles[slotIndex] === null) {
                        const file = files[fileIndex];
                        if (file.type.startsWith('image/')) {
                            selectedFiles[slotIndex] = file;
                            fileIndex++;
                            break;
                        } else {
                            showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                            fileIndex++;
                        }
                    }
                }
            } else {
                for (let slotIndex = 0; slotIndex < 3 && fileIndex < files.length; slotIndex++) {
                    const file = files[fileIndex];
                    if (file.type.startsWith('image/')) {
                        selectedFiles[slotIndex] = file;
                        fileIndex++;
                    } else {
                        showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                        fileIndex++;
                    }
                }
            }

            updatePreviews();
            syncMultipleSelectionInput();
            e.target.value = '';
        });

        window.removeImage = function(index) {
            selectedFiles[index] = null;
            updatePreviews();
            syncMultipleSelectionInput();
        };

        window.replaceImage = function(index) {
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = 'image/*';
            tempInput.style.display = 'none';
            tempInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    selectedFiles[index] = file;
                    updatePreviews();
                    syncMultipleSelectionInput();
                } else if (file) {
                    showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                }
                document.body.removeChild(tempInput);
            });
            document.body.appendChild(tempInput);
            tempInput.click();
        };

        function syncMultipleSelectionInput() {
            const dt = new DataTransfer();
            selectedFiles.forEach(file => {
                if (file) dt.items.add(file);
            });
            imagesInput.files = dt.files;
        }
    }

    if (editImagesInput && editPreviewContainer) {
        const editPreviewImagesDiv = editPreviewContainer.querySelector('.preview-images');
        editImagesInput.setAttribute('multiple', 'multiple');

        editImagesInput.addEventListener('change', function(e) {
            let files = Array.from(e.target.files);
            if (files.length === 0) return;

            if (files.length > 3) {
                showMessage('Maximum 3 images allowed. Only the first 3 will be used.', 'warning');
                files = files.slice(0, 3);
            }

            let fileIndex = 0;
            const currentCount = editSelectedFiles.filter(file => file !== null).length;

            if (files.length === 1 && currentCount > 0) {
                for (let slotIndex = 0; slotIndex < 3 && fileIndex < files.length; slotIndex++) {
                    if (editSelectedFiles[slotIndex] === null) {
                        const file = files[fileIndex];
                        if (file.type.startsWith('image/')) {
                            editSelectedFiles[slotIndex] = file;
                            fileIndex++;
                            break;
                        } else {
                            showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                            fileIndex++;
                        }
                    }
                }
            } else {
                for (let slotIndex = 0; slotIndex < 3 && fileIndex < files.length; slotIndex++) {
                    const file = files[fileIndex];
                    if (file.type.startsWith('image/')) {
                        editSelectedFiles[slotIndex] = file;
                        fileIndex++;
                    } else {
                        showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                        fileIndex++;
                    }
                }
            }

            updateEditPreviews();
            syncEditMultipleSelectionInput();
            e.target.value = '';
        });

        window.removeEditImage = function(index) {
            editSelectedFiles[index] = null;
            updateEditPreviews();
            syncEditMultipleSelectionInput();
        };

        window.replaceEditImage = function(index) {
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = 'image/*';
            tempInput.style.display = 'none';
            tempInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    editSelectedFiles[index] = file;
                    updateEditPreviews();
                    syncEditMultipleSelectionInput();
                } else if (file) {
                    showMessage(`File "${file.name}" is not a valid image file.`, 'error');
                }
                document.body.removeChild(tempInput);
            });
            document.body.appendChild(tempInput);
            tempInput.click();
        };

        function syncEditMultipleSelectionInput() {
            const dt = new DataTransfer();
            editSelectedFiles.forEach(file => {
                if (file) dt.items.add(file);
            });
            editImagesInput.files = dt.files;
        }
    }

    // Modal open/close handlers
    addProductBtn.addEventListener('click', () => {
        addProductModal.classList.add('show-slide');
        productForm.reset();
        selectedFiles = [null, null, null];
        updatePreviews();
        fetchAndPopulateColors();
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            addProductModal.classList.remove('show-slide');
            editProductModal.classList.remove('show-slide');
            document.getElementById('product-detail-modal').classList.remove('show-slide');
            clearEditModalImages();
        });
    });

    function clearEditModalImages() {
        editSelectedFiles = [null, null, null];
        if (editPreviewContainer) {
            editPreviewContainer.style.display = 'none';
            editPreviewImagesDiv.innerHTML = '';
        }
        if (editImagesInput) {
            editImagesInput.value = '';
        }
    }

    // Form submissions
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(productForm);
        formData.append('cpu', document.getElementById('product-cpu').value);
        formData.append('ram', document.getElementById('product-ram').value);
        formData.append('storage', document.getElementById('product-storage').value);
        formData.append('graphics', document.getElementById('product-graphics').value);
        formData.append('display', document.getElementById('product-display').value);
        formData.append('os', document.getElementById('product-os').value);
        formData.append('keyboard', document.getElementById('product-keyboard').value);
        formData.append('battery', document.getElementById('product-battery').value);
        formData.append('weight', document.getElementById('product-weight').value);
        formData.append('warranty_id', document.getElementById('product-warranty-id').value);
        formData.append('color', document.getElementById('product-color').value);
        formData.append('original_price', document.getElementById('product-original-price').value);

        if (selectedFiles[0]) formData.append('photo', selectedFiles[0]);
        if (selectedFiles[1]) formData.append('photo_back', selectedFiles[1]);
        if (selectedFiles[2]) formData.append('photo_left_rear', selectedFiles[2]);

        try {
            formData.delete('front_view');
            const response = await fetch('/staff/inventory/create', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                addProductModal.classList.remove('show-slide');
                fetchInventory();
                showMessage('Product added successfully!', 'success');
            } else {
                showMessage('Error: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while adding the product.', 'error');
        }
    });

    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-product-id').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('edit-product-name').value);
        formData.append('description', document.getElementById('edit-product-desc').value);
        formData.append('price', document.getElementById('edit-product-price').value);
        formData.append('original_price', document.getElementById('edit-product-original-price').value);
        formData.append('stock', document.getElementById('edit-product-stock').value);
        formData.append('category', document.getElementById('edit-product-category').value);
        formData.append('cpu', document.getElementById('edit-product-cpu').value);
        formData.append('ram', document.getElementById('edit-product-ram').value);
        formData.append('storage', document.getElementById('edit-product-storage').value);
        formData.append('graphics', document.getElementById('edit-product-graphics').value);
        formData.append('display', document.getElementById('edit-product-display').value);
        formData.append('os', document.getElementById('edit-product-os').value);
        formData.append('keyboard', document.getElementById('edit-product-keyboard').value);
        formData.append('battery', document.getElementById('edit-product-battery').value);
        formData.append('weight', document.getElementById('edit-product-weight').value);
        formData.append('warranty_id', document.getElementById('edit-product-warranty-id').value);
        formData.append('color', document.getElementById('edit-product-color').value);

        if (editSelectedFiles[0]) formData.append('photo', editSelectedFiles[0]);
        if (editSelectedFiles[1]) formData.append('photo_back', editSelectedFiles[1]);
        if (editSelectedFiles[2]) formData.append('photo_left_rear', editSelectedFiles[2]);

        try {
            const response = await fetch(`/staff/inventory/${productId}/update`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                editProductModal.classList.remove('show-slide');
                fetchInventory();
                showMessage('Product updated successfully!', 'success');
            } else {
                showMessage('Error: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while updating the product.', 'error');
        }
    });

    // Fetch inventory
    async function fetchInventory(page = currentPage) {
        currentPage = page;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const brandQuery = urlParams.get('q') || '';
            const productId = urlParams.get('product_id');
            let url = `/staff/inventory/search?page=${currentPage}&page_size=${pageSize}&sort_by=${sortBy}&sort_dir=${sortDir}`;
            if (productId) url += `&product_id=${encodeURIComponent(productId)}`;
            if (brandQuery) url += `&brand_filter=${encodeURIComponent(brandQuery)}`;
            else if (currentBrandFilter) url += `&brand_filter=${encodeURIComponent(currentBrandFilter)}`;
            if (currentCategoryFilter) url += `&category_filter=${encodeURIComponent(currentCategoryFilter)}`;
            if (currentStockFilter) url += `&stock_filter=${encodeURIComponent(currentStockFilter)}`;
            if (currentQuery) url += `&q=${encodeURIComponent(currentQuery)}`;

            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                renderInventory(data.products, data.pagination);
                renderPagination(data.pagination.total_count, currentPage);
            } else {
                inventoryTableBody.innerHTML = '<tr><td colspan="9">Error loading inventory.</td></tr>';
                mobileInventoryList.innerHTML = '<p>Error loading inventory.</p>';
                paginationContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error:', error);
            inventoryTableBody.innerHTML = '<tr><td colspan="9">Error loading inventory.</td></tr>';
            mobileInventoryList.innerHTML = '<p>Error loading inventory.</p>';
            paginationContainer.innerHTML = '';
        }
    }

    // Render inventory
    function renderInventory(products, pagination) {
        inventoryTableBody.innerHTML = '';
        mobileInventoryList.innerHTML = '';
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;

        products.forEach(product => {
            let stockClass = product.stock <= 20 ? 'low-stock' : 'sufficient-stock';
            let originalPriceDisplay = product.original_price ? `$${parseFloat(product.original_price).toFixed(2)}` : 'N/A';
            let profitMarginDisplay = 'N/A';
            if (product.original_price && product.price) {
                const originalPrice = parseFloat(product.original_price);
                const sellingPrice = parseFloat(product.price);
                const profit = sellingPrice - originalPrice;
                profitMarginDisplay = ((profit / originalPrice) * 100).toFixed(1) + '%';
            }

            // Table row for desktop
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.photo ? `<img src="/static/uploads/products/${product.photo}" class="product-image" alt="${product.name}" style="max-width: ${isMobile ? '40px' : '50px'}; max-height: ${isMobile ? '40px' : '50px'}; object-fit: cover; border-radius: 4px;">` : 'No image'}</td>
                <td>${product.name}</td>
                <td class="${isMobile ? 'd-none' : ''}">${product.description || ''}</td>
                <td>$${parseFloat(product.price).toFixed(2)}</td>
                <td class="${isMobile ? 'd-none' : ''}">${originalPriceDisplay}</td>
                <td style="display: none;">${profitMarginDisplay}</td>
                <td>
                    <div class="stock-control ${stockClass}">
                        <input type="number" class="stock-input" value="${product.stock}" min="0" data-id="${product.id}" readonly>
                    </div>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-product" data-id="${product.id}" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">Edit</button>
                    <button class="btn btn-sm btn-info view-product-detail" data-id="${product.id}" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">View</button>
                    <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">Delete</button>
                </td>
            `;
            inventoryTableBody.appendChild(row);

            // Mobile card
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.innerHTML = `
                <div style="display: flex; gap: 10px;">
                    ${product.photo ? `<img src="/static/uploads/products/${product.photo}" alt="${product.name}" style="max-width: ${isMobile ? '60px' : '80px'}; max-height: ${isMobile ? '60px' : '80px'}; object-fit: cover; border-radius: 4px;">` : '<div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 4px;">No image</div>'}
                    <div>
                        <p><strong>ID:</strong> ${product.id}</p>
                        <p><strong>Name:</strong> ${product.name}</p>
                        <p><strong>Price:</strong> $${parseFloat(product.price).toFixed(2)}</p>
                        <p><strong>Stock:</strong> <span class="${stockClass}">${product.stock}</span></p>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-product" data-id="${product.id}" style="padding: 4px 8px; font-size: 0.8rem;">Edit</button>
                    <button class="btn btn-sm btn-info view-product-detail" data-id="${product.id}" style="padding: 4px 8px; font-size: 0.8rem;">View</button>
                    <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}" style="padding: 4px 8px; font-size: 0.8rem;">Delete</button>
                </div>
            `;
            mobileInventoryList.appendChild(card);
        });

        // Add event listeners
        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', () => openEditModal(button.dataset.id));
        });

        document.querySelectorAll('.view-product-detail').forEach(button => {
            button.addEventListener('click', () => openProductDetailModal(button.dataset.id));
        });

        document.querySelectorAll('.delete-product').forEach(button => {
            button.addEventListener('click', async () => {
                const confirmed = await showDeleteConfirmation('Are you sure you want to delete this product?', 'This action cannot be undone.');
                if (confirmed) {
                    try {
                        const response = await fetch(`/staff/inventory/${button.dataset.id}/delete`, {
                            method: 'DELETE'
                        });
                        const data = await response.json();
                        if (data.success) {
                            fetchInventory();
                            showMessage('Product deleted successfully!', 'success');
                        } else {
                            showMessage('Error: ' + data.error, 'error');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        showMessage('An error occurred while deleting the product.', 'error');
                    }
                }
            });
        });
    }

    // Responsive pagination
    function renderPagination(totalCount, currentPage) {
        const totalPages = Math.ceil(totalCount / pageSize);
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const isMobile = window.innerWidth < 768;
        const maxButtons = isMobile ? 3 : 5;

        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">«</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) fetchInventory(currentPage - 1);
        });
        paginationContainer.appendChild(prevLi);

        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            li.innerHTML = `<a class="page-link" href="#" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">${i}</a>`;
            li.addEventListener('click', e => {
                e.preventDefault();
                fetchInventory(i);
            });
            paginationContainer.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">»</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) fetchInventory(currentPage + 1);
        });
        paginationContainer.appendChild(nextLi);

        if (isMobile && totalPages > endPage) {
            const loadMoreLi = document.createElement('li');
            loadMoreLi.className = 'page-item';
            loadMoreLi.innerHTML = `<a class="page-link" href="#" style="padding: 6px 10px; font-size: 0.9rem;">Load More</a>`;
            loadMoreLi.addEventListener('click', e => {
                e.preventDefault();
                fetchInventory(currentPage + 1);
            });
            paginationContainer.appendChild(loadMoreLi);
        }
    }

    // Edit modal
    async function openEditModal(productId) {
        fetchAndPopulateColors();
        try {
            const response = await fetch(`/api/products/${productId}`);
            const data = await response.json();
            if (data.success && data.product) {
                const product = data.product;
                document.getElementById('edit-product-id').value = product.id;
                document.getElementById('edit-product-name').value = product.name;
                document.getElementById('edit-product-desc').value = product.description || '';
                document.getElementById('edit-product-price').value = product.price;
                document.getElementById('edit-product-original-price').value = product.original_price || '';
                document.getElementById('edit-product-stock').value = product.stock;
                const categorySelect = document.getElementById('edit-product-category');
                let categoryValue = (product.category_id || '').toString();
                let optionExists = Array.from(categorySelect.options).some(opt => opt.value === categoryValue);
                if (optionExists) {
                    categorySelect.value = categoryValue;
                } else {
                    categorySelect.value = '';
                }
                document.getElementById('edit-product-cpu').value = product.cpu || '';
                document.getElementById('edit-product-ram').value = product.ram || '';
                document.getElementById('edit-product-storage').value = product.storage || '';
                document.getElementById('edit-product-graphics').value = product.graphics || '';
                document.getElementById('edit-product-display').value = product.display || '';
                document.getElementById('edit-product-os').value = product.os || '';
                document.getElementById('edit-product-keyboard').value = product.keyboard || '';
                document.getElementById('edit-product-battery').value = product.battery || '';
                document.getElementById('edit-product-weight').value = product.weight || '';
                document.getElementById('edit-product-warranty-id').value = product.warranty_id || '';
                document.getElementById('edit-product-color').value = product.color || '';

                loadExistingImagesIntoEditModal(product);
                editProductModal.classList.add('show-slide');
            } else {
                showMessage('Product not found.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while fetching product details.', 'error');
        }
    }

    async function loadExistingImagesIntoEditModal(product) {
        editSelectedFiles = [null, null, null];
        const imageUrls = [
            product.photo ? `/static/uploads/products/${product.photo}` : null,
            product.back_view ? `/static/uploads/products/${product.back_view}` : null,
            product.left_rear_view ? `/static/uploads/products/${product.left_rear_view}` : null
        ];

        const imagePromises = imageUrls.map((url, i) => {
            if (url) {
                return fetch(url)
                    .then(response => response.blob())
                    .then(blob => {
                        const filename = url.split('/').pop();
                        const file = new File([blob], filename, { type: blob.type });
                        editSelectedFiles[i] = file;
                        return file;
                    })
                    .catch(error => {
                        console.error(`Failed to load image for slot ${i}:`, error);
                        return null;
                    });
            }
            return Promise.resolve(null);
        });

        await Promise.all(imagePromises);
        updateEditPreviews();
        syncEditMultipleSelectionInput();
    }

    // Product detail modal
    async function openProductDetailModal(productId) {
        const productDetailModal = document.getElementById('product-detail-modal');
        const productDetailName = document.getElementById('product-detail-name');
        try {
            const response = await fetch(`/api/products/${productId}`);
            const data = await response.json();
            if (data.success && data.product) {
                const product = data.product;
                productDetailName.textContent = product.name;
                initializeSlideshow(product);

                let profitInfo = '';
                if (product.original_price && product.price) {
                    const originalPrice = parseFloat(product.original_price);
                    const sellingPrice = parseFloat(product.price);
                    const profit = sellingPrice - originalPrice;
                    const profitMargin = ((profit / originalPrice) * 100).toFixed(1);
                    profitInfo = `
                        <p><strong>Original Price:</strong> $${originalPrice.toFixed(2)}</p>
                        <p><strong>Profit per Unit:</strong> $${profit.toFixed(2)}</p>
                        <p><strong>Profit Margin:</strong> ${profitMargin}%</p>
                    `;
                } else if (product.original_price) {
                    profitInfo = `<p><strong>Original Price:</strong> $${parseFloat(product.original_price).toFixed(2)}</p>`;
                }

                document.getElementById('product-details-section').innerHTML = `
                    <p><strong>Description:</strong> ${product.description || 'N/A'}</p>
                    <p><strong>Selling Price:</strong> $${parseFloat(product.price).toFixed(2)}</p>
                    ${profitInfo}
                    <p><strong>Stock:</strong> ${product.stock}</p>
                    <p><strong>Category:</strong> ${product.category_name || 'N/A'}</p>
                    <p><strong>CPU:</strong> ${product.cpu || 'N/A'}</p>
                    <p><strong>RAM:</strong> ${product.ram || 'N/A'}</p>
                    <p><strong>Storage:</strong> ${product.storage || 'N/A'}</p>
                    <p><strong>Graphics:</strong> ${product.graphics || 'N/A'}</p>
                    <p><strong>Display:</strong> ${product.display || 'N/A'}</p>
                    <p><strong>OS:</strong> ${product.os || 'N/A'}</p>
                    <p><strong>Keyboard:</strong> ${product.keyboard || 'N/A'}</p>
                    <p><strong>Battery:</strong> ${product.battery || 'N/A'}</p>
                    <p><strong>Weight:</strong> ${product.weight || 'N/A'}</p>
                    <p><strong>Color:</strong> ${product.color || 'N/A'}</p>
                    <p><strong>Warranty:</strong> ${product.warranty_name || 'No warranty'}</p>
                `;
                productDetailModal.classList.add('show-slide');
            } else {
                showMessage('Product not found.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while fetching product details.', 'error');
        }
    }

    // Slideshow
    let currentSlideIndex = 0;
    let slideImages = [];

    function initializeSlideshow(product) {
        slideImages = [];
        const imageLabels = [];
        const isMobile = window.innerWidth < 768;
        const imageSize = isMobile ? '200px' : '300px';
        const thumbnailSize = isMobile ? '50px' : '60px';

        if (product.photo) {
            slideImages.push(`/static/uploads/products/${product.photo}`);
            imageLabels.push('Main Image');
        }
        if (product.back_view) {
            slideImages.push(`/static/uploads/products/${product.back_view}`);
            imageLabels.push('Back View');
        }
        if (product.left_rear_view) {
            slideImages.push(`/static/uploads/products/${product.left_rear_view}`);
            imageLabels.push('Left Rear View');
        }

        const slideshowContainer = document.getElementById('product-slideshow-container');
        const mainImage = document.getElementById('slideshow-main-image');
        const prevButton = document.querySelector('.slideshow-prev');
        const nextButton = document.querySelector('.slideshow-next');
        const counter = document.querySelector('.slideshow-counter');
        const thumbnailsContainer = document.querySelector('.slideshow-thumbnails');

        if (slideImages.length === 0) {
            slideshowContainer.style.display = 'none';
            return;
        }

        slideshowContainer.style.display = 'block';
        mainImage.style.maxHeight = imageSize;
        currentSlideIndex = 0;

        if (slideImages.length > 1) {
            prevButton.style.display = 'block';
            nextButton.style.display = 'block';
            counter.style.display = 'block';
        } else {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
            counter.style.display = 'none';
        }

        thumbnailsContainer.innerHTML = '';
        slideImages.forEach((imageSrc, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.style.cssText = `
                width: ${thumbnailSize};
                height: ${thumbnailSize};
                border: 2px solid ${index === 0 ? '#007bff' : '#dee2e6'};
                border-radius: 4px;
                overflow: hidden;
                cursor: pointer;
                background: #f8f9fa;
            `;
            const thumbImg = document.createElement('img');
            thumbImg.src = imageSrc;
            thumbImg.alt = imageLabels[index];
            thumbImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            thumbImg.onclick = () => goToSlide(index);
            thumbnail.appendChild(thumbImg);
            thumbnailsContainer.appendChild(thumbnail);
        });

        updateSlideDisplay();
    }

    function updateSlideDisplay() {
        const mainImage = document.getElementById('slideshow-main-image');
        const currentSlideSpan = document.getElementById('current-slide');
        const totalSlidesSpan = document.getElementById('total-slides');
        const thumbnails = document.querySelectorAll('.slideshow-thumbnails > div');

        if (slideImages.length > 0) {
            mainImage.src = slideImages[currentSlideIndex];
            currentSlideSpan.textContent = currentSlideIndex + 1;
            totalSlidesSpan.textContent = slideImages.length;
            thumbnails.forEach((thumb, index) => {
                thumb.style.borderColor = index === currentSlideIndex ? '#007bff' : '#dee2e6';
            });
        }
    }

    window.goToSlide = function(index) {
        if (index >= 0 && index < slideImages.length) {
            currentSlideIndex = index;
            updateSlideDisplay();
        }
    };

    window.changeSlide = function(direction) {
        currentSlideIndex += direction;
        if (currentSlideIndex >= slideImages.length) {
            currentSlideIndex = 0;
        } else if (currentSlideIndex < 0) {
            currentSlideIndex = slideImages.length - 1;
        }
        updateSlideDisplay();
    };

    // Filters
    window.filterProducts = function(categoryId = '', brand = '', stock = '') {
        currentCategoryFilter = categoryId;
        currentBrandFilter = brand;
        currentStockFilter = stock;
        currentPage = 1;
        fetchInventory();
    };

    window.applyFilters = function() {
        const category = document.getElementById('category-filter').value;
        const brand = document.getElementById('brand-filter').value;
        const stock = document.getElementById('stock-filter').value;
        filterProducts(category, brand, stock);
    };

    // Search
    searchBtn.addEventListener('click', () => {
        currentQuery = searchInput.value.trim();
        currentPage = 1;
        fetchInventory();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    searchInput.addEventListener('input', () => {
        const value = searchInput.value;
        if (/[a-zA-Z]/.test(value)) {
            currentQuery = value.trim();
            currentPage = 1;
            fetchInventory();
        } else if (value.trim() === '') {
            currentQuery = '';
            currentPage = 1;
            fetchInventory();
        }
    });

    // Filter dropdowns
    document.getElementById('category-filter').addEventListener('change', () => {
        searchInput.value = '';
        currentQuery = '';
        currentCategoryFilter = document.getElementById('category-filter').value;
        currentPage = 1;
        fetchInventory();
    });

    document.getElementById('brand-filter').addEventListener('change', () => {
        searchInput.value = '';
        currentQuery = '';
        currentBrandFilter = document.getElementById('brand-filter').value;
        currentPage = 1;
        fetchInventory();
    });

    document.getElementById('stock-filter').addEventListener('change', () => {
        searchInput.value = '';
        currentQuery = '';
        currentStockFilter = document.getElementById('stock-filter').value;
        currentPage = 1;
        fetchInventory();
    });

    // Responsive modal handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isMobile = window.innerWidth < 768;
            [addProductModal, editProductModal, document.getElementById('product-detail-modal')].forEach(modal => {
                if (modal.classList.contains('show-slide')) {
                    modal.querySelector('.modal-content').style.maxWidth = isMobile ? '90%' : '600px';
                    modal.querySelector('.modal-content').style.overflowY = isMobile ? 'auto' : 'visible';
                }
            });
            if (previewContainer.style.display === 'flex') updatePreviews();
            if (editPreviewContainer && editPreviewContainer.style.display === 'flex') updateEditPreviews();
        }, 100);
    });

    // Initial load
    fetchInventory();
});

async function getTotalStockForBrand(brandName) {
    try {
        const response = await fetch(`/staff/inventory/search?page_size=1000`);
        const data = await response.json();
        if (data.success && data.products) {
            let totalStock = 0;
            data.products.forEach(product => {
                if (!brandName || brandName.toLowerCase() === 'all' || product.name.toLowerCase().includes(brandName.toLowerCase())) {
                    totalStock += product.stock;
                }
            });
            return totalStock;
        } else {
            console.error('Error fetching products for brand count:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error in getTotalStockForBrand:', error);
        return null;
    }
}

// Professional delete confirmation modal
function showDeleteConfirmation(title, message) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'delete-confirmation-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 0;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="padding: 24px 24px 16px 24px; text-align: center;">
                <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <svg width="32" height="32" fill="#dc2626" viewBox="0 0 24 24">
                        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">${title}</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${message}</p>
            </div>
            <div style="padding: 16px 24px 24px 24px; display: flex; gap: 12px; justify-content: center;">
                <button class="cancel-btn" style="
                    background: #f3f4f6;
                    color: #374151;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                    min-width: 80px;
                ">Cancel</button>
                <button class="delete-btn" style="
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                    min-width: 80px;
                ">Delete</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.transform = 'scale(1)';
        });

        // Add hover effects
        const cancelBtn = modal.querySelector('.cancel-btn');
        const deleteBtn = modal.querySelector('.delete-btn');

        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.backgroundColor = '#e5e7eb';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.backgroundColor = '#f3f4f6';
        });

        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.backgroundColor = '#b91c1c';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.backgroundColor = '#dc2626';
        });

        // Handle button clicks
        const cleanup = () => {
            modal.style.transform = 'scale(0.9)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 200);
        };

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        deleteBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}