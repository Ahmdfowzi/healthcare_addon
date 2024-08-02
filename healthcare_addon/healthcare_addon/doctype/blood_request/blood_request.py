# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class BloodRequest(Document):
	def on_submit(self):
		for bld in self.collection_bag:
			bag = frappe.get_doc("Blood Collection Bag",bld.blood_collection_bag)
			bag.consumed = 1
			bag.save()



@frappe.whitelist()
def return_collection_bags(bag_names):
	if isinstance(bag_names, str):
		bag_names = frappe.parse_json(bag_names)

	for bag_name in bag_names:
		doc = frappe.get_doc("Blood Collection Bag", bag_name)
		doc.consumed = 0
		doc.returned = 1
		doc.save()

	return _("All selected bags have been processed.")