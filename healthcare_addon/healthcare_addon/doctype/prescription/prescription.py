# Copyright (c) 2024, Osama Muhammed Abd and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Prescription(Document):
	pass


@frappe.whitelist()
def create_prescription_doc(patient , healthcare_practitioner, medications):
	prescription = frappe.new_doc("Prescription")
	prescription.patient = patient
	prescription.healthcare_practitioner = healthcare_practitioner
	prescription.medications = medications
	prescription.save()
	return prescription
