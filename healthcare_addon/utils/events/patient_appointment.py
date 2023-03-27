import frappe
from frappe import _
from healthcare_addon.utils.utils import cancel_references_table_docs, calculate_practitioner_contribution, update_message
from frappe.realtime import publish_realtime

def before_save(doc, method) -> None:
    rate = get_service_rate(doc)
    calculate_practitioner_contribution(doc, rate=rate)


def after_delete(doc, method) -> None:
    cancel_references_table_docs(doc)


def on_update(doc, method) -> None:
    rate = get_service_rate(doc)
    calculate_practitioner_contribution(doc, rate=rate)
    update_message(doc)


def get_service_rate(doc):
    service_items = frappe.get_doc('Appointment Type', doc.appointment_type)
    for item in service_items.items:
        if item.medical_department == doc.department:
            rate = item.op_consulting_charge
            break
    return rate

def validate(doc, method) -> None:
    publish_realtime("new-appointment",{"patient_name":doc.patient_name})