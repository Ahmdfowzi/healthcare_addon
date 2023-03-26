/* A function that is called when the button is clicked. */
frappe.ui.form.on('Item Group', {
    generate_barcode: function (frm) {
        frm.set_value('barcode_label', (Math.floor(Math.random() * (10 ** 12 - 10 ** 11) + 10 ** 11)).toString())
            .then(() => {
                frm.refresh();
            })
    }
});