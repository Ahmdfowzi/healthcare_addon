frappe.ui.form.on('Blood Request', {
    refresh(frm) {
        frm.fields_dict['collection_bag'].grid.get_field('blood_collection_bag').get_query = function (doc, cdt, cdn) {
            return {
                filters: [
                    ['consumed', '=', 0],
                ]
            };
        };
    }
});

let table;

frappe.ui.form.on('Blood Request', {
    refresh: function (frm) {
        frm.add_custom_button(__('Return Collection Bags'), function () {
            showReturnBagsDialog(frm);
        });
    }
});

const showReturnBagsDialog = (frm) => {
    const returnBagsDialog = new frappe.ui.Dialog({
        title: __('Return Collection Bags'),
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'collection_bags_html'
            }
        ],
        size: 'large', // small, large, extra-large 
        primary_action_label: 'Return Selected Bags',
        primary_action() {
            const selectedBags = getSelectedBags(table);

            if (selectedBags.length === 0) {
                frappe.msgprint(__('Please select at least one bag to return.'));
                return;
            }

            frappe.call({
                method: 'healthcare_addon.healthcare_addon.doctype.blood_request.blood_request.return_collection_bags',
                args: {
                    bag_names: selectedBags
                },
                callback: function (response) {
                    frappe.msgprint(response.message);
                    frm.reload_doc();
                    returnBagsDialog.hide();
                },
                error: function (error) {
                    console.error(error);
                    frappe.msgprint(__('An error occurred while processing the bags.'));
                }
            });
        },
        secondary_action_label: 'Cancel',
        secondary_action() {
            returnBagsDialog.hide();
        }
    });

    renderCollectionBagsTable(returnBagsDialog, frm.doc.collection_bag || []);
    returnBagsDialog.show();
};

const renderCollectionBagsTable = (dialog, collection_bags) => {
    const html_field = dialog.fields_dict.collection_bags_html.$wrapper;
    html_field.empty();

    table = $('<table class="table table-bordered"></table>').appendTo(html_field);

    // Rendering the table
    const headerRow = $('<tr></tr>').appendTo(table);
    headerRow.append('<th><input type="checkbox" class="universal-checkbox"></th>');
    headerRow.append('<th>Blood Collection Bag</th>');

    collection_bags.forEach(bag => {
        const row = $('<tr></tr>').appendTo(table);
        row.append(`<td><input type="checkbox" class="bag-checkbox" data-bag="${bag.blood_collection_bag}"></td>`);
        row.append(`<td>${bag.blood_collection_bag}</td>`);
    });

    table.find('.universal-checkbox').change(function () {
        const isChecked = $(this).prop('checked');
        table.find('.bag-checkbox').prop('checked', isChecked);
    });

    if (!collection_bags.length) {
        const msg = __('No Collection Bags found.');
        html_field.append(`<div class="col-xs-12" style="padding-top:0px;">${msg}</div>`);
    }
};

function getSelectedBags(table) {
    const selectedBags = [];
    table.find('.bag-checkbox:checked').each(function () {
        selectedBags.push($(this).data('bag'));
    });
    return selectedBags;
}
