frappe.ui.form.on('Healthcare Practitioner Contribution Table', {
    document_type: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn]
        frappe.db.get_doc('Healthcare Practitioner', row.document_type)
            .then(doc => {
                for (let index = 0; index < doc.healthcare_practitioner_commission.length; index++) {
                    if (doc.healthcare_practitioner_commission[index].document_type == frm.doctype) {
                        if (doc.healthcare_practitioner_commission[index].preferred_commission_type == "Fixed Amount") {
                            row.is_fixed_amount = true
                            row.fixed_amount = doc.healthcare_practitioner_commission[index].fixed_amount
                            row.percentage = 0
                            row.practitioner_commission_account = doc.practitioner_commission_account
                            frm.refresh()
                        } else if (doc.healthcare_practitioner_commission[index].preferred_commission_type == "Percentage") {
                            row.is_percentage = true
                            row.fixed_amount = 0
                            row.percentage = doc.healthcare_practitioner_commission[index].percentage
                            row.practitioner_commission_account = doc.practitioner_commission_account
                            frm.refresh()
                        }
                    }
                }
            }
        )
    },
})

frappe.ui.form.on('Patient Appointment', {
	refresh(frm) {
		if (!frm.doc.__islocal && frm.doc.references_table.length == 0) {
            frm.add_custom_button(__('Submit Je'), function () {
                frappe.call({
                    method: 'healthcare_addon.utils.utils.create_appointment_commission_je',
                    args: {
                        doc_type: frm.doctype,
                        docname: frm.docname,
                    },
                    freeze: true,
                    freeze_message: __('Clearing'),
                    callback: function (r) {
                        frm.refresh();
                    }
                }).then(window.location.reload());
            }).addClass('btn-primary');
        }
	},
})

