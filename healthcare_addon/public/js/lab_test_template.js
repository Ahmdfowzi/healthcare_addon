/* A function that is called when the button is clicked. */
frappe.ui.form.on('Lab Test Template', {
    generate_barcode: function (frm) {
        frm.set_value('test_barcode', (Math.floor(Math.random() * (10 ** 12 - 10 ** 11) + 10 ** 11)).toString())
            .then(() => {
                frm.refresh();
            })
    }
});