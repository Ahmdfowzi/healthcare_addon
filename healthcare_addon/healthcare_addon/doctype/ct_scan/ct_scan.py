import frappe
from frappe.model.document import Document
import random
import string

class CTScan(Document):
    def before_save(self):
        # Generate random barcode for each CT Scan and assign it to field ct_scan_id
        self.generate_random_barcode()

        # Create an invoice for each CT Scan
        # self.create_invoice()

    def generate_random_barcode(self):
        if not self.ct_scan_id:
            while True:
                barcode = ''.join(random.choices(string.digits, k=10))
                if not frappe.db.exists('CT Scan', {'ct_scan_id': barcode}):
                    self.ct_scan_id = barcode
                    break

    def create_invoice(self):
        # Check if an invoice already exists for this CT Scan
        if not frappe.db.exists('Sales Invoice', {'ct_scan_id': self.ct_scan_id}):
            invoice = frappe.new_doc('Sales Invoice')
            invoice.customer = self.patient  # Assuming patient is the customer
            invoice.due_date = self.imaging_date
            invoice.ct_scan_id = self.ct_scan_id

            # Add items to the invoice
            invoice.append('items', {
                'item_code': 'CT Scan Service',  # Item code for CT Scan
                'qty': 1,
                'rate': 100.0  # Example rate for the CT Scan
            })

            # Insert the invoice into the database
            invoice.insert()
            frappe.db.commit()
