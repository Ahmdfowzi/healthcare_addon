frappe.ui.form.on("Sales Invoice", {
  refresh(frm) {
    // Add a custom button called "Imaging"
    frm.add_custom_button(
      __("Imaging"),
      function () {
        // Show the dialog when the button is clicked
        show_imaging_dialog(frm);
      },
      __("Get Items From")
    );
  },
});

function show_imaging_dialog(frm) {
  // Create a new dialog
  let dialog = new frappe.ui.Dialog({
    title: __("Get Imaging Tests"),
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
            fetch_imaging_tests(patient, dialog);
          }
        },
      },
      {
        fieldname: "imaging_tests",
        label: __("Imaging Tests"),
        fieldtype: "Table",
        fields: [
          {
            fieldname: "scan_type",
            label: __("Scan Type"),
            fieldtype: "Select",
            options: ["MRI", "X-ray", "CT Scan"],
            in_list_view: 1,
          },
          {
            fieldname: "imaging_scan_template",
            label: __("Imaging Scan Template"),
            fieldtype: "Link",
            options: "Imaging Scan Template",
            in_list_view: 1,
          },
          {
            fieldname: "document_source",
            label: __("Document Source"),
            fieldtype: "Data",
            in_list_view: 1,
          },
        ],
      },
    ],
    size: "large", // small, large, extra-large
    primary_action_label: __("Add to Invoice"),
    primary_action: function () {
      // Handle the primary action (e.g., add selected tests to the invoice)
      add_imaging_tests_to_invoice(dialog, frm);
      dialog.hide();
    },
  });

  dialog.show();
}

function fetch_imaging_tests(patient, dialog) {
  frappe.call({
    method: "healthcare_addon.utils.utils.get_imaging_tests",
    args: {
      patient: patient,
    },
    callback: function (r) {
      if (r.message) {
        let imaging_tests = r.message.map((test) => ({
          scan_type: test.scan_type,
          imaging_scan_template: test.imaging_scan_template,
          document_source: test.parent,
        }));
        dialog.fields_dict.imaging_tests.df.data = imaging_tests;
        dialog.fields_dict.imaging_tests.refresh();
      }
    },
  });
}

function add_imaging_tests_to_invoice(dialog, frm) {
  let imaging_tests = dialog.get_values().imaging_tests;
  imaging_tests.forEach((test) => {
    if (test.imaging_scan_template) {
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Imaging Scan Template",
          name: test.imaging_scan_template,
        },
        callback: function (r) {
          if (r.message) {
            let template = r.message;
            let item = frm.add_child("items");
            item.item_code = template.item_code;
            item.item_name = template.scan_template_name;
            item.rate = template.rate;
            item.qty = 1; // Assuming quantity is 1 for each test
            item.description = `${template.scan_template_name} (${test.scan_type})`;
            frm.refresh_field("items");
          }
        },
      });
    }
  });
}

// Update the respective imaging tests after submitting the Sales Invoice
frappe.ui.form.on("Sales Invoice", {
  on_submit(frm) {
    let items = frm.doc.items;
    items.forEach((item) => {
      frappe.call({
        method: "healthcare_addon.utils.utils.mark_imaging_tests_invoiced",
        args: {
          imaging_scan_template: item.item_code,
        },
        callback: function (r) {
          if (r.message) {
            frappe.msgprint(__("Imaging Tests Marked As Invoiced"));
          }
        },
      });
    });
  },
});
