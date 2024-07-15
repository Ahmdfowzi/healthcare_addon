frappe.ui.form.on('Blood Request', {
    refresh(frm) {
        frm.fields_dict['blood_request_execution'].grid.get_field('blood_collection_bag').get_query = function(doc, cdt, cdn) {
            return {
                filters: [
                    [ 'consumed', '=', 0]
                ]
            };
        };
    }
});
