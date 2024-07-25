frappe.ui.form.on('Patient Encounter', {
    refresh(frm) {
        frm.fields_dict['custom_imaging_tests'].grid.get_field('imaging_scan_template').get_query = function (doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    scan_type: row.scan_type
                }
            };
        };
    }
});


