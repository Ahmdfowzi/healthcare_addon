frappe.ui.form.on('Inpatient Record', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            addCustomButtons(frm);
        }
    }
});

function addCustomButtons(frm) {
    const createButtons = [
        { label: 'Laboratory Test', action: () => showLabTestDialog(frm) },
        { label: 'Medication', action: () => showMedicationDialog(frm) },
        { label: 'Clinical Procedure', action: () => showClinicalProcedureDialog(frm) },
        { label: 'CT Scan', action: () => showImagingTestDialog(frm, "CT Scan") },
        { label: 'X-Ray', action: () => showImagingTestDialog(frm, "X-ray") },
        { label: 'MRI', action: () => showImagingTestDialog(frm, "MRI") }
    ];

    createButtons.forEach(button => {
        frm.add_custom_button(__(button.label), button.action, __('Create'));
    });
}

function showMedicationDialog(frm) {
    frappe.prompt({
        label: 'Medications',
        fieldname: 'medications',
        fieldtype: 'Small Text',
    }, (values) => {
        createPrescription(frm, values.medications);
    });
}

function createPrescription(frm, medications) {
    frappe.call({
        method: 'healthcare_addon.healthcare_addon.doctype.prescription.prescription.create_prescription_doc',
        args: {
            patient: frm.doc.patient,
            healthcare_practitioner: frm.doc.primary_practitioner,
            medications: medications
        },
        callback: function (r) {
            if (r && r.message) {
                frappe.msgprint(__("Medication For {0} created successfully", [frm.patient]));
            }
        }
    });
}

function showClinicalProcedureDialog(frm) {
    frappe.prompt({
        label: 'Clinical Procedure Template',
        fieldname: 'procedure_template',
        fieldtype: 'Link',
        options: 'Clinical Procedure Template',
    }, (values) => {
        createClinicalProcedureInvoice(frm, values.procedure_template);
        createClinicalProcedureDoc(frm, values.procedure_template);
    });
}

function showLabTestDialog(frm) {
    new frappe.ui.form.MultiSelectDialog({
        doctype: "Lab Test Template",
        target: frm,
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
        action(selections) {
            if (selections.length === 0) {
                frappe.msgprint(__("Please select at least one lab test template."));
                return;
            }
            createLabTestInvoice(frm, selections);
            createLabTestDoc(frm, selections);
        }
    });
}

function createLabTestDoc(frm, lab_test_templates) {
    frappe.call({
        method: 'healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.create_lab_test_from_inpatient_record',
        args: {
            patient: frm.doc.patient,
            healthcare_practitioner: frm.doc.primary_practitioner,
            lab_test_templates: lab_test_templates
        },
        callback: function (r) {
            if (r && r.message) {
                console.table(r.message);
                frappe.msgprint(__("Laboratory Test For {0} created successfully", [r.message.name]));
            }
        }
    });
}

function createImagingScanDoc(frm, image_test_templates) {
    frappe.call({
        method: 'healthcare_addon.utils.utils.create_imaging_test_from_inpatient_record',
        args: {
            patient: frm.doc.patient,
            healthcare_practitioner: frm.doc.primary_practitioner,
            imaging_scan_templates: image_test_templates
        },
        callback: function (r) {
            if (r && r.message) {
                console.table(r.message);
                frappe.msgprint(__("Imaging Scan For {0} created successfully", [frm.doc.Patient]));
            }
        }
    });
}

function showImagingTestDialog(frm, scan_type) {
    new frappe.ui.form.MultiSelectDialog({
        doctype: "Imaging Scan Template",
        target: frm,
        setters: {
            is_billable: 1
        },
        date_field: "modified",
        get_query() {
            return {
                filters: { scan_type: scan_type }
            };
        },
        action(selections) {
            if (selections.length === 0) {
                frappe.msgprint(__("Please select at least one imaging scan template."));
                return;
            }
            createImagingTestInvoice(frm, selections);
            createImagingScanDoc(frm, selections);
        }
    });
}

function createLabTestInvoice(frm, selections) {
    frappe.db.get_single_value('Default Healthcare Service Settings', 'hospital_laboratory_entity')
        .then(settings => {
            if (!settings.company) {
                console.log(settings);
                frappe.msgprint(__("Please set default Laboratory Entity in Healthcare Settings."));
                return;
            }

            frappe.call({
                method: 'healthcare_addon.utils.utils.create_lab_test_invoice',
                args: {
                    patient: frm.doc.patient,
                    company: settings.company,
                    lab_test_templates: selections,
                    healthcare_practitioner: frm.doc.primary_practitioner
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
                    }
                }
            });
        });
}

function createImagingTestInvoice(frm, selections) {
    frappe.call({
        method: 'healthcare_addon.utils.utils.create_imaging_test_invoice',
        args: {
            patient: frm.doc.patient,
            company: frm.doc.company,
            image_test_templates: JSON.stringify(selections),
            healthcare_practitioner: frm.doc.primary_practitioner
        },
        callback: function (r) {
            if (r.message) {
                frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
            }
        }
    });
}

function createClinicalProcedureInvoice(frm, procedure_template) {
    frappe.call({
        method: 'healthcare_addon.utils.utils.create_clinical_procedure_invoice',
        args: {
            patient: frm.doc.patient,
            company: frm.doc.company,
            clinical_procedure_template: procedure_template,
            healthcare_practitioner: frm.doc.primary_practitioner
        },
        callback: function (r) {
            if (r.message) {
                frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
            }
        }
    });
}



function createClinicalProcedureDoc(frm, procedure_template) {
    frappe.call({
        method: 'healthcare_addon.utils.utils.create_clinical_procedure_doc',
        args: {
            patient: frm.doc.patient,
            company: frm.doc.company,
            healthcare_practitioner: frm.doc.primary_practitioner,
            clinical_procedure_template: procedure_template
        },
        callback: function (r) {
            if (r && r.message) {
                frappe.msgprint(__("Clinical Procedure For {0} created successfully", [frm.doc.patient]));
            }
        }   
    });
}