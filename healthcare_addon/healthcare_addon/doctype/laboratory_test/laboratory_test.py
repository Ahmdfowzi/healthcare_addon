# Copyright (c) 2024, Osama Muhammed and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class LaboratoryTest(Document):
    def before_save(self):
        # Check if it's the first time the document is being saved
        if not self.get("__islocal"):
            return

        for test in self.lab_tests:
            lab_test_template = frappe.get_doc("Lab Test Template", test.lab_test_code)
            if lab_test_template:
                for test_event in lab_test_template.normal_test_templates:
                    self.append(
                        "normal_test_items",
                        {
                            "lab_test_name": test.lab_test_code,
                            "lab_test_event": test_event.lab_test_event,
                            "lab_test_uom": test_event.lab_test_uom,
                            "normal_range": test_event.normal_range,
                            "custom_test_event_group": test_event.custom_test_event_group,
                        },
                    )
            if lab_test_template.custom_allow_stock_consumption:
                for item in lab_test_template.custom_items:
                    self.append(
                        "consumable_items",
                        {
                            "item_code": item.item_code,
                            "qty": item.qty,
                            "uom": item.uom,
                            "stock_uom": item.stock_uom,
                        },
                    )
        # self.patient_age= calculate_age_from_dob(self.patient)

    def on_submit(self):

        if self.lab_tests:
            for test in self.lab_tests:
                if test.custom_encounter != None:
                    create_lab_test_from_encounter(
                        test.custom_encounter, test.lab_test_code
                    )


@frappe.whitelist()
def map_laboratory_test_to_stock_entry(source_name, target_doc=None):
    laboratory_test = frappe.get_doc("Laboratory Test", source_name)

    mapped_stock_entry = get_mapped_doc(
        "Laboratory Test",
        source_name,
        {
            "Laboratory Test": {
                "doctype": "Stock Entry",
                "field_map": [
                    ["company", "company"],
                ],
            }
        },
        target_doc,
    )
    mapped_stock_entry.stock_entry_type = "Material Issue"
    mapped_stock_entry.custom_reference_document_type = laboratory_test.doctype
    mapped_stock_entry.custom_reference_document_id = laboratory_test.name

    for consumable_item in laboratory_test.consumable_items:
        mapped_stock_entry.append(
            "items",
            {
                "item_code": consumable_item.item_code,
                "uom": consumable_item.uom,
                "stock_uom": consumable_item.stock_uom,
                "qty": 1,
            },
        )

    return mapped_stock_entry


@frappe.whitelist()
def create_stock_entry_from_clinical_proc(source_name):
    clinical = frappe.get_doc("Clinical Procedure", source_name)

    # Create a new Stock Entry
    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.stock_entry_type = "Material Issue"
    stock_entry.company = clinical.company
    stock_entry.custom_reference_document_type = clinical.doctype
    stock_entry.custom_stock_entry_reference = clinical.name
    stock_entry.custom_reference_document_id = clinical.name
    stock_entry.from_warehouse = clinical.warehouse

    # Add items from the Clinical Procedure to the Stock Entry
    for consumable_item in clinical.custom_additional_cosumable_items:
        stock_entry.append(
            "items",
            {
                "item_code": consumable_item.item_code,
                "uom": consumable_item.uom,
                "stock_uom": consumable_item.stock_uom,
                "qty": 1,
            },
        )

    # Insert and submit the Stock Entry
    stock_entry.insert()
    stock_entry.submit()

    return stock_entry.name


def create_lab_test_from_encounter(encounter, lab_test_template):
    try:
        encounter = frappe.get_doc("Patient Encounter", encounter)

        if encounter and encounter.lab_test_prescription:
            for test in encounter.lab_test_prescription:
                if test.lab_test_code == lab_test_template:
                    frappe.db.set_value(
                        "Lab Prescription", test.name, "lab_test_created", 1
                    )
    except Exception as e:
        # Handle the exception (e.g., log the error or raise it)
        frappe.throw(f"Error in create_lab_test_from_encounter: {e}")


@frappe.whitelist()
def create_lab_test_from_inpatient_record(
    patient, healthcare_practitioner, lab_test_templates
):
    laboratory_test = frappe.new_doc("Laboratory Test")
    laboratory_test.patient = patient
    laboratory_test.primary_practitioner = healthcare_practitioner
    for test in frappe.parse_json(lab_test_templates):
        laboratory_test.append("lab_tests", {"lab_test_code": test})
    laboratory_test.insert(ignore_permissions=True, ignore_mandatory=True)
    return laboratory_test
