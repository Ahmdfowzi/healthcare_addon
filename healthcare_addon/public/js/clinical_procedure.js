frappe.ui.form.on('Clinical Procedure', {
    custom_notes_template: function(frm) {
        if (frm.doc.custom_notes_template) {
            frappe.call({
                'method': 'healthcare_addon.utils.utils.get_terms_and_conditions',
                args: {
                    template_name: frm.doc.custom_notes_template,
                    doc: frm.doc
                },
                callback: function (data) {
                    if (data.message) {
                        frm.set_value('note', data.message);
                        frm.refresh_field('note');
                    }
                }
            });
        }
    }
});