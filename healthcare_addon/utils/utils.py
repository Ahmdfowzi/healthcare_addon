import json
import random
import string
import frappe
from frappe import _
from frappe.utils import today



@frappe.whitelist()
def get_terms_and_conditions(template_name, doc):
    if isinstance(doc, str):
        doc = json.loads(doc)

    terms_and_conditions = frappe.get_doc("Terms and Conditions", template_name)

    if terms_and_conditions.terms:
        context = {"doc": doc}  # Create a context dictionary with 'doc'
        return frappe.render_template(terms_and_conditions.terms, context)
    

@frappe.whitelist()
def create_lab_test_invoice(patient, company, lab_test_templates):
    lab_test_templates = frappe.parse_json(lab_test_templates)
    
    items = []
    for template in lab_test_templates:
        template_doc = frappe.get_doc("Lab Test Template", template)
        items.append({
            "item_code": template_doc.item,
            "qty": 1,
            "rate": template_doc.lab_test_rate
        })

    income_account = frappe.get_cached_value('Company', company, 'default_income_account')
    customer = patient
    practitioner = frappe.get_value("Inpatient Record", {"patient": patient, "status": "Admitted"}, "primary_practitioner")
    if not practitioner:
        practitioner = None  # or any default value you want to use
    if not customer:
        frappe.throw(_("Please link a Customer to the Patient {0}").format(patient))

    invoice = create_draft_sales_invoice(
        income_account,
        company,
        customer,
        patient,
        practitioner,
        items
    )

    return invoice.name


@frappe.whitelist()
def create_imaging_test_invoice(patient, company, image_test_templates):
    image_test_templates = frappe.parse_json(image_test_templates)
    
    items = []
    for template in image_test_templates:
        template_doc = frappe.get_doc("Lab Test Template", template)
        items.append({
            "item_code": template_doc.item,
            "qty": 1,
            "rate": template_doc.lab_test_rate
        })

    income_account = frappe.get_cached_value('Company', company, 'default_income_account')
    customer = patient
    practitioner = frappe.get_value("Inpatient Record", {"patient": patient, "status": "Admitted"}, "primary_practitioner")
    if not practitioner:
        practitioner = None  # or any default value you want to use
    if not customer:
        frappe.throw(_("Please link a Customer to the Patient {0}").format(patient))

    invoice = create_draft_sales_invoice(
        income_account,
        company,
        customer,
        patient,
        practitioner,
        items
    )

    return invoice.name


def create_draft_sales_invoice(
    account,
    company,
    customer,
    patient,
    practitioner,
    items,
    posting_date=None,
    due_date=None
):
    """
    Create a draft Sales Invoice from various doctypes.
    
    Args:
        account (str): Income account for the invoice
        company (str): Company name
        customer (str): Customer name
        patient (str): Patient name
        items (list): List of dictionaries containing item details
        posting_date (str, optional): Posting date for the invoice
        due_date (str, optional): Due date for the invoice
    
    Returns:
        object: Created Sales Invoice document
    """
    try:
        # Create a new Sales Invoice
        invoice = frappe.new_doc("Sales Invoice")
        
        # Set basic details
        invoice.update({
            "company": company,
            "customer": customer,
            "patient": patient,
            "ref_practitioner": practitioner,
            "posting_date": posting_date or frappe.utils.today(),
            "due_date": due_date,
        })
        
        # Add items to the invoice
        for item in items:
            invoice.append("items", {
                "item_code": item.get("item_code"),
                "qty": item.get("qty", 1),
                "rate": item.get("rate"),
                "income_account": account
            })
        
        # Save the invoice
        invoice.save()
        
        return invoice
    
    except Exception as e:
        frappe.log_error(f"Error creating draft sales invoice: {str(e)}")
        frappe.throw(_("Error creating draft sales invoice. Please check the error log."))


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
        # invoice.submit()

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
