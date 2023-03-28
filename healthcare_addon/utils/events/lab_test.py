import frappe


def before_save(doc, method) -> None:
    """
    If the test template is of type "Grouped", then add the test name and barcode to the
    "group_barcode_table" table

    :param doc: The document object that is being saved
    :param method: The method name
    """
    if len(doc.group_barcode_table)>0:
        return
    test_template = frappe.get_doc('Lab Test Template', doc.template)
    if test_template.lab_test_template_type == 'Grouped':
        for test in test_template.lab_test_groups:
            if test.barcode:
                doc.append("group_barcode_table", {
                    "test_name": test.lab_test_template,
                    "barcode": test.barcode
                })
