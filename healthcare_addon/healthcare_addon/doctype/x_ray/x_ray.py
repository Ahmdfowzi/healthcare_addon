# Copyright (c) 2024, Ahmed Ghazi and contributors
# For license information, please see license.txt

import random
import string
import frappe
from frappe.model.document import Document


class Xray(Document):
	def before_save(self):
		# Generate random barcode for each X-ray and assign it to field xray_id
		self.generate_random_barcode()

		# Create an invoice for each X-ray
		# self.create_invoice()

	def generate_random_barcode(self):
		if not self.xray_id:
			while True:
				barcode = ''.join(random.choices(string.digits, k=10))
				if not frappe.db.exists('X-ray', {'xray_id': barcode}):
					self.xray_id = barcode
					break

	def create_invoice(self):
		# Check if an invoice already exists for this X-ray
		if not frappe.db.exists('Sales Invoice', {'xray_id': self.xray_id}):
			invoice = frappe.new_doc('Sales Invoice')
			invoice.customer = self.patient  # Assuming patient is the customer
			invoice.due_date = self.imaging_date
			invoice.xray_id = self.xray_id

			# Add items to the invoice
			invoice.append('items', {
				'item_code': 'X-ray Service',  # Item code for X-ray
				'qty': 1,
				'rate': 100.0  # Example rate for the X-ray
			})

			# Insert the invoice into the database
			invoice.insert()
			frappe.db.commit()

