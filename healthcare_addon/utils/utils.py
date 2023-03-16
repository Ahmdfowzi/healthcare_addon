import json

import frappe
from frappe import _
from frappe.utils import today


@frappe.whitelist()
def schedule_inpatient(args):
    admission_order = json.loads(args)  # admission order via Encounter
    if (
            not admission_order
            or not admission_order["patient"]
    ):
        frappe.throw(
            _("Missing required details, did not create Inpatient Record"))

    inpatient_record = frappe.new_doc("Inpatient Record")

    # Admission order details
    set_details_from_ip_order(inpatient_record, admission_order)

    # Patient details
    patient = frappe.get_doc("Patient", admission_order["patient"])
    inpatient_record.patient = patient.name
    inpatient_record.patient_name = patient.patient_name
    inpatient_record.gender = patient.sex
    inpatient_record.blood_group = patient.blood_group
    inpatient_record.dob = patient.dob
    inpatient_record.mobile = patient.mobile
    inpatient_record.email = patient.email
    inpatient_record.phone = patient.phone
    inpatient_record.scheduled_date = today()

    # Set encounter detials
    encounter = frappe.get_doc(
        "Emergency Medical Services", admission_order["emergency_medical_services"])
    if encounter and encounter.symptoms:  # Symptoms
        set_ip_child_records(
            inpatient_record, "chief_complaint", encounter.symptoms)

    if encounter and encounter.diagnosis:  # Diagnosis
        set_ip_child_records(
            inpatient_record, "diagnosis", encounter.diagnosis)

    if encounter and encounter.drug_prescription:  # Medication
        set_ip_child_records(
            inpatient_record, "drug_prescription", encounter.drug_prescription)

    if encounter and encounter.lab_test_prescription:  # Lab Tests
        set_ip_child_records(
            inpatient_record, "lab_test_prescription", encounter.lab_test_prescription)

    inpatient_record.status = "Admission Scheduled"
    inpatient_record.save(ignore_permissions=True)


@frappe.whitelist()
def schedule_discharge(args):
    discharge_order = json.loads(args)
    if (
            not discharge_order
            or not discharge_order["patient"]
            or not discharge_order["discharge_ordered_datetime"]
    ):
        frappe.throw(
            _("Missing required details, did not create schedule discharge"))

    if inpatient_record_id := frappe.db.get_value(
        "Patient", discharge_order["patient"], "inpatient_record"
    ):
        inpatient_record = frappe.get_doc(
            "Inpatient Record", inpatient_record_id)
        check_out_inpatient(
            inpatient_record, discharge_order["discharge_ordered_datetime"])
        set_details_from_ip_order(inpatient_record, discharge_order)
        inpatient_record.status = "Discharge Scheduled"
        inpatient_record.save(ignore_permissions=True)
        frappe.db.set_value(
            "Patient", discharge_order["patient"], "inpatient_status", inpatient_record.status
        )
        frappe.db.set_value(
            "Emergency Medical Services",
            inpatient_record.emergency_medical_services_discharge,
            "inpatient_status",
            inpatient_record.status,
        )


def check_out_inpatient(inpatient_record, discharge_ordered_datetime):
    """
    It checks out the patient from the service unit

    :param inpatient_record: The inpatient record that is being discharged
    :param discharge_ordered_datetime: The date and time of discharge
    """
    if inpatient_record.inpatient_occupancies:
        for inpatient_occupancy in inpatient_record.inpatient_occupancies:
            if inpatient_occupancy.left != 1:
                inpatient_occupancy.left = True
                inpatient_occupancy.check_out = discharge_ordered_datetime
                frappe.db.set_value(
                    "Healthcare Service Unit", inpatient_occupancy.service_unit, "occupancy_status", "Vacant"
                )


def set_details_from_ip_order(inpatient_record, ip_order):
    """
    It takes an inpatient record and an inpatient order, and sets the details of the inpatient record
    from the inpatient order.

    :param inpatient_record: the inpatient record we're working on
    :param ip_order: a dictionary of the inpatient order
    """
    for key in ip_order:
        inpatient_record.set(key, ip_order[key])


def set_ip_child_records(inpatient_record, inpatient_record_child, encounter_child):
    """
    > For each item in the encounter_child list, append a new row to the inpatient_record table, and set
    the values of each field in the new row to the values of the corresponding fields in the item

    :param inpatient_record: The doctype you want to create the child records in
    :param inpatient_record_child: The child table of the inpatient_record table
    :param encounter_child: This is the list of child records that you want to add to the parent record
    """
    for item in encounter_child:
        table = inpatient_record.append(inpatient_record_child)
        for df in table.meta.get("fields"):
            table.set(df.fieldname, item.get(df.fieldname))


def create_medication_invoice(self):
    """
    It creates a new Sales Invoice document, populates it with the patient, practitioner, and items from
    the prescription, and then inserts it into the database
    """
    letter_head = frappe.db.get_value(
        'Company', self.company, 'default_letter_head')
    invoice = frappe.new_doc("Sales Invoice")
    invoice.customer = self.patient
    invoice.patient = self.patient
    invoice.ref_practitioner = self.practitioner
    invoice.update_stock = True
    if letter_head != None:
        invoice.letter_head = letter_head
    for item in self.drug_prescription:
        invoice.append("items", {
            "item_code": item.drug_code,
            'qty': item.quantity,
            'uom': item.uom,
            'drug_prescription': f'Dosage: {item.dosage}|Period: {item.period}|Dosage Form: {item.dosage_form}'
        })
    invoice.insert()
    set_references_table(invoice, self)


def create_emergency_medical_services_invoice(self):
    """
    It creates a new Sales Invoice with the patient as the customer, the practitioner as the reference
    practitioner, and the Emergency Medical Services Item as the item
    """
    item = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "emergency_medical_services_item")

    letter_head = frappe.db.get_value(
        'Company', self.company, 'default_letter_head')
    invoice = frappe.new_doc("Sales Invoice")
    invoice.customer = self.patient
    invoice.patient = self.patient
    invoice.ref_practitioner = self.practitioner
    invoice.update_stock = False
    if letter_head != None:
        invoice.letter_head = letter_head
    if (item == ""):
        frappe.throw(_("Please Set The Emergency Medical Services Item"))
    else:
        invoice.append("items", {
            "item_code": item,
            'qty': 1,
        })
    invoice.insert()
    set_references_table(invoice, self)


def set_references_table(document, self):
    """
    It adds a new row to the `references_table` table with the `document_type` and `document_link`
    fields set to the `doctype` and `name` of the `document` parameter

    :param document: The document that you want to reference
    """
    self.append("references_table", {
        'document_type': document.doctype,
        'document_link': document.name
    })
    self.save()


def cancel_references_table_docs(self):
    """
    It cancels all the documents that are referenced in the references_table of the current document
    """
    for ref in self.references_table:
        doc = frappe.get_doc(ref.document_type, ref.document_link)
        if doc.docstatus != 0:
            doc.cancel()


def calculate_total_commission(self):
    """
    It returns the sum of the total commissions for each healthcare practitioner contribution
    :return: The sum of the total commissions for each healthcare practitioner contribution.
    """
    return sum(
        i.total_commissions for i in self.healthcare_practitioner_contribution
    )


def create_commission_je(self):
    """
    It creates a new Journal Entry, adds the default practitioner's commission account to the debit
    side, and then adds each practitioner's commission account to the credit side
    """
    default_practitioners_account = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "default_practitioners_commission_account")
    je = frappe.new_doc("Journal Entry")
    je.company = self.company
    je.posting_date = today()

    je.append("accounts", {
        'account': default_practitioners_account,
        'debit_in_account_currency': calculate_total_commission(self),
        'credit_in_account_currency': 0
    })

    for practitioner in self.healthcare_practitioner_contribution:
        je.append("accounts", {
            'account': practitioner.practitioner_commission_account,
            'debit_in_account_currency': 0,
            'credit_in_account_currency': practitioner.total_commissions
        })

    je.remark = f"{self.name} - {self.doctype}"
    je.insert()
    je.submit()
    set_references_table(je, self)


def calculate_practitioner_contribution(self):
    for practitioner in self.healthcare_practitioner_contribution:
        if practitioner.is_fixed_amount:
            practitioner.total_commissions = practitioner.fixed_amount
        else:
            if self.service_item == "":
                frappe.throw("Please Select a service item")
            item_price = frappe.db.get_value(
                'Item Price', {'item_code': self.service_item}, ['price_list_rate'])
            commission = (practitioner.percentage * item_price) / 100
            practitioner.total_commissions = commission
