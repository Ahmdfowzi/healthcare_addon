frappe.pages['prondom'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Prondom',
		single_column: false
	});

	page.set_title('Rooms Management')
	page.set_title_sub('Monitor Rooms Status And Medication Orders')
	page.set_indicator('Live', 'green')
	this.page.set_primary_action(
		__('Print'),
		() => this.printit(), 'printer'
	);

	this.page.add_button(
		__('Full Page'),
		() => this.render_page('/printview?'),
		{ icon: 'full-page' }
	);

	this.page.add_button(
		__('PDF'),
		() => this.render_page('/api/method/frappe.utils.print_format.download_pdf?'),
		{ icon: 'small-file' }
	);

	this.page.add_button(
		__('Refresh'),
		() => this.refresh_print_format(),
		{ icon: 'refresh' }
	);

	this.page.add_action_icon("file", () => {
		this.go_to_form_view();
	}, '', __("Form"));

	page.side_bar
}