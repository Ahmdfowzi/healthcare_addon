# import json
# import random
# import string
# import frappe
# from frappe import _
# from frappe.utils import today


# def mark_imaging_tests_created(doc):
#     if doc.imaging_scan_template:
#         # Fetch the document source from the Imaging Prescription
#         imaging_prescriptions = frappe.get_all(
#             "Imaging Prescription",
#             filters={"imaging_scan_template": doc.imaging_scan_template, "parent": doc.source_document},
#             fields=["name"]
#         )
#         for prescription in imaging_prescriptions:
#             doc.mark_test_created(prescription["name"])

# def mark_test_created(doc, prescription_name):
#     try:
#         doc = frappe.get_doc("Imaging Prescription", prescription_name)
#         if doc.lab_test_created == 1:
#             frappe.throw(frappe._("Workflow Error, Test Already Created"), frappe.ValidationError)
#         else:
#             doc.lab_test_created = 1
#             doc.save()
#     except frappe.DoesNotExistError:
#         frappe.log_error(f'Imaging Prescription {prescription_name} not found', 'Xray Submission Error')

# def generate_random_barcode(doc):
#     if not doc.xray_id:
#         while True:
#             barcode = "".join(random.choices(string.digits, k=16))
#             if not frappe.db.exists("X-ray", {"xray_id": barcode}):
#                 doc.xray_id = barcode
#                 break


# @frappe.whitelist()
# def get_imaging_tests_by_type(patient, test_type):
#     # Fetch invoiced and not invoiced imaging tests for the specified patient and test type
#     results = []

#     # Fetch tests from Patient Encounter
#     pe_tests = frappe.db.sql("""
#         SELECT
#             ip.scan_type,
#             ip.imaging_scan_template,
#             'Patient Encounter' AS parent_doctype,
#             pe.name AS parent_docname,
#             pe.practitioner AS healthcare_practitioner,
#             ip.invoiced
#         FROM
#             `tabImaging Prescription` ip
#         INNER JOIN
#             `tabPatient Encounter` pe ON ip.parent = pe.name
#         WHERE
#             pe.patient = %s
#             AND ip.scan_type = %s
#             AND ip.lab_test_created = 0
#             AND pe.docstatus = 1
#         """, (patient, test_type), as_dict=True)

#     results.extend(pe_tests)

#     # Fetch tests from Emergency Medical Services
#     ems_tests = frappe.db.sql("""
#         SELECT
#             ip.scan_type,
#             ip.imaging_scan_template,
#             'Emergency Medical Services' AS parent_doctype,
#             ems.name AS parent_docname,
#             ems.practitioner AS healthcare_practitioner,
#             ip.invoiced
#         FROM
#             `tabImaging Prescription` ip
#         INNER JOIN
#             `tabEmergency Medical Services` ems ON ip.parent = ems.name
#         WHERE
#             ems.patient = %s
#             AND ip.scan_type = %s
#             AND ip.lab_test_created = 0
#             AND ems.docstatus = 1
#         """, (patient, test_type), as_dict=True)

#     results.extend(ems_tests)

#     # Fetch tests from Premature
#     pr_tests = frappe.db.sql("""
#         SELECT
#             ip.scan_type,
#             ip.imaging_scan_template,
#             'Premature' AS parent_doctype,
#             pr.name AS parent_docname,
#             pr.practitioner AS healthcare_practitioner,
#             ip.invoiced
#         FROM
#             `tabImaging Prescription` ip
#         INNER JOIN
#             `tabPremature` pr ON ip.parent = pr.name
#         WHERE
#             pr.patient = %s
#             AND ip.scan_type = %s
#             AND ip.lab_test_created = 0
#             AND pr.docstatus = 1
#         """, (patient, test_type), as_dict=True)

#     results.extend(pr_tests)

#     return results


# @frappe.whitelist()
# def mark_imaging_test_created(document_source, test_type):
#     doc = frappe.get_doc(document_source)
#     doc.lab_test_created = 1
#     doc.save()
#     return True


# @frappe.whitelist()
# def get_imaging_tests(patient):
#     return frappe.db.sql(
#         """
#         select
#             ip.scan_type,
#             ip.imaging_scan_template,
#             concat(ip.parent, ' (Patient Encounter)') as parent,
#             ip.invoiced,
#             ip.service_request,
#             ip.lab_test_comment,
#             ip.lab_test_created,
#             ip.patient_care_type,
#             ip.intent,
#             ip.priority
#         from
#             `tabImaging Prescription` ip
#             inner join `tabPatient Encounter` pe on ip.parent = pe.name
#         where
#             pe.patient = %s
#             and ip.invoiced = 0
#             and pe.docstatus = 1

#         union all

#         select
#             ip.scan_type,
#             ip.imaging_scan_template,
#             concat(ip.parent, ' (Emergency Medical Services)') as parent,
#             ip.invoiced,
#             ip.service_request,
#             ip.lab_test_comment,
#             ip.lab_test_created,
#             ip.patient_care_type,
#             ip.intent,
#             ip.priority
#         from
#             `tabImaging Prescription` ip
#             inner join `tabEmergency Medical Services` ems on ip.parent = ems.name
#         where
#             ems.patient = %s
#             and ip.invoiced = 0
#             and ems.docstatus = 1

#         union all

#         select
#             ip.scan_type,
#             ip.imaging_scan_template,
#             concat(ip.parent, ' (Premature)') as parent,
#             ip.invoiced,
#             ip.service_request,
#             ip.lab_test_comment,
#             ip.lab_test_created,
#             ip.patient_care_type,
#             ip.intent,
#             ip.priority
#         from
#             `tabImaging Prescription` ip
#             inner join `tabPremature` pr on ip.parent = pr.name
#         where
#             pr.patient = %s
#             and ip.invoiced = 0
#             and pr.docstatus = 1
#         """,
#         (patient, patient, patient),
#         as_dict=True,
#     )


# @frappe.whitelist()
# def mark_imaging_tests_invoiced(imaging_scan_template):
#     imaging_tests = frappe.get_all(
#         "Imaging Prescription",
#         filters={"imaging_scan_template": imaging_scan_template, "invoiced": 0},
#     )
#     for test in imaging_tests:
#         doc = frappe.get_doc("Imaging Prescription", test.name)
#         doc.invoiced = 1
#         doc.save(ignore_permissions=True)
#     return True


# @frappe.whitelist()
# def get_lab_test_prescribed(patient, healthcare_practitioner):
#     return frappe.db.sql(
#         """
#         select
#             lp.name,
#             lp.lab_test_code,
#             concat(lp.parent, ' (Patient Encounter)') as parent,
#             lp.invoiced,
#             lp.lab_test_comment,
#             pe.practitioner_name,
#             pe.encounter_date
#         from
#             `tabLab Prescription` lp
#             inner join `tabPatient Encounter` pe on lp.parent = pe.name
#         where
#             pe.patient = %s
#             and pe.practitioner = %s
#             and lp.lab_test_created = 0

#         union all

#         select
#             lp.name,
#             lp.lab_test_code,
#             concat(lp.parent, ' (Emergency Medical Services)') as parent,
#             lp.invoiced,
#             lp.lab_test_comment,
#             ems.practitioner_name,
#             ems.entry
#         from
#             `tabLab Prescription` lp
#             inner join `tabEmergency Medical Services` ems on lp.parent = ems.name
#         where
#             ems.patient = %s
#             and ems.practitioner = %s
#             and lp.lab_test_created = 0

#         union all

#         select
#             lp.name,
#             lp.lab_test_code,
#             concat(lp.parent, ' (Premature)') as parent,
#             lp.invoiced,
#             lp.lab_test_comment,
#             pr.practitioner_name,
#             pr.entry
#         from
#             `tabLab Prescription` lp
#             inner join `tabPremature` pr on lp.parent = pr.name
#         where
#             pr.patient = %s
#             and pr.practitioner = %s
#             and lp.lab_test_created = 0
#         """,
#         (
#             patient,
#             healthcare_practitioner,
#             patient,
#             healthcare_practitioner,
#             patient,
#             healthcare_practitioner,
#         ),
#     )


# def update_message(doc) -> None:
#     if len(doc.references_table) > 0:
#         frappe.msgprint(
#             title=_("Attention!"),
#             msg=_(
#                 "This document contains a linked journal entry. Please make sure to review the linked entry for important additional information related to this document."
#             ),
#         )


# @frappe.whitelist()
# def schedule_inpatient(args) -> None:
#     admission_order = json.loads(args)  # admission order via Encounter
#     if not admission_order or not admission_order["patient"]:
#         frappe.throw(_("Missing required details, did not create Inpatient Record"))

#     inpatient_record = frappe.new_doc("Inpatient Record")

#     # Admission order details
#     set_details_from_ip_order(inpatient_record, admission_order)

#     # Patient details
#     patient = frappe.get_doc("Patient", admission_order["patient"])
#     inpatient_record.patient = patient.name
#     inpatient_record.patient_name = patient.patient_name
#     inpatient_record.gender = patient.sex
#     inpatient_record.blood_group = patient.blood_group
#     inpatient_record.dob = patient.dob
#     inpatient_record.mobile = patient.mobile
#     inpatient_record.email = patient.email
#     inpatient_record.phone = patient.phone
#     inpatient_record.scheduled_date = today()

#     # Set encounter detials
#     encounter = frappe.get_doc(
#         "Emergency Medical Services", admission_order["emergency_medical_services"]
#     )
#     if encounter and encounter.symptoms:  # Symptoms
#         set_ip_child_records(inpatient_record, "chief_complaint", encounter.symptoms)

#     if encounter and encounter.diagnosis:  # Diagnosis
#         set_ip_child_records(inpatient_record, "diagnosis", encounter.diagnosis)

#     if encounter and encounter.drug_prescription:  # Medication
#         set_ip_child_records(
#             inpatient_record, "drug_prescription", encounter.drug_prescription
#         )

#     if encounter and encounter.lab_test_prescription:  # Lab Tests
#         set_ip_child_records(
#             inpatient_record, "lab_test_prescription", encounter.lab_test_prescription
#         )

#     inpatient_record.status = "Admission Scheduled"
#     inpatient_record.save(ignore_permissions=True)


# @frappe.whitelist()
# def schedule_discharge(args) -> None:  # sourcery skip: use-named-expression
#     discharge_order = json.loads(args)
#     if (
#         not discharge_order
#         or not discharge_order["patient"]
#         or not discharge_order["discharge_ordered_datetime"]
#     ):
#         frappe.throw(_("Missing required details, did not create schedule discharge"))

#     inpatient_record_id = frappe.db.get_value(
#         "Patient", discharge_order["patient"], "inpatient_record"
#     )
#     if inpatient_record_id:
#         inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_id)
#         check_out_inpatient(
#             inpatient_record, discharge_order["discharge_ordered_datetime"]
#         )
#         set_details_from_ip_order(inpatient_record, discharge_order)
#         inpatient_record.status = "Discharge Scheduled"
#         inpatient_record.save(ignore_permissions=True)
#         frappe.db.set_value(
#             "Patient",
#             discharge_order["patient"],
#             "inpatient_status",
#             inpatient_record.status,
#         )
#         frappe.db.set_value(
#             "Emergency Medical Services",
#             inpatient_record.emergency_medical_services_discharge,
#             "inpatient_status",
#             inpatient_record.status,
#         )


# def check_out_inpatient(inpatient_record, discharge_ordered_datetime) -> None:
#     """
#     It checks out the patient from the service unit

#     :param inpatient_record: The inpatient record that is being discharged
#     :param discharge_ordered_datetime: The date and time of discharge
#     """
#     if inpatient_record.inpatient_occupancies:
#         for inpatient_occupancy in inpatient_record.inpatient_occupancies:
#             if inpatient_occupancy.left != 1:
#                 inpatient_occupancy.left = True
#                 inpatient_occupancy.check_out = discharge_ordered_datetime
#                 frappe.db.set_value(
#                     "Healthcare Service Unit",
#                     inpatient_occupancy.service_unit,
#                     "occupancy_status",
#                     "Vacant",
#                 )


# def set_details_from_ip_order(inpatient_record, ip_order) -> None:
#     """
#     It takes an inpatient record and an inpatient order, and sets the details of the inpatient record
#     from the inpatient order.

#     :param inpatient_record: the inpatient record we're working on
#     :param ip_order: a dictionary of the inpatient order
#     """
#     for key in ip_order:
#         inpatient_record.set(key, ip_order[key])


# def set_ip_child_records(
#     inpatient_record, inpatient_record_child, encounter_child
# ) -> None:
#     """
#     > For each item in the encounter_child list, append a new row to the inpatient_record table, and set
#     the values of each field in the new row to the values of the corresponding fields in the item

#     :param inpatient_record: The doctype you want to create the child records in
#     :param inpatient_record_child: The child table of the inpatient_record table
#     :param encounter_child: This is the list of child records that you want to add to the parent record
#     """
#     for item in encounter_child:
#         table = inpatient_record.append(inpatient_record_child)
#         for df in table.meta.get("fields"):
#             table.set(df.fieldname, item.get(df.fieldname))


# def create_medication_invoice(self) -> None:
#     """
#     It creates a new Sales Invoice document, populates it with the patient, practitioner, and items from
#     the prescription, and then inserts it into the database.
#     """

#     try:
#         letter_head = frappe.db.get_value(
#             "Company", self.company, "default_letter_head"
#         )

#         if not self.patient:
#             frappe.throw(_("Patient is not defined"))
#         if not self.practitioner:
#             frappe.throw(_("Practitioner is not defined"))

#         settings = frappe.get_single("Default Healthcare Service Settings")
#         if not settings:
#             frappe.throw(_("Default Healthcare Service Settings not found"))

#         income_account = None
#         if self.doctype == "Premature":
#             if not settings.premature_income_account:
#                 frappe.throw(
#                     _(
#                         "Please set the premature income account in Default 'Healthcare Service Settings'"
#                     )
#                 )
#             income_account = settings.premature_income_account
#         elif self.doctype == "Emergency Medical Services":
#             if not settings.medication_income_account:
#                 frappe.throw(
#                     _(
#                         "Please set the medication income account in Default 'Healthcare Service Settings'"
#                     )
#                 )
#             income_account = settings.medication_income_account

#         if not self.drug_prescription:
#             frappe.throw(_("Drug prescription items are not defined"))

#         invoice_items = []
#         for item in self.drug_prescription:
#             invoice_items.append(
#                 {
#                     "item_code": item.drug_code,
#                     "qty": item.quantity,
#                     "uom": item.uom,
#                     "income_account": income_account,
#                     "drug_prescription": f"Dosage: {item.dosage}|Period: {item.period}|Dosage Form: {item.dosage_form}",
#                 }
#             )

#         invoice = frappe.get_doc(
#             {
#                 "doctype": "Sales Invoice",
#                 "customer": self.patient,
#                 "patient": self.patient,
#                 "ref_practitioner": self.practitioner,
#                 "update_stock": True,
#                 "letter_head": letter_head,
#                 "items": invoice_items,
#             }
#         )

#         invoice.insert()
#         invoice.submit()


#     except Exception as e:
#         frappe.log_error(message=str(e), title="Error creating medication invoice")
#         frappe.throw(
#             _("There was an error creating the medication invoice: {0}").format(str(e))
#         )


# def create_healthcare_service_invoice(self, item_code, qty) -> None:
#     """
#     It creates a new Sales Invoice with the patient as the customer, the practitioner as the reference
#     practitioner, and the item passed as parameter
#     """
#     letter_head = frappe.db.get_value("Company", self.company, "default_letter_head")
#     invoice = frappe.new_doc("Sales Invoice")
#     invoice.customer = self.patient
#     invoice.patient = self.patient
#     invoice.ref_practitioner = self.practitioner
#     invoice.update_stock = False

#     settings = frappe.get_single("Default Healthcare Service Settings")

#     if settings.healthcare_service_income_account == None:
#         frappe.throw(
#             _(
#                 "Please set the healthcare service income account in Default 'Healthcare Service Settings'"
#             )
#         )

#     income_account = settings.healthcare_service_income_account

#     if letter_head is not None:
#         invoice.letter_head = letter_head
#     if item_code == "":
#         frappe.throw(_("Please Set The Healthcare Service Item"))
#     else:
#         invoice.append(
#             "items",
#             {
#                 "item_code": item_code,
#                 "item_name": item_code,
#                 "income_account": income_account,
#                 "qty": qty,
#             },
#         )
#     invoice.insert()
#     invoice.submit()
#     self.invoiced = True


import json
import random
import string
import frappe
from frappe import _
from frappe.utils import today


def mark_imaging_tests_created(doc):
    if doc.imaging_scan_template:
        imaging_prescriptions = frappe.get_all(
            "Imaging Prescription",
            filters={
                "imaging_scan_template": doc.imaging_scan_template,
                "parent": doc.source_document,
            },
            fields=["name"],
        )
        if imaging_prescriptions:
            prescription_names = [
                prescription["name"] for prescription in imaging_prescriptions
            ]
            frappe.db.sql(
                """
                UPDATE `tabImaging Prescription`
                SET lab_test_created = 1
                WHERE name IN (%s)
            """
                % ",".join(["%s"] * len(prescription_names)),
                tuple(prescription_names),
            )


def generate_random_barcode(doc, id_field):
    if not id_field:
        existing_barcodes = set(frappe.get_all(doc.doctype, fields=[id_field]))
        while True:
            barcode = "".join(random.choices(string.digits, k=16))
            if barcode not in existing_barcodes:
                id_field = barcode
                break


@frappe.whitelist()
def get_imaging_tests_by_type(patient, test_type):
    results = frappe.db.sql(
        """
        SELECT
            ip.scan_type,
            ip.imaging_scan_template,
            COALESCE(pe.name, ems.name, pr.name) AS parent_docname,
            COALESCE(pe.practitioner, ems.practitioner, pr.practitioner) AS healthcare_practitioner,
            ip.invoiced,
            CASE
                WHEN pe.name IS NOT NULL THEN 'Patient Encounter'
                WHEN ems.name IS NOT NULL THEN 'Emergency Medical Services'
                ELSE 'Premature'
            END AS parent_doctype
        FROM
            `tabImaging Prescription` ip
        LEFT JOIN
            `tabPatient Encounter` pe ON ip.parent = pe.name
        LEFT JOIN
            `tabEmergency Medical Services` ems ON ip.parent = ems.name
        LEFT JOIN
            `tabPremature` pr ON ip.parent = pr.name
        WHERE
            (pe.patient = %s OR ems.patient = %s OR pr.patient = %s)
            AND ip.scan_type = %s
            AND ip.lab_test_created = 0
            AND (pe.docstatus = 1 OR ems.docstatus = 1 OR pr.docstatus = 1)
        """,
        (patient, patient, patient, test_type),
        as_dict=True,
    )
    return results


@frappe.whitelist()
def mark_imaging_test_created(document_source, test_type):
    doc = frappe.get_doc(document_source)
    doc.lab_test_created = 1
    doc.save()
    return True


@frappe.whitelist()
def get_imaging_tests(patient):
    results = frappe.db.sql(
        """
        SELECT
            ip.scan_type,
            ip.imaging_scan_template,
            CONCAT(ip.parent, ' (', COALESCE(pe.name, ems.name, pr.name), ')') AS parent,
            ip.invoiced,
            ip.service_request,
            ip.lab_test_comment,
            ip.lab_test_created,
            ip.patient_care_type,
            ip.intent,
            ip.priority
        FROM
            `tabImaging Prescription` ip
        LEFT JOIN
            `tabPatient Encounter` pe ON ip.parent = pe.name
        LEFT JOIN
            `tabEmergency Medical Services` ems ON ip.parent = ems.name
        LEFT JOIN
            `tabPremature` pr ON ip.parent = pr.name
        WHERE
            (pe.patient = %s OR ems.patient = %s OR pr.patient = %s)
            AND ip.invoiced = 0
            AND (pe.docstatus = 1 OR ems.docstatus = 1 OR pr.docstatus = 1)
        """,
        (patient, patient, patient),
        as_dict=True,
    )
    return results


@frappe.whitelist()
def mark_imaging_tests_invoiced(imaging_scan_template):
    frappe.db.sql(
        """
        UPDATE `tabImaging Prescription`
        SET invoiced = 1
        WHERE imaging_scan_template = %s AND invoiced = 0
    """,
        (imaging_scan_template,),
    )
    return True


@frappe.whitelist()
def get_lab_test_prescribed(patient, healthcare_practitioner):
    results = frappe.db.sql(
        """
        SELECT
            lp.name,
            lp.lab_test_code,
            CONCAT(lp.parent, ' (', COALESCE(pe.name, ems.name, pr.name), ')') AS parent,
            lp.invoiced,
            lp.lab_test_comment,
            COALESCE(pe.practitioner_name, ems.practitioner_name, pr.practitioner_name) AS practitioner_name,
            COALESCE(pe.encounter_date, ems.entry, pr.entry) AS encounter_date
        FROM
            `tabLab Prescription` lp
        LEFT JOIN
            `tabPatient Encounter` pe ON lp.parent = pe.name
        LEFT JOIN
            `tabEmergency Medical Services` ems ON lp.parent = ems.name
        LEFT JOIN
            `tabPremature` pr ON lp.parent = pr.name
        WHERE
            (pe.patient = %s OR ems.patient = %s OR pr.patient = %s)
            AND (pe.practitioner = %s OR ems.practitioner = %s OR pr.practitioner = %s)
            AND lp.lab_test_created = 0
        """,
        (
            patient,
            patient,
            patient,
            healthcare_practitioner,
            healthcare_practitioner,
            healthcare_practitioner,
        ),
        as_dict=True,
    )
    return results


def update_message(doc) -> None:
    if len(doc.references_table) > 0:
        frappe.msgprint(
            title=_("Attention!"),
            msg=_(
                "This document contains a linked journal entry. Please make sure to review the linked entry for important additional information related to this document."
            ),
        )


@frappe.whitelist()
def schedule_inpatient(args) -> None:
    admission_order = json.loads(args)
    if not admission_order or not admission_order["patient"]:
        frappe.throw(_("Missing required details, did not create Inpatient Record"))

    inpatient_record = frappe.new_doc("Inpatient Record")

    set_details_from_ip_order(inpatient_record, admission_order)

    patient = frappe.get_doc("Patient", admission_order["patient"])
    inpatient_record.update(
        {
            "patient": patient.name,
            "patient_name": patient.patient_name,
            "gender": patient.sex,
            "blood_group": patient.blood_group,
            "dob": patient.dob,
            "mobile": patient.mobile,
            "email": patient.email,
            "phone": patient.phone,
            "scheduled_date": today(),
        }
    )

    encounter = frappe.get_doc(
        "Emergency Medical Services", admission_order["emergency_medical_services"]
    )
    if encounter:
        if encounter.symptoms:
            set_ip_child_records(
                inpatient_record, "chief_complaint", encounter.symptoms
            )
        if encounter.diagnosis:
            set_ip_child_records(inpatient_record, "diagnosis", encounter.diagnosis)
        if encounter.drug_prescription:
            set_ip_child_records(
                inpatient_record, "drug_prescription", encounter.drug_prescription
            )
        if encounter.lab_test_prescription:
            set_ip_child_records(
                inpatient_record,
                "lab_test_prescription",
                encounter.lab_test_prescription,
            )

    inpatient_record.status = "Admission Scheduled"
    inpatient_record.save(ignore_permissions=True)


@frappe.whitelist()
def schedule_discharge(args) -> None:
    discharge_order = json.loads(args)
    if (
        not discharge_order
        or not discharge_order["patient"]
        or not discharge_order["discharge_ordered_datetime"]
    ):
        frappe.throw(_("Missing required details, did not create schedule discharge"))

    inpatient_record_id = frappe.db.get_value(
        "Patient", discharge_order["patient"], "inpatient_record"
    )
    if inpatient_record_id:
        inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_id)
        check_out_inpatient(
            inpatient_record, discharge_order["discharge_ordered_datetime"]
        )
        set_details_from_ip_order(inpatient_record, discharge_order)
        inpatient_record.status = "Discharge Scheduled"
        inpatient_record.save(ignore_permissions=True)
        frappe.db.set_value(
            "Patient",
            discharge_order["patient"],
            "inpatient_status",
            inpatient_record.status,
        )
        frappe.db.set_value(
            "Emergency Medical Services",
            inpatient_record.emergency_medical_services_discharge,
            "inpatient_status",
            inpatient_record.status,
        )


def check_out_inpatient(inpatient_record, discharge_ordered_datetime) -> None:
    if inpatient_record.inpatient_occupancies:
        for inpatient_occupancy in inpatient_record.inpatient_occupancies:
            if inpatient_occupancy.left != 1:
                inpatient_occupancy.update(
                    {"left": True, "check_out": discharge_ordered_datetime}
                )
                frappe.db.set_value(
                    "Healthcare Service Unit",
                    inpatient_occupancy.service_unit,
                    "occupancy_status",
                    "Vacant",
                )


def set_details_from_ip_order(inpatient_record, ip_order) -> None:
    for key, value in ip_order.items():
        inpatient_record.set(key, value)


def set_ip_child_records(
    inpatient_record, inpatient_record_child, encounter_child
) -> None:
    for item in encounter_child:
        table = inpatient_record.append(inpatient_record_child)
        for df in table.meta.get("fields"):
            table.set(df.fieldname, item.get(df.fieldname))


def create_medication_invoice(self) -> None:
    try:
        letter_head = frappe.db.get_value(
            "Company", self.company, "default_letter_head"
        )
        if not self.patient or not self.practitioner:
            frappe.throw(_("Patient or Practitioner is not defined"))

        settings = frappe.get_single("Default Healthcare Service Settings")
        if not settings:
            frappe.throw(_("Default Healthcare Service Settings not found"))

        income_account = None
        if self.doctype == "Premature":
            income_account = settings.premature_income_account
        elif self.doctype == "Emergency Medical Services":
            income_account = settings.medication_income_account

        if not income_account:
            frappe.throw(
                _(
                    "Please set the appropriate income account in Default Healthcare Service Settings"
                )
            )

        if not self.drug_prescription:
            frappe.throw(_("Drug prescription items are not defined"))

        invoice_items = [
            {
                "item_code": item.drug_code,
                "qty": item.quantity,
                "uom": item.uom,
                "income_account": income_account,
                "drug_prescription": f"Dosage: {item.dosage}|Period: {item.period}|Dosage Form: {item.dosage_form}",
            }
            for item in self.drug_prescription
        ]

        invoice = frappe.get_doc(
            {
                "doctype": "Sales Invoice",
                "customer": self.patient,
                "patient": self.patient,
                "ref_practitioner": self.practitioner,
                "update_stock": True,
                "letter_head": letter_head,
                "items": invoice_items,
            }
        )

        invoice.insert()
        invoice.submit()

    except Exception as e:
        frappe.log_error(message=str(e), title="Error creating medication invoice")
        frappe.throw(
            _("There was an error creating the medication invoice: {0}").format(str(e))
        )


def create_healthcare_service_invoice(self, item_code, qty) -> None:
    letter_head = frappe.db.get_value("Company", self.company, "default_letter_head")
    settings = frappe.get_single("Default Healthcare Service Settings")

    if not item_code or not settings.healthcare_service_income_account:
        frappe.throw(
            _(
                "Please set the healthcare service item and income account in Default Healthcare Service Settings"
            )
        )

    invoice = frappe.get_doc(
        {
            "doctype": "Sales Invoice",
            "customer": self.patient,
            "patient": self.patient,
            "ref_practitioner": self.practitioner,
            "update_stock": False,
            "letter_head": letter_head,
            "items": [
                {
                    "item_code": item_code,
                    "item_name": item_code,
                    "income_account": settings.healthcare_service_income_account,
                    "qty": qty,
                }
            ],
        }
    )

    invoice.insert()
    invoice.submit()
    self.invoiced = True
