# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class BloodRequest(Document):
	def on_submit(self):
		for bld in self.collection_bag:
			bag = frappe.get_doc("Blood Collection Bag",bld.blood_collection_bag)
			bag.consumed = 1
			bag.save()
