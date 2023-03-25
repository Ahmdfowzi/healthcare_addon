

from frappe.realtime import publish_realtime

def new_medication(doc,method):
    publish_realtime("new-medication",{"patient":doc.patient,"item_code" : doc.item_code})
        