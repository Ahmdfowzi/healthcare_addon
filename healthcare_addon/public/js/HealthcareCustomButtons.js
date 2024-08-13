

frappe.provide('healthcare_addon.HealthcareCustomButtons');


class HealthcareCustomButtons {
    constructor(frm, practitioner_field_name = 'healthcare_practitioner') {
        this.frm = frm;
        this.practitioner_field_name = practitioner_field_name;
    }

    addCustomButtons() {
        if (!this.frm.is_new()) {
            const createButtons = [
                { label: 'Laboratory Test', action: () => this.showLabTestDialog() },
                { label: 'Medication', action: () => this.showMedicationDialog() },
                { label: 'Clinical Procedure', action: () => this.showClinicalProcedureDialog() },
                { label: 'CT Scan', action: () => this.showImagingTestDialog("CT Scan") },
                { label: 'X-Ray', action: () => this.showImagingTestDialog("X-ray") },
                { label: 'MRI', action: () => this.showImagingTestDialog("MRI") }
            ];

            createButtons.forEach(button => {
                this.frm.add_custom_button(__(button.label), button.action, __('Create'));
            });
        }
    }

    showMedicationDialog() {
        console.log(this.frm.doc[this.practitioner_field_name]);
        frappe.prompt({
            label: 'Medications',
            fieldname: 'medications',
            fieldtype: 'Small Text',
        }, (values) => {
            frappe.call({
                method: 'healthcare_addon.healthcare_addon.doctype.prescription.prescription.create_prescription_doc',
                args: {
                    patient: this.frm.doc.patient,
                    healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
                    medications: values.medications
                },
                callback: function (r) {
                    if (r && r.message) {
                        frappe.msgprint(__(`Medication For ${this.frm.doc.patient} created successfully`));
                    }
                }
            });
        });
    }

    showClinicalProcedureDialog() {
        frappe.prompt({
            label: 'Clinical Procedure Template',
            fieldname: 'procedure_template',
            fieldtype: 'Link',
            options: 'Clinical Procedure Template',
        }, (values) => {
            try {
                frappe.call({
                    method: 'healthcare_addon.utils.utils.create_clinical_procedure_invoice',
                    args: {
                        patient: this.frm.doc.patient,
                        company: this.frm.doc.company,
                        clinical_procedure_template: values.procedure_template,
                        healthcare_practitioner: this.frm.doc[this.practitioner_field_name]
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.msgprint(__(`Invoice ${r.message} created successfully`));
                        }
                    }
                });

                frappe.call({
                    method: 'healthcare_addon.utils.utils.create_clinical_procedure_doc',
                    args: {
                        patient: this.frm.doc.patient,
                        company: this.frm.doc.company,
                        healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
                        clinical_procedure_template: values.procedure_template
                    },
                    callback: function (r) {
                        if (r && r.message) {
                            frappe.msgprint(__("Clinical Procedure For {0} created successfully", [this.frm.doc.patient]));
                        }
                    }
                });
            } catch (error) {
                console.log(error);
            }
        });
    }

    showLabTestDialog() {
        new frappe.ui.form.MultiSelectDialog({
            doctype: "Lab Test Template",
            target: this.frm,
            setters: {
                department: null,
                is_billable: 1
            },
            date_field: "modified",
            get_query() {
                return {
                    filters: { disabled: 0 }
                };
            },
            action: (selections) => {
                if (selections.length === 0) {
                    frappe.msgprint(__("Please select at least one lab test template."));
                    return;
                }
                this.createLabTestInvoice(selections);
                this.createLabTestDoc(selections);
                this.addLabTestToDoc(selections);
            }
        });
    }

    addLabTestToDoc(selections) {
        selections.forEach(selection => {
            this.frm.add_child('lab_test_prescription', {
                lab_test_code: selection
            });
            this.frm.refresh_field('lab_test_prescription');
            this.frm.save();
        });
    }

    createLabTestDoc(lab_test_templates) {
        frappe.call({
            method: 'healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.create_lab_test_from_inpatient_record',
            args: {
                patient: this.frm.doc.patient,
                healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
                lab_test_templates: lab_test_templates
            },
            callback: function (r) {
                if (r && r.message) {
                    frappe.msgprint(__("Laboratory Test For {0} created successfully", [r.message.name]));
                }
            }
        });
    }

    showImagingTestDialog(scan_type) {
        new frappe.ui.form.MultiSelectDialog({
            doctype: "Imaging Scan Template",
            target: this.frm,
            setters: {
                is_billable: 1
            },
            date_field: "modified",
            get_query() {
                return {
                    filters: { scan_type: scan_type }
                };
            },
            action: (selections) => {
                if (selections.length === 0) {
                    frappe.msgprint(__("Please select at least one imaging scan template."));
                    return;
                }
                this.createImagingTestInvoice(selections);
                this.createImagingScanDoc(selections);
                this.addImagingScanToDoc(scan_type, selections);
            }
        });
    }

    addImagingScanToDoc(scan_type, selections) {
        selections.forEach(selection => {
            this.frm.add_child('custom_imaging_prescription', {
                scan_type: scan_type,
                imaging_scan_template: selection
            });
            this.frm.refresh_field('custom_imaging_prescription');
            this.frm.save();
        });
    }

    createLabTestInvoice(selections) {
        frappe.db.get_single_value('Default Healthcare Service Settings', 'hospital_laboratory_entity')
            .then(company => {
                if (!company) {
                    frappe.msgprint(__("Please set default Laboratory Entity in Healthcare Settings."));
                    return;
                }

                frappe.call({
                    method: 'healthcare_addon.utils.utils.create_lab_test_invoice',
                    args: {
                        patient: this.frm.doc.patient,
                        company: company,
                        lab_test_templates: selections,
                        healthcare_practitioner: this.frm.doc[this.practitioner_field_name]
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
                        }
                    }
                });
            });
    }

    createImagingTestInvoice(selections) {
        frappe.call({
            method: 'healthcare_addon.utils.utils.create_imaging_test_invoice',
            args: {
                patient: this.frm.doc.patient,
                company: this.frm.doc.company,
                image_test_templates: JSON.stringify(selections),
                healthcare_practitioner: this.frm.doc[this.practitioner_field_name]
            },
            callback: function (r) {
                if (r.message) {
                    frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
                }
            }
        });
    }



    createImagingScanDoc(image_test_templates) {
        frappe.call({
            method: 'healthcare_addon.utils.utils.create_imaging_test_from_inpatient_record',
            args: {
                patient: this.frm.doc.patient,
                healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
                imaging_scan_templates: image_test_templates
            },
            callback: function (r) {
                if (r && r.message) {
                    console.table(r.message);
                    frappe.msgprint(__("Imaging Scan For {0} created successfully", [this.frm.doc.patient]));
                }
            }
        });
    }
}

// At the end of the file, replace the existing export with:
frappe.provide('healthcare_addon.HealthcareCustomButtons');
healthcare_addon.HealthcareCustomButtons = HealthcareCustomButtons;