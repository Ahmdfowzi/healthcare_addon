frappe.ui.form.on('Blood Request', {
    refresh(frm) {
        frm.fields_dict['collection_bag'].grid.get_field('blood_collection_bag').get_query = function(doc, cdt, cdn) {
            return {
                filters: [
                    [ 'consumed', '=', 0],
                    [ 'returned', '=', 0]
                ]
            };
        };
    }
});
