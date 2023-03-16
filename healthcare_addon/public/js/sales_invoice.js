frappe.ui.form.on('Sales Invoice', {
	refresh(frm) {
		frm.add_custom_button(__("Inject"), function () {
            console.log(frm.doctype);
        }).addClass("btn-danger");
		if (cint(frm.doc.docstatus==0) && cur_frm.page.current_view_name!=="pos" && !frm.doc.is_return) {
			frm.add_custom_button(__('Healthcare Services'), function() {
				get_healthcare_services_to_invoice(frm);
			},__("Get Items From"));
			frm.add_custom_button(__('Prescriptions'), function() {
				get_drugs_to_invoice(frm);
			},__("Get Items From"));
		}
	}
})