from frappe import _
from healthcare_addon.utils.utils import create_commission_je, cancel_references_table_docs, calculate_practitioner_contribution, update_message


def before_save(doc, method):
    """
    > It calculates the practitioner contribution for a given document, using the rate specified in the
    document
    
    :param doc: The document that is being saved
    :param method: The method that is being called
    """

    calculate_practitioner_contribution(doc, rate=doc.rate)


def on_submit(doc, method) -> None:
    """
    > If the practitioner has contributed to the patient's treatment, create a Journal Entry for the
    practitioner
    
    :param doc: The document that is being submitted
    :param method: The method is the type of operation that is being performed on the document
    """

    # Creating a Journal Entry for the practitioner.
    if len(doc.healthcare_practitioner_contribution) > 0:
        create_commission_je(doc)


def on_cancel(doc, method) -> None:
    """
    It cancels the references table documents that are related to the current document
    """
    cancel_references_table_docs(doc)


def before_update_after_submit(doc, method) -> None:
    """
    > When a new `Practitioner` is created, calculate the practitioner's contribution based on the
    practitioner's rate
    
    :param doc: The document object that is being submitted
    :param method: The name of the method that is being called
    """
    calculate_practitioner_contribution(doc, rate=doc.rate)
    update_message(doc)



