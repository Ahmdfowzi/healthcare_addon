frappe.ui.form.on('Inpatient Record', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Laboratory Test'), function () {
                showLabTestDialog(frm);
            }, __('Create'));

            frm.add_custom_button(__('Medication'), function () {
                frappe.prompt({
                    label: 'Medications',
                    fieldname: 'medications',
                    fieldtype: 'Small Text',
                }, (values) => {
                    console.log(values.date);
                })
            }, __('Create'));

            frm.add_custom_button(__('Clinical Procedure'), function () {
                frappe.prompt({
                    label: 'Clinical Procedure Template',
                    fieldname: 'procedure_template',
                    fieldtype: 'Link',
                    options: 'Clinical Procedure Template',
                }, (values) => {
                    console.log(values.date);
                })

            }, __('Create'));

            frm.add_custom_button(__('CT Scan'), function () {
                showImagingTestDialog(frm, "CT Scan");
            }, __('Create'));

            frm.add_custom_button(__('X-Ray'), function () {
                showImagingTestDialog(frm, "X-ray");
            }, __('Create'));

            frm.add_custom_button(__('MRI'), function () {
                showImagingTestDialog(frm, "MRI");
            }, __('Create'));
        }
    }
});

function createRelatedDoc(frm, doctype) {
    frappe.new_doc(doctype, {
        'inpatient_record': frm.doc.name,
        'patient': frm.doc.patient,
        'company': frm.doc.company,
        "healthcare_practitioner": frm.doc.practitioner
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
            }
        },
        action(selections) {
            if (selections.length === 0) {
                frappe.msgprint(__("Please select at least one lab test template."));
                return;
            }
            createLabTestInvoice(frm, selections);
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
            }
        },
        action(selections) {
            if (selections.length === 0) {
                frappe.msgprint(__("Please select at least one lab test template."));
                return;
            }
            createLabTestInvoice(frm, selections);
        }
    });
}


function createLabTestInvoice(frm, selections) {

    const { company } = frappe.db.get_single_value('Default Healthcare Service Settings', 'hospital_laboratory_entity')
    if (!company) {
        frappe.msgprint(__("Please set default Laboratory Entity in Healthcare Settings."))
        return
    }

    frappe.call({
        method: 'healthcare_addon.utils.utils.create_lab_test_invoice',
        args: {
            patient: frm.doc.patient,
            company: company,
            lab_test_templates: selections
        },
        callback: function (r) {
            if (r.message) {
                frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
            }
        }
    });
}