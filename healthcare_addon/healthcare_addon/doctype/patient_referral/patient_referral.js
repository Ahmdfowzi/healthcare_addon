frappe.ui.form.on('Patient Referral', {
    on_submit: function(frm) {
        frappe.call({
            method: "healthcare_addon.healthcare_addon.doctype.patient_referral.patient_referral.process_patient_referral",
            args: {
                referral_name: frm.doc.name
            },
            callback: function(response) {
                frappe.msgprint(__('Referral processed successfully.'));
            }
        });
    }
});
