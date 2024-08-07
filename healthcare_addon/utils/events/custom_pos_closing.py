import frappe
from frappe import _
from erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry import POSClosingEntry


class CustomPOSClosingEntry(POSClosingEntry):
    def validate(self):
        super().validate()
        self.update_payment_reconciliation()

    def on_submit(self):
        super().on_submit()
        self.update_payment_reconciliation()

    def update_payment_reconciliation(self):
        custom_expenses = {}

        # Calculate total custom expenses per mode of payment
        for expense in self.custom_expenses_reconciliation:
            mode_of_payment = expense.mode_of_payment
            amount = frappe.utils.flt(expense.amount)

            if not mode_of_payment:
                frappe.throw(_("Mode of Payment is required for all custom expenses."))

            if amount < 0:
                frappe.throw(
                    _(
                        "Invalid amount for custom expense: {0}. Amount must be a non-negative number."
                    ).format(amount)
                )

            custom_expenses[mode_of_payment] = (
                custom_expenses.get(mode_of_payment, 0) + amount
            )

        # Adjust payment reconciliation
        for payment in self.payment_reconciliation:
            mode_of_payment = payment.mode_of_payment

            if not mode_of_payment:
                frappe.throw(
                    _("Mode of Payment is required for all payment reconciliations.")
                )

            if mode_of_payment in custom_expenses:
                # Store original values if not already stored
                if not hasattr(payment, "original_expected_amount"):
                    payment.original_expected_amount = payment.expected_amount
                if not hasattr(payment, "original_closing_amount"):
                    payment.original_closing_amount = payment.closing_amount

                # Calculate new values
                payment.expected_amount = (
                    frappe.utils.flt(payment.original_expected_amount)
                    - custom_expenses[mode_of_payment]
                )
                payment.closing_amount = (
                    frappe.utils.flt(payment.original_closing_amount)
                    - custom_expenses[mode_of_payment]
                )

                # Ensure amounts don't go negative
                payment.expected_amount = max(0, payment.expected_amount)
                payment.closing_amount = max(0, payment.closing_amount)

                # Recalculate difference
                payment.difference = payment.closing_amount - payment.expected_amount

        # Update total expected amount and net total
        self.grand_total = sum(
            frappe.utils.flt(payment.expected_amount)
            for payment in self.payment_reconciliation
        )
        self.net_total = sum(
            frappe.utils.flt(payment.closing_amount)
            for payment in self.payment_reconciliation
        )

        # Ensure totals are non-negative
        self.grand_total = max(0, self.grand_total)
        self.net_total = max(0, self.net_total)
