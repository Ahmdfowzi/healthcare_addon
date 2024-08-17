frappe.ui.form.on('Inpatient Record', {

    refresh: function (frm) {
        frappe.require('/assets/healthcare_addon/js/HealthcareCustomButtons.js', () => {

            if (healthcare_addon && healthcare_addon.HealthcareCustomButtons) {
                const customButtons = new healthcare_addon.HealthcareCustomButtons(frm, 'primary_practitioner');
                customButtons.addCustomButtons();
            } else {
                console.error('HealthcareCustomButtons class not found');
            }
        });
    }
});
