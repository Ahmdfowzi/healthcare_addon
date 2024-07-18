# Copyright (c) 2023, Ahmed Ghazi and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from healthcare_addon.utils.utils import create_medication_invoice, create_healthcare_service_invoice


class Premature(Document):

    def before_save(self) -> None:
        """
        It calculates the practitioner's contribution to the total amount of the bill
        """
        pass
    def on_submit(self) -> None:

        # Checking if the drug_prescription table has any item in it. If it does, it will create a sales Invoice
        if len(self.drug_prescription) > 0:
            create_medication_invoice(self)



        create_premature_services_invoice(self)

    def on_cancel(self) -> None:
        """
        It cancels the references table documents that are related to the current document
        """
        pass

    def before_update_after_submit(self) -> None:
        pass


def create_premature_services_invoice(self) -> None:
    """
    It creates a new Sales Invoice for premature services
    """
    item_code = frappe.db.get_single_value(
        "Default Healthcare Service Settings", "premature_service_item")
    create_healthcare_service_invoice(self, item_code, 1)
