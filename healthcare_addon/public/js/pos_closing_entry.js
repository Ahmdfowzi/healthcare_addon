frappe.ui.form.on('POS Closing Entry', {
    refresh: function(frm) {
        frm.fields_dict['custom_expenses_reconciliation'].grid.on_row_add = 
        frm.fields_dict['custom_expenses_reconciliation'].grid.on_row_delete = 
        frm.fields_dict['custom_expenses_reconciliation'].grid.on_row_change = function() {
            updatePaymentReconciliation(frm);
        };
    },
    
    validate: function(frm) {
        updatePaymentReconciliation(frm);
    }
});

frappe.ui.form.on('Expenses Table', {
    amount: function(frm, cdt, cdn) {
        updatePaymentReconciliation(frm);
    },
    mode_of_payment: function(frm, cdt, cdn) {
        updatePaymentReconciliation(frm);
    }
});

function updatePaymentReconciliation(frm) {
    let customExpenses = {};
    console.log('refresh');

    // Calculate total custom expenses per mode of payment
    frm.doc.custom_expenses_reconciliation.forEach(expense => {
        if (!expense.mode_of_payment) {
            frappe.throw(__('Mode of Payment is required for all custom expenses.'));
        }
        
        let amount = flt(expense.amount);
        if (amount < 0) {
            frappe.throw(__('Invalid amount for custom expense: {0}. Amount must be a non-negative number.', [amount]));
        }
        
        customExpenses[expense.mode_of_payment] = (customExpenses[expense.mode_of_payment] || 0) + amount;
    });
    
    // Adjust payment reconciliation
    frm.doc.payment_reconciliation.forEach(payment => {
        if (!payment.mode_of_payment) {
            frappe.throw(__('Mode of Payment is required for all payment reconciliations.'));
        }
        
        if (customExpenses[payment.mode_of_payment]) {
            payment.expected_amount = flt(payment.expected_amount) - customExpenses[payment.mode_of_payment];
            payment.closing_amount = flt(payment.closing_amount) - customExpenses[payment.mode_of_payment];
            
            // Ensure amounts don't go negative
            payment.expected_amount = Math.max(0, payment.expected_amount);
            payment.closing_amount = Math.max(0, payment.closing_amount);
            
            // Recalculate difference
            payment.difference = payment.closing_amount - payment.expected_amount;
        }
    });
    
    // Update total expected amount and net total
    frm.doc.grand_total = frm.doc.payment_reconciliation.reduce((total, payment) => total + flt(payment.expected_amount), 0);
    frm.doc.net_total = frm.doc.payment_reconciliation.reduce((total, payment) => total + flt(payment.closing_amount), 0);
    
    // Ensure totals are non-negative
    frm.doc.grand_total = Math.max(0, frm.doc.grand_total);
    frm.doc.net_total = Math.max(0, frm.doc.net_total);
    
    frm.refresh_field('payment_reconciliation');
    frm.refresh_field('grand_total');
    frm.refresh_field('net_total');
}