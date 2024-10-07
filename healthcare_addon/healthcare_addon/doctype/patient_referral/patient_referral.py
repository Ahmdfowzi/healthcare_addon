import frappe
from frappe.model.document import Document

class PatientReferral(Document):
    pass  # keep class-related methods here if needed

# Whitelisted method outside of class
@frappe.whitelist()
def process_patient_referral(referral_name):
    referral_doc = frappe.get_doc("Patient Referral", referral_name)

    # Process Lab Prescriptions
    lab_items = []
    if referral_doc.lab_prescription:
        lab_company = frappe.db.get_single_value("Default Healthcare Service Settings", "hospital_laboratory_entity")

        lab_tests = []
        for row in referral_doc.lab_prescription:
            lab_tests.append({
                "lab_test_code": row.lab_test_code,
                "invoiced": 0,
                "lab_test_created": 0,
            })

            lab_items.append({
                "item_code": row.lab_test_code,
                "qty": 1,
            })

        # Create Lab Test Document
        lab_test_doc = frappe.get_doc({
            "doctype": "Laboratory Test",
            "patient": referral_doc.patient,
            "company": lab_company,
            "lab_tests": lab_tests,
            "status": "Draft"
        })
        lab_test_doc.insert()

        # Create Sales Invoice for Lab Tests
        create_sales_invoice(referral_doc.patient, lab_company, lab_items)

    # Process Imaging Prescriptions
    imaging_items = []
    if referral_doc.imaging_prescription:
        imaging_company = referral_doc.company

        for row in referral_doc.imaging_prescription:
            doctype = get_imaging_doctype(row.scan_type)
            if doctype:
                imaging_items.append({
                    "item_code": row.imaging_scan_template,
                    "qty": 1,
                })

                # Create Imaging Test Document
                imaging_test_doc = frappe.get_doc({
                    "doctype": doctype,
                    "patient": referral_doc.patient,
                    "imaging_scan_template": row.imaging_scan_template,
                    "report_status": "Draft",
                    "approval_status": "Pending",
                    "status": "Draft"
                })
                imaging_test_doc.flags.ignore_mandatory = True
                imaging_test_doc.insert()

        # Create Sales Invoice for Imaging Tests
        create_sales_invoice(referral_doc.patient, imaging_company, imaging_items) 

    # Update Patient Referral Status
    update_referral_status(referral_doc)


def create_sales_invoice(patient, company, items):
    invoice_doc = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": patient,
        "company": company,
        "status": "Draft",
        "items": items
    })
    invoice_doc.flags.ignore_mandatory = True
    invoice_doc.insert()


def get_imaging_doctype(scan_type):
    if scan_type == "X-ray":
        return "X-ray"
    elif scan_type == "CT Scan":
        return "CT Scan"
    elif scan_type == "MRI":
        return "MRI"
    return None


def update_referral_status(referral_doc):
    total_prescriptions = len(referral_doc.lab_prescription) + len(referral_doc.imaging_prescription)
    incomplete_tests = 0

    # Count incomplete Lab Tests
    incomplete_tests += frappe.db.count("Laboratory Test", filters={"patient": referral_doc.patient, "docstatus": 0})

    # Count incomplete Imaging Tests
    for doctype in ["X-ray", "CT Scan", "MRI"]:
        incomplete_tests += frappe.db.count(doctype, filters={"patient": referral_doc.patient, "docstatus": 0})

    # Update Status Based on Incomplete Tests
    if incomplete_tests == 0:
        referral_doc.status = "Incomplete"
    elif incomplete_tests > total_prescriptions:
        referral_doc.status = "Partly Complete"
    else:
        referral_doc.status = "Complete"

    referral_doc.save(ignore_permissions=True)
    frappe.db.commit()
