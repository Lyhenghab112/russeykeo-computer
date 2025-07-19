
document.getElementById('supplierSearchButton').addEventListener('click', function() {
    const query = document.getElementById('supplierSearchInput').value.trim().toLowerCase();
    if (!query) {
        alert('Please enter a search query.');
        return;
    }
    const tbody = document.getElementById('suppliersTableBody');
    const rows = tbody.getElementsByTagName('tr');
    let found = false;
    for (let i = 0; i < rows.length; i++) {
        const nameCell = rows[i].getElementsByTagName('td')[0];
        if (nameCell) {
            const nameText = nameCell.textContent.trim().toLowerCase();
            if (nameText.includes(query)) {
                rows[i].style.display = '';
                found = true;
            } else {
                rows[i].style.display = 'none';
            }
        }
    }
    if (!found) {
        tbody.innerHTML = '<tr><td colspan="7">No suppliers found.</td></tr>';
    }
});

// Placeholder event handlers for edit and delete buttons
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('edit-btn')) {
        const supplierId = event.target.getAttribute('data-id');
        // Open modal and populate fields
        const modal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
        // Find supplier data from current table row
        const row = event.target.closest('tr');
        document.getElementById('editSupplierId').value = supplierId;
        document.getElementById('editSupplierName').value = row.children[0].textContent.trim();
        document.getElementById('editSupplierContact').value = row.children[1].textContent.trim();
        document.getElementById('editSupplierPhone').value = row.children[2].textContent.trim();
        document.getElementById('editSupplierEmail').value = row.children[3].textContent.trim();
        document.getElementById('editSupplierAddress').value = row.children[4].textContent.trim();
        modal.show();
    } else if (event.target.classList.contains('delete-btn')) {
        const supplierId = event.target.getAttribute('data-id');
        showDeleteConfirmation('Delete Supplier', 'Are you sure you want to delete this supplier? This action cannot be undone.').then(confirmed => {
            if (confirmed) {
                fetch(`/auth/staff/suppliers/${supplierId}`, {
                    method: 'DELETE',
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showMessage('Supplier deleted successfully.', 'success');
                        // Remove the supplier row from the table
                        event.target.closest('tr').remove();
                    } else {
                        showMessage('Failed to delete supplier: ' + (data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(error => {
                    showMessage('Error deleting supplier: ' + error, 'error');
                });
            }
        });
    } else if (event.target.id === 'addSupplierButton') {
        // Clear modal fields for new supplier
        const modal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
        document.getElementById('editSupplierId').value = '';
        document.getElementById('editSupplierName').value = '';
        document.getElementById('editSupplierContact').value = '';
        document.getElementById('editSupplierPhone').value = '';
        document.getElementById('editSupplierEmail').value = '';
        document.getElementById('editSupplierAddress').value = '';
        modal.show();
    }
});

// Handle form submission for editing supplier or adding new supplier
document.getElementById('editSupplierForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const supplierId = document.getElementById('editSupplierId').value;
    const name = document.getElementById('editSupplierName').value.trim();
    const contact_person = document.getElementById('editSupplierContact').value.trim();
    const phone = document.getElementById('editSupplierPhone').value.trim();
    const email = document.getElementById('editSupplierEmail').value.trim();
    const address = document.getElementById('editSupplierAddress').value.trim();

    if (supplierId) {
        // Update existing supplier
        fetch(`/auth/staff/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                contact_person: contact_person,
                phone: phone,
                email: email,
                address: address
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Supplier updated successfully.');

                // Update the supplier row in the table
                const rows = document.querySelectorAll('#suppliersTableBody tr');
                rows.forEach(row => {
                    if (row.querySelector('.edit-btn').getAttribute('data-id') === supplierId) {
                        row.children[0].textContent = name;
                        row.children[1].textContent = contact_person;
                        row.children[2].textContent = phone;
                        row.children[3].textContent = email;
                        row.children[4].textContent = address;
                    }
                });

                // Close modal after save
                const modal = bootstrap.Modal.getInstance(document.getElementById('editSupplierModal'));
                modal.hide();
            } else {
                alert('Failed to update supplier: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            alert('Error updating supplier: ' + error);
        });
    } else {
        // Create new supplier
        fetch('/auth/staff/suppliers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                contact_person: contact_person,
                phone: phone,
                email: email,
                address: address
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Supplier added successfully.');

                // Optionally, reload or fetch updated supplier list
                location.reload();
            } else {
                alert('Failed to add supplier: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            showMessage('Error adding supplier: ' + error, 'error');
        });
    }
});

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