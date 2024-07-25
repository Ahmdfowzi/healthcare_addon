# Correct import path for utils
from healthcare_addon.utils.utils import create_medication_invoice, create_healthcare_service_invoice

import frappe
from frappe import _
from frappe.model.document import Document

class EmergencyMedicalServices(Document):

    def before_save(self) -> None:
        """
        This method can be used to perform calculations or validations before the document is saved.
        Currently, it is not implemented but intended for calculating the practitioner's contribution
        to the total bill amount if needed in the future.
        """
        pass
        
    def on_submit(self) -> None:
        """
        This method is triggered when the document is submitted. It performs actions such as creating
        invoices based on the presence of drug prescriptions and emergency medical services.
        """
        # Create medication invoice if there are items in the drug_prescription table
        if len(self.drug_prescription) > 0:
            create_medication_invoice(self)
        
        # Create emergency services invoice
        create_emergency_services_invoice(self)
    
    def on_cancel(self) -> None:
        """
        This method is triggered when the document is cancelled. It is used to cancel references to other
        documents related to the current document. Currently, it is not implemented but intended for future use.
        """
        pass

def create_emergency_services_invoice(self) -> None:
    """
    Creates an invoice for the patient with the item code specified in the Default Healthcare Service
    Settings. It uses the item code to create the healthcare service invoice.
    """
    try:
        item_code = frappe.db.get_single_value("Default Healthcare Service Settings", "emergency_medical_services_item")
        create_healthcare_service_invoice(self, item_code, 1)
    except Exception as e:
        frappe.log_error(f"Failed to create emergency services invoice: {str(e)}", _("Invoice Creation Error"))
        frappe.throw(_("Failed to create emergency services invoice. Please check logs for details."))
