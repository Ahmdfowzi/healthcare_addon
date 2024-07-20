/* A function that is called when the button is clicked. */
frappe.ui.form.on('Item Group', {
    generate_barcode: function (frm) {
        const min = 10 ** 11;
        const max = 10 ** 12 - 1;
        const barcode = Math.floor(Math.random() * (max - min + 1) + min).toString();

        frm.set_value('barcode_label', barcode).then(() => {
            frm.refresh();
        });
    }
});
