import frappe
from frappe.model.document import Document
from healthcare_addon.utils.utils import generate_random_barcode, mark_imaging_tests_created

class CTScan(Document):
    def before_save(self):
        generate_random_barcode(self, self.ct_scan_id)
        

    def on_submit(self):
        # Call the method to mark imaging tests as created
        mark_imaging_tests_created(self)
