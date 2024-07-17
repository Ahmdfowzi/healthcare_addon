# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import random
import string
import frappe
from frappe.model.document import Document


class MRI(Document):
    def before_save(self):
        # Generate random barcode for each MRI and assign it to field mri_id
        self.generate_random_barcode()

        # Create an invoice for each MRI
        # self.create_invoice()

    def generate_random_barcode(self):
        if not self.mri_id:
            while True:
                barcode = ''.join(random.choices(string.digits, k=10))
                if not frappe.db.exists('MRI', {'mri_id': barcode}):
                    self.mri_id = barcode
                    break

    def create_invoice(self):
        # Check if an invoice already exists for this MRI
        if not frappe.db.exists('Sales Invoice', {'mri_id': self.mri_id}):
            invoice = frappe.new_doc('Sales Invoice')
            invoice.customer = self.patient  # Assuming patient is the customer
            invoice.due_date = self.imaging_date
            invoice.mri_id = self.mri_id

            # Add items to the invoice
            invoice.append('items', {
                'item_code': 'MRI Service',  # Item code for MRI
                'qty': 1,
                'rate': 100.0  # Example rate for the MRI
            })

            # Insert the invoice into the database
            invoice.insert()
            frappe.db.commit()
