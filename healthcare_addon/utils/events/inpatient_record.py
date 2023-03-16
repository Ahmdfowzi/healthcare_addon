import frappe
def after_insert(doc, method):
	if doc.emergency_medical_services:  # Update encounter
		frappe.db.set_value(
			"Emergency Medical Services", doc.emergency_medical_services, "inpatient_record", doc.name
		)
		frappe.db.set_value(
			"Emergency Medical Services", doc.emergency_medical_services, "inpatient_status", doc.status
		)