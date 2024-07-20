# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from healthcare_addon.utils.utils import generate_random_barcode, mark_imaging_tests_created

class Xray(Document):
    def before_save(self):
        # Generate random barcode for each X-ray and assign it to field xray_id
        generate_random_barcode(self, self.xray_id)

    def on_submit(self):
        # Call the method to mark imaging tests as created
        mark_imaging_tests_created(self)
