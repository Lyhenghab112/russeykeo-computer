// Debug script to check today's data structure
async function debugTodayDataStructure() {
    try {
        const today = new Date().toISOString().slice(0,10);
        console.log('Fetching data for date:', today);
        
        // Fetch today's sales data
        const response = await fetch(`/auth/staff/api/reports/daily_sales_detail?date=${today}`);
        const data = await response.json();
        
        if (data.success && data.sales_detail && data.sales_detail.length > 0) {
            console.log('Today\'s sales data structure:');
            console.log('Number of orders:', data.sales_detail.length);
            
            // Log the first order to see the structure
            const firstOrder = data.sales_detail[0];
            console.log('First order structure:', firstOrder);
            
            // Check specific fields that might cause PDF layout issues
            console.log('\nField lengths:');
            console.log('Order ID:', firstOrder.order_id, 'Length:', String(firstOrder.order_id).length);
            console.log('Order Date:', firstOrder.order_date, 'Length:', String(firstOrder.order_date).length);
            console.log('Customer Name:', firstOrder.customer_name, 'Length:', String(firstOrder.customer_name).length);
            console.log('Products:', firstOrder.products, 'Length:', String(firstOrder.products).length);
            console.log('Grand Total:', firstOrder.grand_total, 'Length:', String(firstOrder.grand_total).length);
            console.log('Total Profit:', firstOrder.total_profit, 'Length:', String(firstOrder.total_profit).length);
            
            // Check if any fields are missing or have unexpected values
            console.log('\nField validation:');
            console.log('Has order_id:', 'order_id' in firstOrder);
            console.log('Has order_date:', 'order_date' in firstOrder);
            console.log('Has customer_name:', 'customer_name' in firstOrder);
            console.log('Has products:', 'products' in firstOrder);
            console.log('Has grand_total:', 'grand_total' in firstOrder);
            console.log('Has total_profit:', 'total_profit' in firstOrder);
            
        } else {
            console.log('No sales data found for today');
        }
        
    } catch (error) {
        console.error('Error fetching today\'s data:', error);
    }
}

// Run the debug function
debugTodayDataStructure();
