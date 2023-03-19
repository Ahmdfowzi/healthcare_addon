// Copyright (c) 2023, Ahmed Ghazi and contributors
// For license information, please see license.txt

frappe.ui.form.on('Emergency Medical Services', {

	/* Getting the default item for the emergency medical services from the Default Healthcare Service
	Settings doctype. */
	setup: function (frm) {
		frappe.db.get_single_value('Default Healthcare Service Settings', 'emergency_medical_services_item')
			.then(item => {
				frm.doc.service_item = item
				frm.refresh()
			})
	},

	refresh: function (frm) {
		if (!frm.doc.__islocal) {
			/* Checking the status of the document and adding a button to the form based on the status. */
			if (frm.doc.docstatus === 1) {
				if (frm.doc.inpatient_status == 'Admission Scheduled' || frm.doc.inpatient_status == 'Admitted') {
					frm.add_custom_button(__('Schedule Discharge'), function () {
						schedule_discharge(frm);
					});

				} else if (frm.doc.inpatient_status != 'Discharge Scheduled') {
					frm.add_custom_button(__('Schedule Admission'), function () {
						schedule_inpatient(frm);
					});
					if (frm.doc.inpatient_status != "Discharged") {
						frm.add_custom_button(__('Discharge Now'), function () {
							discharge_now(frm);
						}).addClass('btn-danger');
					}
				}
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

			frm.add_custom_button(__('Emergency Services Invoice'), function () {
				alert("Invoice Created");
			}, 'Create');

			frm.add_custom_button(__('Medication Invoice'), function () {
				alert("Invoice Created");
			}, 'Create');
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
	window.location.reload()
	frappe.msgprint(__('Patient Discharged'));
};


/* A function that is called when the user clicks on the Schedule Admission button. */
var schedule_inpatient = function (frm) {
	var dialog = new frappe.ui.Dialog({
		title: 'Patient Admission',
		fields: [
			{ fieldtype: 'Link', label: 'Medical Department', fieldname: 'medical_department', options: 'Medical Department', reqd: 1 },
			{ fieldtype: 'Link', label: 'Healthcare Practitioner (Primary)', fieldname: 'primary_practitioner', options: 'Healthcare Practitioner', reqd: 1 },
			{ fieldtype: 'Link', label: 'Healthcare Practitioner (Secondary)', fieldname: 'secondary_practitioner', options: 'Healthcare Practitioner' },
			{ fieldtype: 'Column Break' },
			{ fieldtype: 'Date', label: 'Admission Ordered For', fieldname: 'admission_ordered_for', default: 'Today' },
			{ fieldtype: 'Link', label: 'Service Unit Type', fieldname: 'service_unit_type', options: 'Healthcare Service Unit Type' },
			{ fieldtype: 'Int', label: 'Expected Length of Stay', fieldname: 'expected_length_of_stay' },
			{ fieldtype: 'Section Break' },
			{ fieldtype: 'Long Text', label: 'Admission Instructions', fieldname: 'admission_instruction' }
		],
		primary_action_label: __('Order Admission'),
		primary_action: function () {
			var args = {
				patient: frm.doc.patient,
				emergency_medical_services: frm.doc.name,
				referring_practitioner: frm.doc.practitioner,
				company: frm.doc.company,
				medical_department: dialog.get_value('medical_department'),
				primary_practitioner: dialog.get_value('primary_practitioner'),
				secondary_practitioner: dialog.get_value('secondary_practitioner'),
				admission_ordered_for: dialog.get_value('admission_ordered_for'),
				admission_service_unit_type: dialog.get_value('service_unit_type'),
				expected_length_of_stay: dialog.get_value('expected_length_of_stay'),
				admission_instruction: dialog.get_value('admission_instruction')
			}
			frappe.call({
				method: 'healthcare_addon.utils.utils.schedule_inpatient',
				args: {
					args: args
				},
				callback: function (data) {
					if (!data.exc) {
						frm.reload_doc();
					}
				},
				freeze: true,
				freeze_message: __('Scheduling Patient Admission')
			});
			frm.refresh_fields();
			dialog.hide();
		}
	});

	dialog.set_values({
		'medical_department': frm.doc.medical_department,
		'primary_practitioner': frm.doc.practitioner,
	});

	dialog.fields_dict['service_unit_type'].get_query = function () {
		return {
			filters: {
				'inpatient_occupancy': 1,
				'allow_appointments': 0
			}
		};
	};

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};

/* A function that is called when the user clicks on the Schedule Discharge button. */
var schedule_discharge = function (frm) {
	var dialog = new frappe.ui.Dialog({
		title: 'Inpatient Discharge',
		fields: [
			{ fieldtype: 'Datetime', label: 'Discharge Ordered DateTime', fieldname: 'discharge_ordered_datetime', default: frappe.datetime.now_datetime() },
			{ fieldtype: 'Date', label: 'Followup Date', fieldname: 'followup_date' },
			{ fieldtype: 'Column Break' },
			{ fieldtype: 'Small Text', label: 'Discharge Instructions', fieldname: 'discharge_instructions' },
			{ fieldtype: 'Section Break', label: 'Discharge Summary' },
			{ fieldtype: 'Long Text', label: 'Discharge Note', fieldname: 'discharge_note' }
		],
		primary_action_label: __('Order Discharge'),
		primary_action: function () {
			var args = {
				patient: frm.doc.patient,
				emergency_medical_services_discharge: frm.doc.name,
				discharge_practitioner: frm.doc.practitioner,
				discharge_ordered_datetime: dialog.get_value('discharge_ordered_datetime'),
				followup_date: dialog.get_value('followup_date'),
				discharge_instructions: dialog.get_value('discharge_instructions'),
				discharge_note: dialog.get_value('discharge_note')
			}
			frappe.call({
				method: 'healthcare_addon.utils.utils.schedule_discharge',
				args: { args },
				callback: function (data) {
					if (!data.exc) {
						frm.reload_doc();
					}
				},
				freeze: true,
				freeze_message: 'Scheduling Inpatient Discharge'
			});
			frm.refresh_fields();
			dialog.hide();
		}
	});

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};

/* A function that is called when the user changes the value of the document_type field in the
Healthcare Practitioner Contribution Table table. */
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
	}
});