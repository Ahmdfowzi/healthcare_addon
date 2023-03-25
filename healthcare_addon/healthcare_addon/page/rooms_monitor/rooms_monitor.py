import frappe

@frappe.whitelist()
def get_patient_floor_drug(date):
    """
    It returns a list of dictionaries containing the drug name, dosage form, time, date, gender, patient
    name, and floor of the patient for all the patients who are currently admitted in the hospital and
    have not completed their medication for the given date
    
    :param date: The date for which you want to get the data
    :return: A list of dicts.
    """
    result = frappe.db.sql(f"""
    select * from (select dosage_form,date,time,is_completed,drug_name,`tabInpatient Record`.name,gender,`tabInpatient Record`.patient  from `tabInpatient Medication Order` 
    join `tabInpatient Medication Order Entry` on `tabInpatient Medication Order`.name = `tabInpatient Medication Order Entry`.parent
    join `tabInpatient Record` on  `tabInpatient Record`.name = `tabInpatient Medication Order`.inpatient_record
    join `tabHealthcare Service Unit` on `tabInpatient Record`.admission_service_unit_type = `tabHealthcare Service Unit`.service_unit_type
    where occupancy_status = "Occupied" and date = "{date}" and is_completed = 0
    ) as result1
    join (
    select service_unit_type as floor,patient_name as p_name from `tabInpatient Occupancy`
    join `tabHealthcare Service Unit` on `tabInpatient Occupancy`.service_unit = `tabHealthcare Service Unit`.name 
    join `tabInpatient Record` on `tabInpatient Record`.name = `tabInpatient Occupancy`.parent
    where `tabInpatient Occupancy`.left = 0
    ) as result2
    on result2.p_name = result1.patient
    ORDER BY TIME(time) asc
    """,as_dict=True)
    return result


@frappe.whitelist()
def get_patient_floor_section_room():
    """
    It returns a list of dictionaries, each dictionary containing the service unit type, patient name,
    healthcare service unit name, parent healthcare service unit, and all the fields from the inpatient
    record
    :return: A list of dictionaries.
    """
    result = frappe.db.sql(f"""
    select service_unit_type,patient_name,healthcare_service_unit_name,parent_healthcare_service_unit,`tabInpatient Record`.* from `tabInpatient Occupancy`
    join `tabHealthcare Service Unit` on `tabInpatient Occupancy`.service_unit = `tabHealthcare Service Unit`.name 
    join `tabInpatient Record` on `tabInpatient Record`.name = `tabInpatient Occupancy`.parent
    where `tabInpatient Occupancy`.left = 0
    """,as_dict=True)
    return result

@frappe.whitelist()
def get_floor_section_room():
    """
    It returns a list of dictionaries, each dictionary representing a row in the table
    :return: A list of dictionaries.
    """
    result = frappe.db.sql(f"""
    select * from `tabHealthcare Service Unit`
    where is_group = 0
    """,as_dict=True)
    return result