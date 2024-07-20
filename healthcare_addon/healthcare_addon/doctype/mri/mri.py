# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from healthcare_addon.utils.utils import generate_random_barcode, mark_imaging_tests_created

class MRI(Document):
    def before_save(self):
        generate_random_barcode(self, self.mri_id)

    def on_submit(self):
        # Call the method to mark imaging tests as created
        mark_imaging_tests_created(self)
