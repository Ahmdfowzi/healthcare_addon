// Copyright (c) 2024, Ahmed Ghazi and contributors
// For license information, please see license.txt

frappe.ui.form.on("MRI", {
    refresh(frm) {
      frm.add_custom_button(
        __("Get (MRI) Test"),
        function () {
          // Your code to handle the button click
          frappe.msgprint(__("Get (MRI) Test"));
        }
      );
    },
});
