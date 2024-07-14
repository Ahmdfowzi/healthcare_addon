frappe.ui.form.on("Newborn", {
    mother_name(frm) {
        calculate_and_set_age(frm);
    },
});

function calculate_and_set_age(frm) {
    if (frm.doc.mother_date_of_birth) {
        let dob = new Date(frm.doc.mother_date_of_birth);
        let today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        let month_diff = today.getMonth() - dob.getMonth();
        if (month_diff < 0 || (month_diff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        frm.set_value("age", age);
    }
}
