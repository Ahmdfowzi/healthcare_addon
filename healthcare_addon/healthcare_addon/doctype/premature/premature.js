// Copyright (c) 2023, Ahmed Ghazi and contributors
// For license information, please see license.txt

frappe.ui.form.on('Premature', {
	/* Getting the default item for the emergency medical services from the Default Healthcare Service
	Settings doctype. */
	setup: function (frm) {
		frappe.db.get_single_value('Default Healthcare Service Settings', 'premature_service_item')
			.then(item => {
				frm.doc.service_item = item
				frm.refresh()
			})
	},

	refresh: function (frm) {
		if (!frm.doc.__islocal) {
			if (frm.doc.docstatus === 1) {
				if (frm.doc.inpatient_status != "Discharged") {
					frm.add_custom_button(__('Discharge Now'), function () {
						discharge_now(frm);
					}).addClass('btn-danger');
				}

				frm.add_custom_button(__('Patient History'), function () {
					if (frm.doc.patient) {
						frappe.route_options = { 'patient': frm.doc.patient };
						frappe.set_route('patient_history');
					} else {
						frappe.msgprint(__('Please select Patient'));
					}
				}, 'View');

				frm.add_custom_button(__('Vital Signs'), function () {
					create_vital_signs(frm);
				}, 'Create');

				frm.add_custom_button(__('Medical Record'), function () {
					create_medical_record(frm);
				}, 'Create');
			}
		}
	},

	clear_linked_je: function (frm) {
		frappe.call({
			method: 'healthcare_addon.utils.utils.clear_linked_je',
			args: {
				doc_type: frm.doctype,
				docname: frm.docname
			},
			freeze: true,
			freeze_message: __('Clearing'),
			callback: function (r) {
				frm.refresh();
			}
		}).then(window.location.reload());
	}
});

/* A function that is called when the user changes the value of the document_type field in the
Healthcare Practitioner Contribution Table table. */
frappe.ui.form.on('Healthcare Practitioner Contribution Table', {
	document_type: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn]
		frappe.db.get_doc('Healthcare Practitioner', row.document_type)
			.then(doc => {
				const practitionerCommission = doc.healthcare_practitioner_commission.find(commission => commission.document_type === frm.doctype);
				if (practitionerCommission) {
					switch (practitionerCommission.preferred_commission_type) {
						case "Fixed Amount":
							row.is_fixed_amount = true;
							row.fixed_amount = practitionerCommission.fixed_amount;
							row.percentage = 0;
							row.practitioner_commission_account = doc.practitioner_commission_account;
							break;
						case "Percentage":
							row.is_percentage = true;
							row.fixed_amount = 0;
							row.percentage = practitionerCommission.percentage;
							row.practitioner_commission_account = doc.practitioner_commission_account;
							break;
						default:
						// handle default case
					}
					frm.refresh();
				}
			}).catch(err => {
				frappe.msgprint({
					title: __('Error'),
					message: __('Unable to fetch practitioner document: {0}', [err.message])
				});
			}
			);
	}
});



/**
 * It creates a new Patient Medical Record for the patient selected in the form
 * @param frm - The current form object.
 */
let create_medical_record = function (frm) {
	if (!frm.doc.patient) {
		frappe.throw(__('Please select patient'));
	}
	frappe.route_options = {
		'patient': frm.doc.patient,
		'status': 'Open',
		'reference_doctype': frm.doctype,
		'reference_owner': frm.doc.owner
	};
	frappe.new_doc('Patient Medical Record');
};

/**
 * It creates a new Vital Signs document and sets the patient, encounter and company fields
 * @param frm - The current form object.
 */
let create_vital_signs = function (frm) {
	if (!frm.doc.patient) {
		frappe.throw(__('Please select patient'));
	}
	frappe.route_options = {
		'patient': frm.doc.patient,
		'encounter': frm.doc.name,
		'company': frm.doc.company
	};
	frappe.new_doc('Vital Signs');
};

/**
 * It sets the discharge_at field to the current time and the inpatient_status field to "Discharged"
 * and then refreshes the form
 * @param frm - The current form object.
 */
let discharge_now = function (frm) {
	frappe.db.set_value(frm.doctype, frm.doc.name, 'discharge_at', frappe.datetime.now_datetime()).then(r => {
		frappe.db.set_value(frm.doctype, frm.doc.name, 'inpatient_status', "Discharged").then(frm.refresh())
	})
	frappe.msgprint(__('Patient Discharged'));
	window.location.reload()
};
