import frappe


def on_submit(doc, method) -> None:
    """
    It creates a new Sales Invoice, adds the patient and practitioner to it, and adds each drug in the
    prescription to the invoice
    
    :param doc: The document that is being submitted
    :param method: The name of the method that is being called
    """
    letter_head = frappe.db.get_value(
        'Company', doc.company, 'default_letter_head')
    invoice = frappe.new_doc("Sales Invoice")
    invoice.customer = doc.patient
    invoice.patient = doc.patient
    invoice.ref_practitioner = doc.practitioner
    invoice.update_stock = True
    if letter_head != None:
        invoice.letter_head = letter_head
    items = set()
    for item in doc.medication_orders:
        if item.drug in items:
            continue
        invoice.append("items", {
            "item_code": item.drug,
            'qty': 1,
        })
        items.add(item.drug)
    invoice.insert()
    frappe.msgprint(str(invoice))
