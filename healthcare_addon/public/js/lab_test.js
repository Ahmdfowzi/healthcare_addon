
// Function to generate a barcode SVG and set it as the value of the "barcode_image" field
function generateBarcode(barcode_value) {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("height", "88px");
    svg.setAttribute("width", "100%");
    svg.setAttribute("viewBox", "0 0 323 88");

    let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "323");
    rect.setAttribute("height", "88");
    rect.setAttribute("style", "fill:#ffffff;");
    svg.appendChild(rect);

    let barcode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    barcode.setAttribute("transform", "translate(10, 10)");
    barcode.setAttribute("style", "fill:#000000;");
    svg.appendChild(barcode);

    JsBarcode(barcode, barcode_value, {
        width: 2,
        height: 50,
        fontSize: 16,
        displayValue: false
    });

    let svg_string = new XMLSerializer().serializeToString(svg);
    let svg_data_uri = "data:image/svg+xml;base64," + btoa(svg_string);

    frm.set_df_property("barcode_image", "options", svg_data_uri);
    frm.refresh();
}

// Attach the generateBarcode function to the "before_save" event of the Lab Test form
frappe.ui.form.on('Lab Test', {
    before_save: function (frm) {
        if (!frm.doc.barcode_label) {
            let barcode_value = `${Math.floor(Math.random() * (10 ** 12 - 10 ** 11) + 10 ** 11)}`;
            frm.set_value("barcode_label", barcode_value).then(() => {
                generateBarcode(barcode_value);
            });
        }
    }
});

