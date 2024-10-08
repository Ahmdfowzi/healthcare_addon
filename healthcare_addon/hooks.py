from . import __version__ as app_version

app_name = "healthcare_addon"
app_title = "Healthcare Addon"
app_publisher = "Osama Muhammed Abd"
app_description = "an extention app for the healthcare module"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "osama@aoai.io"
app_license = "MIT"


# Fixtures
fixtures = [
    {
        "dt": "Letter Head",
        "filters": [
            [
                "name",
                "in",
                ["Base Header"],
            ],
        ],
    },
    {
        "dt": "Client Script",
        "filters": [
            [
                "name",
                "in",
                [
                    "Patient Duplicate Name Message",
                    "Healthcare Practitioner Duplicate Name Message",
                ],
            ],
        ],
    },
    {
        "dt": "Item Group",
        "filters": [
            [
                "name",
                "in",
                ["Imaging"],
            ],
        ],
    },
]
# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/healthcare_addon/css/app.css"
# app_include_js = "/assets/healthcare_addon/js/healthcare_addon.js"

# include js, css files in header of web template
app_include_js = ["/assets/healthcare_addon/js/prescription_popup.js"]

app_include_css = ["/assets/healthcare_addon/css/prescription_popup.css"]

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "healthcare_addon/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}


# include js in doctype views
doctype_js = {
    "Sales Invoice": "public/js/sales_invoice.js",
    "Lab Test Template": "public/js/lab_test_template.js",
    "Item Group": "public/js/item_group.js",
    "Patient Encounter": "public/js/patient_encounter.js",
    "Patient History Settings": "public/js/patient_list_edit.js",
    "Inpatient Record": "public/js/inpatient_record.js",
    "Clinical Procedure": "public/js/clinical_procedure.js",
    "POS Closing Entry": "public/js/pos_closing_entry.js",
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# "Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "healthcare_addon.install.before_install"
# after_install = "healthcare_addon.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "healthcare_addon.uninstall.before_uninstall"
# after_uninstall = "healthcare_addon.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "healthcare_addon.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# "Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# "Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# "Patient Encounter": "healthcare_addon.overrides.custom_patient_encounter.CustomPatientEncounter"
# }

override_doctype_class = {
    "POS Closing Entry": "healthcare_addon.utils.events.custom_pos_closing.CustomPOSClosingEntry"
}

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Inpatient Record": {
        "after_insert": "healthcare_addon.utils.events.inpatient_record.after_insert",
        "validate": "healthcare_addon.utils.establish.make_establish",
    },
    "Inpatient Medication Entry": {
        "on_submit": "healthcare_addon.utils.medication_entry.new_medication"
    },
    "Inpatient Medication Order": {
        "on_submit": "healthcare_addon.utils.events.inpatient_medication_order.on_submit",
    },
    # "POS Closing Entry": {
    #     "before_save": "healthcare_addon.utils.events.pos_closing_entry.adjust_payment_reconciliation",
    # },
    'Inpatient Record': {
    'before_save': 'healthcare_addon.utils.events.inpatient_record.before_save'
    }
}

# Scheduled Tasks
# ---------------

scheduler_events = {

# "all": [
# "healthcare_addon.tasks.all"
# ],
    "daily": [
        # "healthcare_addon.tasks.daily"
        "healthcare_addon.utils.create_draft_invoices_for_admitted_patients"
    ],
# "hourly": [
# "healthcare_addon.tasks.hourly"
# ],
# "weekly": [
# "healthcare_addon.tasks.weekly"
# ]
# "monthly": [
# "healthcare_addon.tasks.monthly"
# ]
}

# Testing
# -------

# before_tests = "healthcare_addon.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# "frappe.desk.doctype.event.event.get_events": "healthcare_addon.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# "Task": "healthcare_addon.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Request Events
# ----------------
# before_request = ["healthcare_addon.utils.before_request"]
# after_request = ["healthcare_addon.utils.after_request"]

# Job Events
# ----------
# before_job = ["healthcare_addon.utils.before_job"]
# after_job = ["healthcare_addon.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
#     {
#         "doctype": "{doctype_1}",
#         "filter_by": "{filter_by}",
#         "redact_fields": ["{field_1}", "{field_2}"],
#         "partial": 1,
#     },
#     {
#         "doctype": "{doctype_2}",
#         "filter_by": "{filter_by}",
#         "partial": 1,
#     },
#     {
#         "doctype": "{doctype_3}",
#         "strict": False,
#     },
#     {"doctype": "{doctype_4}"},
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# "healthcare_addon.auth.validate"
# ]
