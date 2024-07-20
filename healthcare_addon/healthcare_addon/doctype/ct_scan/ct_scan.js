// Copyright (c) 2024, Ahmed Ghazi and contributors
// For license information, please see license.txt


frappe.ui.form.on("CT Scan", {
    refresh(frm) {
        if (frm.is_new()) {
            frm.add_custom_button(__("Get (CT Scan) Test"), function () {
                show_imaging_tests_dialog(frm, "CT Scan");
            });
        }
    },
});

function show_imaging_tests_dialog(frm, test_type) {
    // Create a new dialog
    let dialog = new frappe.ui.Dialog({
        title: __("Get " + test_type + " Tests"),
        fields: [
            {
                fieldname: "patient",
                label: __("Patient"),
                fieldtype: "Link",
                options: "Patient",
                reqd: 1,
                change: function () {
                    let patient = dialog.get_value("patient");
                    if (patient) {
                        // Fetch and display imaging tests when patient is selected
                        fetch_imaging_tests(patient, dialog, test_type);
                    }
                },
            },
            {
                fieldname: "imaging_tests_container",
                label: __("Imaging Tests"),
                fieldtype: "HTML",
            },
        ],
        size: "large",
        primary_action_label: __("Add Selected Test"),
        primary_action: function () {
            // Handle the primary action (e.g., add selected test)
            add_selected_test_to_doc(dialog, frm, test_type);
            dialog.hide();
        },
    });

    dialog.show();
}

function fetch_imaging_tests(patient, dialog, test_type) {
    frappe.call({
        method: "healthcare_addon.utils.utils.get_imaging_tests_by_type",
        args: {
            patient: patient,
            test_type: test_type,
        },
        callback: function (r) {
            if (r.message) {
                console.log(r.message);
                let imaging_tests_html = r.message
                    .map(
                        (test) => `
                    <div class="card imaging-test-card" data-imaging-scan-template="${test.imaging_scan_template
                            }" data-document-source="${test.parent_docname}" data-invoiced="${test.invoiced
                            }" data-healthcare-practitioner="${test.healthcare_practitioner}" data-parent-doctype="${test.parent_doctype}" data-parent-docname="${test.parent_docname}">
                        <div class="card-body">
                            <h5 class="card-title">${test.imaging_scan_template
                            }</h5>
                            <p class="card-text">${__(test.parent_doctype)}</p>
                            <p class="card-text">${test.parent_docname}</p>
                            <p class="card-text"><strong>${test.invoiced ? __("Invoiced") : __("Not Invoiced")
                            }</strong></p>
                        </div>
                    </div>
                `
                    )
                    .join("");

                dialog.fields_dict.imaging_tests_container.$wrapper.html(
                    imaging_tests_html
                );

                // Add click event to cards
                $(".imaging-test-card").click(function () {
                    $(".imaging-test-card").removeClass("selected");
                    $(this).addClass("selected");
                });
            }
        },
    });
}

function add_selected_test_to_doc(dialog, frm, test_type) {
    let selected_card = $(".imaging-test-card.selected");
    if (selected_card.length > 0) {
        let patient = dialog.get_value("patient");
        let imaging_scan_template = selected_card.data("imaging-scan-template");
        let healthcare_practitioner = selected_card.data("healthcare-practitioner");
        let parent_doctype = selected_card.data("parent-doctype");
        let parent_docname = selected_card.data("parent-docname");

        // Set fields in the X-ray document
        frm.set_value("patient", patient);
        frm.set_value("imaging_scan_template", imaging_scan_template);
        frm.set_value("imaging_date", frappe.datetime.now_date());
        frm.set_value("referring_doctor", healthcare_practitioner);
        frm.set_value("source_document_type", parent_doctype);
        frm.set_value("source_document", parent_docname);

        frm.refresh_field("patient");
        frm.refresh_field("imaging_scan_template");
        frm.refresh_field("imaging_date");
        frm.refresh_field("referring_doctor");
        frm.refresh_field("source_document_type");
        frm.refresh_field("source_document");
    } else {
        frappe.msgprint(__("Please select a test."));
    }
}
