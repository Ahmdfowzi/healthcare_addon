

from frappe.realtime import publish_realtime

def make_establish(doc,method):
    if doc.status == 'Admitted':
        publish_realtime("enter",{"data":doc.patient_name})
        
    elif doc.status == "Discharged" :
        publish_realtime("out",{"data":doc.patient_name})