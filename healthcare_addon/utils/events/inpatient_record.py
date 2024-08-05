import frappe
from frappe import _
from healthcare_addon.utils.utils import create_draft_sales_invoice


def after_insert(doc, method):
    if doc.emergency_medical_services:
        # Update Emergency Medical Services
        frappe.db.set_value(
            "Emergency Medical Services",
            doc.emergency_medical_services,
            {"inpatient_record": doc.name, "inpatient_status": doc.status},
        )

    # Fetch settings
    ip_invoice_item = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "inpatient_record_invoice_item"
    )
    ip_income_account = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "inpatient_record_income_account"
    )
    fees = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "inpatient_record_invoice_fees"
    )

    # Validate settings
    if not ip_invoice_item or not ip_income_account or not fees:
        frappe.throw(
            _(
                "Please set the inpatient record item, income account in Default Healthcare Service Settings, and inpatient record fees in Healthcare Settings"
            )
        )

    # Create draft sales invoice
    try:
        invoice = create_draft_sales_invoice(
            ip_income_account,
            doc.company,
            doc.patient,
            doc.patient,
			doc.primary_practitioner,
            [{"item_code": ip_invoice_item, "rate": fees, "qty": 1}],
        )
        frappe.msgprint(
            _("Invoice for Inpatient Record created successfully: {0}").format(
                invoice.name
            )
        )
    except Exception as e:
        frappe.log_error(
            f"Failed to create invoice for Inpatient Record {doc.name}: {str(e)}"
        )
        frappe.msgprint(_("Failed to create invoice. Please check the error log."))
        
