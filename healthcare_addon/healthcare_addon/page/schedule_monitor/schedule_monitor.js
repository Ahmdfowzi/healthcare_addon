frappe.pages['schedule-monitor'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Schedule Monitor',
		single_column: true
	});
}