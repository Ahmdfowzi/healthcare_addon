import frappe

@frappe.whitelist()
def get_patient_floor_section_room():
    """
    Fetches patient room assignments, including the floor, section, and room details.
    """
    result = frappe.db.sql("""
    SELECT 
        hsu.service_unit_type AS floor, ir.patient_name AS patient, hsu.name AS healthcare_service_unit_name, 
        hsu.parent_healthcare_service_unit, ir.gender 
    FROM 
        `tabInpatient Occupancy` io
    JOIN 
        `tabHealthcare Service Unit` hsu ON io.service_unit = hsu.name 
    JOIN 
        `tabInpatient Record` ir ON ir.name = io.parent
    WHERE 
        io.left = 0
    """, as_dict=True)
    return result

@frappe.whitelist()
def get_patient_floor_drug(date):
    """
    Fetches patient medication schedules for a given date.
    
    :param date: The date for which to fetch the medication schedules.
    :return: A list of dictionaries containing the medication schedules.
    """
    result = frappe.db.sql(f"""
    SELECT 
        ime.dosage_form, ime.date, ime.time, ime.is_completed, ime.drug_name, 
        ir.patient_name AS patient, ir.gender, ir.admission_service_unit_type AS floor 
    FROM 
        `tabInpatient Medication Order Entry` ime
    JOIN 
        `tabInpatient Medication Order` imo ON imo.name = ime.parent
    JOIN 
        `tabInpatient Record` ir ON ir.name = imo.inpatient_record
    JOIN 
        `tabHealthcare Service Unit` hsu ON ir.admission_service_unit_type = hsu.service_unit_type
    WHERE 
        hsu.occupancy_status = "Occupied" AND ime.date = %s AND ime.is_completed = 0
    ORDER BY 
        TIME(ime.time) ASC
    """, (date,), as_dict=True)
    return result
