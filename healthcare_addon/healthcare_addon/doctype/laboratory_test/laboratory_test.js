let table;

frappe.ui.form.on('Laboratory Test', {
    refresh(frm) {
        if (frm.doc.__islocal) {
            frm.add_custom_button(__('Get from Healthcare services'), () => {
                showGetTestsDialog(frm);
            });
        }
  
        if (frm.doc.docstatus == 1 && !frm.doc.stock_entry_reference) {
            frm.add_custom_button(__('Create Stock Entry'), () => {
                frappe.model.open_mapped_doc({
                    method: 'healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.map_laboratory_test_to_stock_entry',
                    frm,
                });
            });
        }
        
    },
    patient(frm) {
        if (frm.doc.patient) {
            frappe.db.get_value('Patient', frm.doc.patient, 'dob', r => {
                let age = r && r.dob ? Math.floor((new Date() - new Date(r.dob)) / 31557600000) : 0;
                frm.set_value('patient_age', age);
            });
        }
    },
    before_submit(frm) {
        frm.set_value("submitted_date", frappe.datetime.now_datetime());
    },
});


const showGetTestsDialog = (frm) => {
    const labTestsDialog = new frappe.ui.Dialog({
        title: __('Lab Tests'),
        fields: [
            {
                label: __("Patient"),
                fieldtype: 'Link',
                fieldname: 'patient',
                options: 'Patient',
                reqd: 1
            },
            {
                fieldtype: 'Column Break',
                fieldname: 'patient_section_break'
            },
            {
                label: __("Healthcare Practitioner"),
                fieldtype: 'Link',
                fieldname: 'healthcare_practitioner',
                options: 'Healthcare Practitioner',
                reqd: 1
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'practitioner_section_break'
            },
            {
                label: __("Get Tests"),
                fieldtype: 'Button',
                fieldname: 'get_tests',
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'get_tests_section_break'
            },
            {
                fieldtype: 'HTML',
                fieldname: 'lab_test'
            }
        ],
        size: 'large', // small, large, extra-large 

        primary_action_label: 'Add Test',
        primary_action() {
            const values = getSelectedData(table);

            if (values.length === 0) {
                frappe.msgprint(__('Please select at least one laboratory test.'));
                return;
            }

            console.table(values);

            values.forEach(row => {
                frm.add_child('lab_tests', {
                    lab_test_code: row.lab_test,
                    lab_test_comment: row.labTestComment,
                    invoiced: row.invoiced,
                    custom_encounter: row.encounter,
                });
            });

            frm.set_value('patient', labTestsDialog.get_value('patient'));
            frm.refresh_field('lab_tests');
            frm.refresh_field('patient');
            labTestsDialog.hide();
        },
        secondary_action_label: 'Cancel',
        secondary_action() {
            labTestsDialog.hide();
        }
    });

    labTestsDialog.fields_dict.get_tests.$input.on('click', () => {
        if (labTestsDialog.get_value('healthcare_practitioner') && labTestsDialog.get_value('patient')) {

            getLabTestPrescribed(labTestsDialog, labTestsDialog.get_value('healthcare_practitioner'), labTestsDialog.get_value('patient'));
        } else {
            frappe.throw(__('Please Select Both Patient and Healthcare Practitioner'))
        }
    });

    labTestsDialog.show();
};

const getLabTestPrescribed = (d, healthcare_practitioner, patient) => {
    frappe.call({
        method: 'healthcare_addon.utils.utils.get_lab_test_prescribed',
        args: { patient, healthcare_practitioner },
        callback(r) {
            if (r.message) {
                renderLabTests(d, patient, r.message);
                console.table(r.message)
            } else {
                frappe.msgprint(__('Error retrieving lab tests.'));
            }
        },
        error(err) {
            frappe.msgprint(__('Error calling server method: {0}', [err.message]));
        }
    });
};

const renderLabTests = (d, patient_name, lab_test_list) => {
    const html_field = d.fields_dict.lab_test.$wrapper;
    html_field.empty();

    table = $('<table class="table table-bordered"></table>').appendTo(html_field);

    // Rendering the table
    const headerRow = $('<tr></tr>').appendTo(table);
    headerRow.append('<th><input type="checkbox" class="universal-checkbox"></th>');
    headerRow.append('<th>Lab Test</th>');
    headerRow.append('<th>Practitioner</th>');
    headerRow.append('<th>Date</th>');
    headerRow.append('<th>Source</th>');
    headerRow.append('<th>Invoiced</th>');
    headerRow.append('<th>Lab Test Comment</th>');

    $.each(lab_test_list, (_, labTest) => {
        const [name, labTestCode, encounter, invoiced, labTestComment, practitioner, date] = labTest;

        const row = $('<tr></tr>').appendTo(table);
        row.append(`<td><input type="checkbox" class="lab-test-checkbox" data-name="${name}" data-lab-test="${labTestCode}" data-encounter="${encounter}" data-practitioner="${practitioner}" data-invoiced="${invoiced}" data-lab-test-comment="${labTestComment}"></td>`);
        row.append(`<td>${labTestCode}</td>`);
        row.append(`<td>${practitioner}</td>`);
        row.append(`<td>${date}</td>`);
        row.append(`<td>${encounter}</td>`);
        row.append(`<td>${invoiced == 1 ? '✔️' : '❌'}</td>`);
        row.append(`<td>${labTestComment ? labTestComment : '__________'}</td>`);
    });




    table.find('.universal-checkbox').change(function () {
        const isChecked = $(this).prop('checked');
        table.find('.lab-test-checkbox').prop('checked', isChecked);
    });

    if (!lab_test_list.length) {
        const msg = __('No Lab Tests found for the Patient {0}', [patient_name.bold()]);
        html_field.append(`<div class="col-xs-12" style="padding-top:0px;">${msg}</div>`);
    }
};

// Updating the getSelectedData function
function getSelectedData(table) {
    const selectedData = [];
    table.find('.lab-test-checkbox:checked').each(function () {
        selectedData.push({
            name: $(this).data('name'),
            lab_test: $(this).data('lab-test'),
            encounter: $(this).data('encounter'),
            practitioner: $(this).data('practitioner'),
            invoiced: $(this).data('invoiced'),
            labTestComment: $(this).data('lab-test-comment')
        });
    });
    return selectedData;
}


function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}
