frappe.provide("healthcare_addon.HealthcareCustomButtons");

class HealthcareCustomButtons {
  constructor(frm, practitioner_field_name = "healthcare_practitioner") {
    this.frm = frm;
    this.practitioner_field_name = practitioner_field_name;
  }

  updateHealthcareReferences(doctype, response) {
    let field_name = null;
    if (!this.frm.fields_dict["healthcare_references"]) {
      field_name = "custom_healthcare_references";
    } else {
      field_name = "healthcare_references";
    }
    try {
      if (
        doctype === "Prescription" ||
        doctype === "Clinical Procedure" ||
        doctype === "Laboratory Test"
      ) {
        if (response && response.message && response.message.name) {
          this.frm.add_child(field_name, {
            medical_reference: doctype,
            reference_link: response.message.name,
            timestamp: frappe.datetime.now_datetime(),
          });
        } else {
          throw new Error(`Invalid response structure for ${doctype}`);
        }
      } else {
        if (response) {
          this.frm.add_child(field_name, {
            medical_reference: doctype,
            reference_link: response,
            timestamp: frappe.datetime.now_datetime(),
          });
        } else {
          throw new Error(`Invalid response for ${doctype}`);
        }
      }

      this.frm.refresh_field(field_name);
      this.frm.save();
    } catch (error) {
      console.error("Error in updateHealthcareReferences:", error);
      frappe.msgprint(
        __(
          `Error updating healthcare references for ${doctype}. Please check the console for details.`
        )
      );
    }
  }

  addCustomButtons() {
    if (!this.frm.is_new()) {
      const createButtons = [
        { label: "Laboratory Test", action: () => this.showLabTestDialog() },
        { label: "Medication", action: () => this.showMedicationDialog() },
        {
          label: "Clinical Procedure",
          action: () => this.showClinicalProcedureDialog(),
        },
        {
          label: "CT Scan",
          action: () => this.showImagingTestDialog("CT Scan"),
        },
        { label: "X-Ray", action: () => this.showImagingTestDialog("X-ray") },
        { label: "MRI", action: () => this.showImagingTestDialog("MRI") },
      ];

      createButtons.forEach((button) => {
        this.frm.add_custom_button(
          __(button.label),
          button.action,
          __("Create")
        );
      });
    }
  }

  showMedicationDialog() {
    frappe.prompt(
      {
        label: "Medications",
        field_name: "medications",
        fieldtype: "Small Text",
      },
      (values) => {
        frappe.call({
          method:
            "healthcare_addon.healthcare_addon.doctype.prescription.prescription.create_prescription_doc",
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

  showClinicalProcedureDialog() {
    frappe.prompt(
      {
        label: "Clinical Procedure Template",
        field_name: "procedure_template",
        fieldtype: "Link",
        options: "Clinical Procedure Template",
      },
      (values) => {
        try {
          frappe.call({
            method:
              "healthcare_addon.utils.utils.create_clinical_procedure_invoice",
            args: {
              patient: this.frm.doc.patient,
              company: this.frm.doc.company,
              clinical_procedure_template: values.procedure_template,
              healthcare_practitioner:
                this.frm.doc[this.practitioner_field_name],
            },
            callback: function (r) {
              if (r.message) {
                frappe.msgprint(
                  __(`Invoice ${r.message} created successfully`)
                );
              }
            },
          });

          frappe.call({
            method:
              "healthcare_addon.utils.utils.create_clinical_procedure_doc",
            args: {
              patient: this.frm.doc.patient,
              company: this.frm.doc.company,
              healthcare_practitioner:
                this.frm.doc[this.practitioner_field_name],
              clinical_procedure_template: values.procedure_template,
            },
            callback: (r) =>
              this.updateHealthcareReferences("Clinical Procedure", r),
          });
        } catch (error) {
          console.log(error);
        }
      }
    );
  }

  showLabTestDialog() {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "Lab Test Template",
      target: this.cur_frm,
      setters: {},
      date_field: "modified",
      get_query() {
        return {
          filters: { disabled: 0 },
        };
      },
      page_length: 9999, // Change this value to the number of items you want
      child_page_length: 9999, // For child items if needed

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
      this.frm.add_child("lab_test_prescription", {
        lab_test_code: selection,
      });
      this.frm.refresh_field("lab_test_prescription");
      this.frm.save();
    });
  }

  createLabTestDoc(lab_test_templates) {
    frappe.call({
      method:
        "healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.create_lab_test_from_inpatient_record",
      args: {
        patient: this.frm.doc.patient,
        healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
        lab_test_templates: lab_test_templates,
      },
      callback: (r) => this.updateHealthcareReferences("Laboratory Test", r),
    });
  }

  showImagingTestDialog(scan_type) {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "Imaging Scan Template",
      target: this.frm,
      setters: {
        is_billable: 1,
      },
      date_field: "modified",
      get_query() {
        return {
          filters: { scan_type: scan_type },
        };
      },
      action: (selections) => {
        if (selections.length === 0) {
          frappe.msgprint(
            __("Please select at least one imaging scan template.")
          );
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
      this.frm.refresh_field("custom_imaging_prescription");
      this.frm.save();
    });
  }

  createLabTestInvoice(selections) {
    frappe.db
      .get_single_value(
        "Default Healthcare Service Settings",
        "hospital_laboratory_entity"
      )
      .then((company) => {
        if (!company) {
          frappe.msgprint(
            __("Please set default Laboratory Entity in Healthcare Settings.")
          );
          return;
        }

        frappe.call({
          method: "healthcare_addon.utils.utils.create_lab_test_invoice",
          args: {
            patient: this.frm.doc.patient,
            company: company,
            lab_test_templates: selections,
            healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
          },
          callback: function (r) {
            if (r.message) {
              frappe.msgprint(
                __("Invoice {0} created successfully", [r.message])
              );
            }
          },
        });
      });
  }

  createImagingTestInvoice(selections) {
    frappe.call({
      method: "healthcare_addon.utils.utils.create_imaging_test_invoice",
      args: {
        patient: this.frm.doc.patient,
        company: this.frm.doc.company,
        image_test_templates: JSON.stringify(selections),
        healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
      },
      callback: function (r) {
        if (r.message) {
          frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
        }
      },
    });
  }

  createImagingScanDoc(image_test_templates) {
    frappe.call({
      method:
        "healthcare_addon.utils.utils.create_imaging_test_from_inpatient_record",
      args: {
        patient: this.frm.doc.patient,
        healthcare_practitioner: this.frm.doc[this.practitioner_field_name],
        imaging_scan_templates: image_test_templates,
      },
      callback: (r) => {
        // Changed to arrow function to preserve 'this' context
        r.message.forEach((message) => {
          if (message && message.scan_type && message.imaging_test) {
            console.log(message.scan_type, message.imaging_test);
            this.updateHealthcareReferences(
              message.scan_type,
              message.imaging_test
            );
          }
        });
      },
    });
  }
}

// At the end of the file, replace the existing export with:
frappe.provide("healthcare_addon.HealthcareCustomButtons");
healthcare_addon.HealthcareCustomButtons = HealthcareCustomButtons;

// frappe.provide("healthcare_addon.HealthcareCustomButtons");

// class HealthcareCustomButtons {
//   constructor(frm, practitionerFieldName = "healthcare_practitioner") {
//     this.frm = frm;
//     this.practitionerFieldName = practitionerFieldName;
//     this.healthcareReferencesField = this.frm.fields_dict[
//       "healthcare_references"
//     ]
//       ? "healthcare_references"
//       : "custom_healthcare_references";
//   }

//   updateHealthcareReferences(doctype, response) {
//     try {
//       const referenceLink = this.getReferenceLink(doctype, response);
//       if (referenceLink) {
//         this.addHealthcareReference(doctype, referenceLink);
//       } else {
//         throw new Error(`Invalid response for ${doctype}`);
//       }
//     } catch (error) {
//       this.handleError(error, doctype);
//     }
//   }

//   getReferenceLink(doctype, response) {
//     if (
//       ["Prescription", "Clinical Procedure", "Laboratory Test"].includes(
//         doctype
//       )
//     ) {
//       return response?.message?.name;
//     }
//     return response;
//   }

//   addHealthcareReference(doctype, referenceLink) {
//     this.frm.add_child(this.healthcareReferencesField, {
//       medical_reference: doctype,
//       reference_link: referenceLink,
//       timestamp: frappe.datetime.now_datetime(),
//     });
//     this.frm.refresh_field(this.healthcareReferencesField);
//     this.frm.save();
//   }

//   handleError(error, doctype) {
//     console.error("Error in updateHealthcareReferences:", error);
//     frappe.msgprint(
//       __(
//         `Error updating healthcare references for ${doctype}. Please check the console for details.`
//       )
//     );
//   }

//   addCustomButtons() {
//     if (this.frm.is_new()) return;

//     const createButtons = [
//       { label: "Laboratory Test", action: () => this.showLabTestDialog() },
//       { label: "Medication", action: () => this.showMedicationDialog() },
//       {
//         label: "Clinical Procedure",
//         action: () => this.showClinicalProcedureDialog(),
//       },
//       { label: "CT Scan", action: () => this.showImagingTestDialog("CT Scan") },
//       { label: "X-Ray", action: () => this.showImagingTestDialog("X-ray") },
//       { label: "MRI", action: () => this.showImagingTestDialog("MRI") },
//     ];

//     createButtons.forEach(({ label, action }) => {
//       this.frm.add_custom_button(__(label), action, __("Create"));
//     });
//   }

//   showMedicationDialog() {
//     frappe.prompt(
//       {
//         label: "Medications",
//         field_name: "medications",
//         fieldtype: "Small Text",
//       },
//       (values) => {
//         frappe.call({
//           method:
//             "healthcare_addon.healthcare_addon.doctype.prescription.prescription.create_prescription_doc",
//           args: {
//             patient: this.frm.doc.patient,
//             healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//             medications: values.medications,
//           },
//           callback: (r) => this.updateHealthcareReferences("Prescription", r),
//         });
//       }
//     );
//   }

//   showClinicalProcedureDialog() {
//     frappe.prompt(
//       {
//         label: "Clinical Procedure Template",
//         field_name: "procedure_template",
//         fieldtype: "Link",
//         options: "Clinical Procedure Template",
//       },
//       (values) => {
//         this.createClinicalProcedureInvoice(values.procedure_template);
//         this.createClinicalProcedureDoc(values.procedure_template);
//       }
//     );
//   }

//   createClinicalProcedureInvoice(procedureTemplate) {
//     frappe.call({
//       method: "healthcare_addon.utils.utils.create_clinical_procedure_invoice",
//       args: {
//         patient: this.frm.doc.patient,
//         company: this.frm.doc.company,
//         clinical_procedure_template: procedureTemplate,
//         healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//       },
//       callback: (r) => {
//         if (r.message) {
//           frappe.msgprint(__(`Invoice ${r.message} created successfully`));
//         }
//       },
//     });
//   }

//   createClinicalProcedureDoc(procedureTemplate) {
//     frappe.call({
//       method: "healthcare_addon.utils.utils.create_clinical_procedure_doc",
//       args: {
//         patient: this.frm.doc.patient,
//         company: this.frm.doc.company,
//         healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//         clinical_procedure_template: procedureTemplate,
//       },
//       callback: (r) => this.updateHealthcareReferences("Clinical Procedure", r),
//     });
//   }

//   showLabTestDialog() {
//     new frappe.ui.form.MultiSelectDialog({
//       doctype: "Lab Test Template",
//       target: this.frm,
//       setters: {
//         department: null,
//         is_billable: 1,
//       },
//       date_field: "modified",
//       get_query: () => ({ filters: { disabled: 0 } }),
//       action: (selections) => {
//         if (selections.length === 0) {
//           frappe.msgprint(__("Please select at least one lab test template."));
//           return;
//         }
//         this.createLabTestInvoice(selections);
//         this.createLabTestDoc(selections);
//         this.addLabTestToDoc(selections);
//       },
//     });
//   }

//   addLabTestToDoc(selections) {
//     selections.forEach((selection) => {
//       this.frm.add_child("lab_test_prescription", { lab_test_code: selection });
//     });
//     this.frm.refresh_field("lab_test_prescription");
//     this.frm.save();
//   }

//   createLabTestDoc(labTestTemplates) {
//     frappe.call({
//       method:
//         "healthcare_addon.healthcare_addon.doctype.laboratory_test.laboratory_test.create_lab_test_from_inpatient_record",
//       args: {
//         patient: this.frm.doc.patient,
//         healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//         lab_test_templates: labTestTemplates,
//       },
//       callback: (r) => this.updateHealthcareReferences("Laboratory Test", r),
//     });
//   }

//   createLabTestInvoice(selections) {
//     frappe.db
//       .get_single_value(
//         "Default Healthcare Service Settings",
//         "hospital_laboratory_entity"
//       )
//       .then((company) => {
//         if (!company) {
//           frappe.msgprint(
//             __("Please set default Laboratory Entity in Healthcare Settings.")
//           );
//           return;
//         }
//         frappe.call({
//           method: "healthcare_addon.utils.utils.create_lab_test_invoice",
//           args: {
//             patient: this.frm.doc.patient,
//             company: company,
//             lab_test_templates: selections,
//             healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//           },
//           callback: (r) => {
//             if (r.message) {
//               frappe.msgprint(
//                 __("Invoice {0} created successfully", [r.message])
//               );
//             }
//           },
//         });
//       });
//   }

//   showImagingTestDialog(scanType) {
//     new frappe.ui.form.MultiSelectDialog({
//       doctype: "Imaging Scan Template",
//       target: this.frm,
//       setters: { is_billable: 1 },
//       date_field: "modified",
//       get_query: () => ({ filters: { scan_type: scanType } }),
//       action: (selections) => {
//         if (selections.length === 0) {
//           frappe.msgprint(
//             __("Please select at least one imaging scan template.")
//           );
//           return;
//         }
//         this.createImagingTestInvoice(selections);
//         this.createImagingScanDoc(selections);
//         this.addImagingScanToDoc(scanType, selections);
//       },
//     });
//   }

//   addImagingScanToDoc(scanType, selections) {
//     selections.forEach((selection) => {
//       this.frm.add_child("custom_imaging_prescription", {
//         scan_type: scanType,
//         imaging_scan_template: selection,
//       });
//     });
//     this.frm.refresh_field("custom_imaging_prescription");
//     this.frm.save();
//   }

//   createImagingTestInvoice(selections) {
//     frappe.call({
//       method: "healthcare_addon.utils.utils.create_imaging_test_invoice",
//       args: {
//         patient: this.frm.doc.patient,
//         company: this.frm.doc.company,
//         image_test_templates: JSON.stringify(selections),
//         healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//       },
//       callback: (r) => {
//         if (r.message) {
//           frappe.msgprint(__("Invoice {0} created successfully", [r.message]));
//         }
//       },
//     });
//   }

//   createImagingScanDoc(imagingTestTemplates) {
//     frappe.call({
//       method:
//         "healthcare_addon.utils.utils.create_imaging_test_from_inpatient_record",
//       args: {
//         patient: this.frm.doc.patient,
//         healthcare_practitioner: this.frm.doc[this.practitionerFieldName],
//         imaging_scan_templates: imagingTestTemplates,
//       },
//       callback: (r) => {
//         r.message.forEach((message) => {
//           if (message && message.scan_type && message.imaging_test) {
//             console.log(message.scan_type, message.imaging_test);
//             this.updateHealthcareReferences(
//               message.scan_type,
//               message.imaging_test
//             );
//           }
//         });
//       },
//     });
//   }
// }

// // Export the class
// frappe.provide("healthcare_addon.HealthcareCustomButtons");
// healthcare_addon.HealthcareCustomButtons = HealthcareCustomButtons;
