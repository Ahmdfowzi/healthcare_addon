frappe.provide("healthcare_addon.HealthcareCustomButtons");

class HealthcareCustomButtons {
  constructor(frm, practitioner_field_name = "healthcare_practitioner") {
    this.frm = frm;
    this.practitioner_field_name = practitioner_field_name;
    this.healthcare_reference_field = this.frm.fields_dict["healthcare_references"] 
      ? "healthcare_references" 
      : "custom_healthcare_references";
  }

  updateHealthcareReferences(doctype, response) {
    try {
      const referenceData = this.getReferenceData(doctype, response);
      this.addReferenceToForm(referenceData);
      this.frm.refresh_field(this.healthcare_reference_field);
      this.frm.save();
    } catch (error) {
      this.handleError(error, doctype);
    }
  }

  getReferenceData(doctype, response) {
    const isSpecialDoctype = ["Prescription", "Clinical Procedure", "Laboratory Test", "Clinical Note"].includes(doctype);
    const referenceLink = isSpecialDoctype ? response?.message?.name : response;

    if (!referenceLink) {
      throw new Error(`Invalid response for ${doctype}`);
    }

    return {
      medical_reference: doctype,
      reference_link: referenceLink,
      timestamp: frappe.datetime.now_datetime(),
    };
  }

  addReferenceToForm(referenceData) {
    this.frm.add_child(this.healthcare_reference_field, referenceData);
  }

  handleError(error, doctype) {
    console.error("Error in updateHealthcareReferences:", error);
    frappe.msgprint(
      __(`Error updating healthcare references for ${doctype}. Please check the console for details.`)
    );
  }

  addCustomButtons() {
    if (this.frm.is_new()) return;

    const createButtons = [
      { label: "Laboratory Test", action: () => this.showLabTestDialog() },
      { label: "Medication", action: () => this.showMedicationDialog() },
      { label: "Clinical Procedure", action: () => this.showClinicalProcedureDialog() },
      { label: "CT Scan", action: () => this.showImagingTestDialog("CT Scan") },
      { label: "X-Ray", action: () => this.showImagingTestDialog("X-ray") },
      { label: "MRI", action: () => this.showImagingTestDialog("MRI") },
      { label: "Clinical Note", action: () => frappe.new_doc("Clinical Note", { patient: this.frm.doc.patient }) },
    ];

    createButtons.forEach(({ label, action }) => {
      this.frm.add_custom_button(__(label), action, __("Create"));
    });
  }

  showMedicationDialog() {
    frappe.prompt(
      {
        label: "Medications",
        fieldname: "medications",
        fieldtype: "Small Text",
      },
      (values) => {
        frappe.call({
          method: "healthcare_addon.healthcare_addon.doctype.prescription.prescription.create_prescription_doc",
          args: {
            patient: this.frm.doc.patient,
            healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
            medications: values.medications,
          },
          callback: (r) => this.updateHealthcareReferences("Prescription", r),
        });
      }
    );
  }

  async showClinicalProcedureDialog() {
    const promptOptions = {
      label: "Clinical Procedure Template",
      fieldname: "procedure_template",
      fieldtype: "Link",
      options: "Clinical Procedure Template",
    };

    const commonArgs = {
      patient: this.frm.doc.patient,
      company: this.frm.doc.company,
      healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
    };

    frappe.prompt(promptOptions, async (values) => {
      try {
        const invoiceResult = await this.createInvoice(values.procedure_template, commonArgs);
        this.handleSuccess(invoiceResult);

        const procedureResult = await this.createClinicalProcedure(values.procedure_template, commonArgs);
        this.updateHealthcareReferences("Clinical Procedure", procedureResult);
      } catch (error) {
        this.handleError(error, "Clinical Procedure");
      }
    });
  }

  createInvoice(template, commonArgs) {
    return frappe.call({
      method: "healthcare_addon.utils.utils.create_clinical_procedure_invoice",
      args: { ...commonArgs, clinical_procedure_template: template },
    });
  }

  createClinicalProcedure(template, commonArgs) {
    return frappe.call({
      method: "healthcare_addon.utils.utils.create_clinical_procedure_doc",
      args: { ...commonArgs, clinical_procedure_template: template },
    });
  }

  handleSuccess(result) {
    if (result.message) {
      frappe.msgprint(__(`Invoice ${result.message} created successfully`));
    }
  }

  showLabTestDialog() {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "Lab Test Template",
      target: this.frm,
      setters: {},
      date_field: "modified",
      get_query: () => ({ filters: { disabled: 0 } }),
      page_length: 9999,
      action: (selections) => {
        if (selections.length === 0) {
          frappe.msgprint(__("Please select at least one lab test template."));
          return;
        }
        this.createLabTestInvoice(selections);
        this.createLabTestDoc(selections);
      },
    });
  }

  addLabTestToDoc(selections) {
    selections.forEach((selection) => {
      this.frm.add_child("lab_test_prescription", { lab_test_code: selection });
    });
    this.frm.refresh_field("lab_test_prescription");
    this.frm.save();
  }

  async createLabTestDoc(lab_test_templates) {
    try {
      const company = await frappe.db.get_single_value(
        "Default Healthcare Service Settings",
        "hospital_laboratory_entity"
      );

      if (!company) {
        throw new Error("Please set default Laboratory Entity in Healthcare Settings.");
      }

      const response = await frappe.call({
        method: "healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.create_lab_test_from_inpatient_record",
        args: {
          patient: this.frm.doc.patient,
          healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
          lab_test_templates: lab_test_templates,
          company: company,
        },
      });

      this.updateHealthcareReferences("Laboratory Test", response);
    } catch (error) {
      this.handleError(error, "Laboratory Test");
    }
  }

  showImagingTestDialog(scan_type) {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "Imaging Scan Template",
      target: this.frm,
      setters: { is_billable: 1 },
      date_field: "modified",
      get_query: () => ({ filters: { scan_type: scan_type } }),
      action: (selections) => {
        if (selections.length === 0) {
          frappe.msgprint(__("Please select at least one imaging scan template."));
          return;
        }
        this.createImagingTestInvoice(selections);
        this.createImagingScanDoc(selections);
        this.addImagingScanToDoc(scan_type, selections);
      },
    });
  }

  addImagingScanToDoc(scan_type, selections) {
    selections.forEach((selection) => {
      this.frm.add_child("custom_imaging_prescription", {
        scan_type: scan_type,
        imaging_scan_template: selection,
      });
    });
    this.frm.refresh_field("custom_imaging_prescription");
    this.frm.save();
  }

  async createLabTestInvoice(selections) {
    try {
      const company = await frappe.db.get_single_value(
        "Default Healthcare Service Settings",
        "hospital_laboratory_entity"
      );

      if (!company) {
        throw new Error("Please set default Laboratory Entity in Healthcare Settings.");
      }

      const response = await frappe.call({
        method: "healthcare_addon.utils.utils.create_lab_test_invoice",
        args: {
          patient: this.frm.doc.patient,
          company: company,
          lab_test_templates: selections,
          healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
        },
      });

      if (response.message) {
        frappe.msgprint(__("Invoice {0} created successfully", [response.message]));
      }
    } catch (error) {
      this.handleError(error, "Lab Test Invoice");
    }
  }

  async createImagingTestInvoice(selections) {
    try {
      const response = await frappe.call({
        method: "healthcare_addon.utils.utils.create_imaging_test_invoice",
        args: {
          patient: this.frm.doc.patient,
          company: this.frm.doc.company,
          image_test_templates: JSON.stringify(selections),
          healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
        },
      });

      if (response.message) {
        frappe.msgprint(__("Invoice {0} created successfully", [response.message]));
      }
    } catch (error) {
      this.handleError(error, "Imaging Test Invoice");
    }
  }

  async createImagingScanDoc(image_test_templates) {
    try {
      const response = await frappe.call({
        method: "healthcare_addon.utils.utils.create_imaging_test_from_inpatient_record",
        args: {
          patient: this.frm.doc.patient,
          healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
          imaging_scan_templates: image_test_templates,
        },
      });

      response.message.forEach((message) => {
        if (message && message.scan_type && message.imaging_test) {
          this.updateHealthcareReferences(message.scan_type, message.imaging_test);
        }
      });
    } catch (error) {
      this.handleError(error, "Imaging Scan");
    }
  }
}

frappe.provide("healthcare_addon.HealthcareCustomButtons");
healthcare_addon.HealthcareCustomButtons = HealthcareCustomButtons;

function setup_clinical_note_fetch(doctype_name) {
  frappe.ui.form.on(doctype_name, {
      onload: function(frm) {
          if (frm.doc.patient) fetch_clinical_notes(frm);
      },
      refresh: function(frm) {
          if (frm.doc.patient) fetch_clinical_notes(frm);
      },
      patient: function(frm) {
          if (frm.doc.patient) fetch_clinical_notes(frm);
      }
  });
}

function fetch_clinical_notes(frm) {
  if (!frm.doc.patient) return;

  frappe.call({
      method: 'frappe.client.get_list',
      args: {
          doctype: 'Clinical Note',
          filters: { 'patient': frm.doc.patient },
          fields: ['name', 'note', 'posting_date'],
          order_by: 'posting_date desc',
          limit_page_length: 15
      },
      callback: function(r) {
          if (r.message) {
              // frm.clear_table('clinical_note_table');
              r.message.forEach(d => {
                  let row = frm.add_child('clinical_note_table');
                  row.clinical_note_reference = d.name;
                  row.clinical_note = d.note;
                  row.posting_date = d.posting_date;
              });
              frm.refresh_field('clinical_note_table');
          }
      }
  });
}

// Call this function for each doctype
setup_clinical_note_fetch('Inpatient Record');
setup_clinical_note_fetch('Premature');
