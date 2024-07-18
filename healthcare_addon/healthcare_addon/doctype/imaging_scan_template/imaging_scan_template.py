# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class ImagingScanTemplate(Document):
    def before_save(self):
        if not self.item_code and self.is_billable:
            self.create_associated_item()

    def create_associated_item(self):
        item = frappe.new_doc("Item")
        item.item_code = self.scan_template_name
        item.item_name = self.scan_template_name
        item.item_group = "Imaging"  # Adjust as necessary
        item.is_sales_item = 1
        item.is_service_item = 1
        item.standard_rate = self.rate
        item.insert()
        
        self.item_code = item.name

@frappe.whitelist()
def create_item_for_scan_template(scan_template_name):
    template = frappe.get_doc("Imaging Scan Template", scan_template_name)
    if template.is_billable and not template.item_code:
        template.create_associated_item()
        template.save()
    return template.item_code
