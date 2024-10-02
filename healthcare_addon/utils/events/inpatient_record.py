import frappe
from frappe import _
from healthcare_addon.utils.utils import create_draft_sales_invoice
from frappe.utils import now_datetime, add_to_date, nowdate


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

frappe.whitelist()
def create_draft_invoices_for_admitted_patients():
    healthcare_settings = frappe.get_single('Default Healthcare Service Settings')
    desired_item_code = healthcare_settings.item_for_inpatient_every_24h

    if not desired_item_code:
        frappe.throw("Item code for inpatient every 24 hours is not set in Healthcare Service Settings.")

    inpatients = frappe.get_all('Inpatient Record', filters={'status': 'Admitted'})

    for inpatient in inpatients:
        patient_doc = frappe.get_doc('Inpatient Record', inpatient.name)

        # Check for existing draft invoices
        existing_invoice = frappe.get_all('Sales Invoice', 
            filters={
                'patient': patient_doc.patient,
                'company': patient_doc.company,
                'status': 'Draft',
                'creation': ['>=', add_to_date(now_datetime(), hours=-24)]
            }, 
            limit=1
        )

        if not existing_invoice:
            try:
                invoice = frappe.new_doc('Sales Invoice')
                invoice.patient = patient_doc.patient
                # invoice.patient_name = patient_doc.patient_name  # Uncomment if needed
                invoice.posting_date = nowdate()

                invoice.append('items', {
                    'item_code': desired_item_code,
                    'qty': 1,
                })
                
                invoice.insert(ignore_permissions=True)
                frappe.db.commit()  # Ensure the invoice is saved  # Ensure the invoice is saved

                frappe.logger().info(f"Created draft invoice for patient: {patient_doc.patient}")
            
            except Exception as e:
                frappe.logger().error(f"Error creating draft invoice for patient: {patient_doc.patient}. Error: {str(e)}")
                frappe.throw(f"Failed to create draft invoice for patient {patient_doc.patient}.")


@frappe.whitelist()
def before_save(doc, method):
    # Check if the status is being changed to 'Discharged'
    if doc.status == 'Discharged':
        # Check for any draft invoices related to this patient
        draft_invoices = frappe.get_all('Sales Invoice', filters={
            'patient': doc.patient,
            'company': doc.company,
            'status': 'Draft'
        }, fields=['name'])
        
        if draft_invoices:
            # Create a list of links to draft invoices
            invoice_links = ', '.join([frappe.utils.get_link_to_form('Sales Invoice', inv['name'], label=inv['name']) for inv in draft_invoices])
            
            # Throw an error with a list of draft invoices
            frappe.throw(_("Cannot discharge the patient until all invoices are submitted. Draft Invoices: {0}").format(invoice_links))
