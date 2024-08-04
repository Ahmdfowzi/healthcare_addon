// frappe.provide('frappe.ui');

// frappe.ui.IssueTrackerPopup = class IssueTrackerPopup {
//     constructor() {
//         this.initialize();
//     }

//     initialize() {
//         // Check if the current route is app/point-of-sale
//         if (this.is_pos_route()) {
//             this.create_button();
//             this.create_popup();
//             this.bind_events();
//         }
//     }

//     is_pos_route() {
//         return frappe.get_route_str() == "point-of-sale";
//     }

//     create_button() {
//         this.$button = $(`
//             <div class="issue-tracker-btn-wrapper">
//                 <button class="issue-tracker-btn" title="${__('Latest Prescriptions')}">
//                     <i class="fa fa-list-ul"></i>
//                 </button>
//             </div>
//         `).appendTo('body');

//         this.$button.css({
//             'position': 'fixed',
//             'bottom': '50px',
//             'right': '30px',
//             'z-index': 1000
//         });
//     }

//     create_popup() {
//         this.$popup = $(`
//             <div class="issue-tracker-popup">
//                 <div class="issue-tracker-popup-header">
//                     <h3>${__('Latest Prescriptions')}</h3>
//                     <button class="close">&times;</button>
//                 </div>
//                 <div class="issue-tracker-popup-body">
//                     <div class="scrollable-content">
//                         <!-- Prescription cards will be dynamically inserted here -->
//                     </div>
//                 </div>
//             </div>
//         `).appendTo('body');

//         this.$popup.css({
//             'display': 'none',
//             'position': 'fixed',
//             'bottom': '120px',
//             'right': '30px',
//             'width': '350px',
//             'height': '700px',
//             'background': 'white',
//             'border-radius': '12px',
//             'border': '1px solid #388ea6',
//             'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
//             'z-index': 1001,
//             'display': 'flex',
//             'flex-direction': 'column'
//         });

//         this.$popup.find('.issue-tracker-popup-header').css({
//             'padding': '15px',
//             'border-bottom': '1px solid #e0e0e0',
//             'display': 'flex',
//             'justify-content': 'space-between',
//             'align-items': 'center'
//         });

//         this.$popup.find('.issue-tracker-popup-body').css({
//             'flex': '1',
//             'overflow': 'hidden'
//         });

//         this.$popup.find('.scrollable-content').css({
//             'height': '100%',
//             'overflow-y': 'auto',
//             'padding': '10px'
//         });
//     }

//     bind_events() {
//         this.$button.on('click', () => {
//             this.toggle_popup();
//             this.load_prescriptions();
//         });
//         this.$popup.find('.close').on('click', () => this.hide_popup());
//     }

//     toggle_popup() {
//         this.$popup.toggle();
//     }

//     hide_popup() {
//         this.$popup.hide();
//     }

//     load_prescriptions() {
//         frappe.call({
//             method: 'frappe.client.get_list',
//             args: {
//                 doctype: 'Prescription',
//                 fields: ['name', 'patient', 'healthcare_practitioner', 'medications'],
//                 filters: [['served', '!=', 1]],
//                 order_by: 'creation desc',
//                 limit: 5
//             },
//             callback: (response) => {
//                 if (response.message) {
//                     this.render_prescriptions(response.message);
//                 }
//             }
//         });
//     }

//     render_prescriptions(prescriptions) {
//         const $content = this.$popup.find('.scrollable-content');
//         $content.empty();

//         prescriptions.forEach(prescription => {
//             const card = $(`
//                 <div class="card border-info mb-3">
//                     <div class="card-header">
//                         <h3 class="text-lg font-semibold mb-2">Patient: ${prescription.patient}</h3>
//                         <p class="text-sm mb-1">${__('Doctor')}: ${prescription.healthcare_practitioner}</p>
//                     </div>
//                     <div class="card-body text-primary">
//                         <h5 class="card-title">${__('Medicine Prescription')}</h5>
//                         <p class="card-text">${prescription.medications || 'No medications specified'}</p>
//                         <button class="btn btn-sm btn-success mt-2 complete-prescription" data-prescription="${prescription.name}">
//                             ${__('Mark as Served')}
//                         </button>
//                     </div>
//                 </div>
//             `);

//             // Attach click event to the button
//             card.find('.complete-prescription').on('click', (e) => {
//                 const prescriptionName = $(e.target).data('prescription');
//                 this.mark_prescription_as_served(prescriptionName, $(e.target));
//             });

//             $content.append(card);
//         });
//     }

//     mark_prescription_as_served(prescriptionName, $button) {
//         // use frappe.db.set_value instead of frappe.client.set_value
//         frappe.db.set_value('Prescription', prescriptionName, 'served', 1).then(r => {
//             $button.remove();
//             this.$popup.find(`[data-prescription="${prescriptionName}"]`).remove();
//         })

//     }
// }

// $(document).ready(function () {
//     // Create the IssueTrackerPopup instance
//     const issueTracker = new frappe.ui.IssueTrackerPopup();

//     // Listen for route changes
//     frappe.router.on('change', () => {
//         if (issueTracker.is_pos_route()) {
//             if (!issueTracker.$button) {
//                 issueTracker.create_button();
//                 issueTracker.create_popup();
//                 issueTracker.bind_events();
//             }
//             issueTracker.$button.show();
//         } else {
//             if (issueTracker.$button) {
//                 issueTracker.$button.hide();
//             }
//         }
//     });
// });


frappe.provide('frappe.ui');

frappe.ui.PrescriptionServingPopup = class PrescriptionServingPopup {
    constructor() {
        this.initialize();
    }

    initialize() {
        if (this.is_pos_route()) {
            this.create_button();
            this.create_popup();
            this.bind_events();
        }
    }

    is_pos_route() {
        return frappe.get_route_str() == "point-of-sale";
    }

    create_button() {
        this.$button = $(`
                    <div class="issue-tracker-btn-wrapper">
                        <button class="issue-tracker-btn" title="${__('Latest Prescriptions')}">
                            <i class="fa fa-list-ul"></i>
                        </button>
                    </div>
                `).appendTo('body');

        this.$button.css({
            'position': 'fixed',
            'bottom': '50px',
            'right': '30px',
            'z-index': 1000
        });
    }


    create_popup() {
        this.$popup = $(`
            <div class="prescription-serving-popup">
                <div class="prescription-serving-popup-header">
                    <h3>${__('Latest Prescriptions')}</h3>
                    <button class="close">&times;</button>
                </div>
                <div class="prescription-serving-popup-body">
                    <div class="scrollable-content">
                        <!-- Prescription cards will be dynamically inserted here -->
                    </div>
                </div>
            </div>
        `).appendTo('body');

        this.$popup.css({
            'display': 'none',
            'position': 'fixed',
            'bottom': '120px',
            'right': '30px',
            'width': '350px',
            'height': '700px',
            'background': 'white',
            'border-radius': '12px',
            'border': '1px solid #388ea6',
            'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
            'z-index': 1001,
            'display': 'flex',
            'flex-direction': 'column'
        });

        this.$popup.find('.prescription-serving-popup-header').css({
            'padding': '15px',
            'border-bottom': '1px solid #e0e0e0',
            'display': 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
        });

        this.$popup.find('.prescription-serving-popup-body').css({
            'flex': '1',
            'overflow': 'hidden'
        });

        this.$popup.find('.scrollable-content').css({
            'height': '100%',
            'overflow-y': 'auto',
            'padding': '10px'
        });
    }

    bind_events() {
        this.$button.on('click', () => {
            this.toggle_popup();
            this.load_prescriptions();
        });
        this.$popup.find('.close').on('click', () => this.hide_popup());
    }

    toggle_popup() {
        this.$popup.toggle();
    }

    hide_popup() {
        this.$popup.hide();
    }

    load_prescriptions() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Prescription',
                fields: ['name', 'patient', 'healthcare_practitioner', 'medications'],
                filters: [['served', '!=', 1]],
                order_by: 'creation desc',
                limit: 5
            },
            callback: (response) => {
                if (response.message) {
                    this.render_prescriptions(response.message);
                }
            }
        });
    }

    render_prescriptions(prescriptions) {
        const $content = this.$popup.find('.scrollable-content');
        $content.empty();

        prescriptions.forEach(prescription => {
            const card = $(`
                <div class="card border-info mb-3">
                    <div class="card-header">
                        <h3 class="text-lg font-semibold mb-2">Patient: ${prescription.patient}</h3>
                        <p class="text-sm mb-1">${__('Doctor')}: ${prescription.healthcare_practitioner}</p>
                    </div>
                    <div class="card-body text-primary">
                        <h5 class="card-title">${__('Medicine Prescription')}</h5>
                        <p class="card-text">${prescription.medications || 'No medications specified'}</p>
                        <button class="btn btn-sm btn-success mt-2 serve-prescription" data-prescription="${prescription.name}">
                            ${__('Mark as Served')}
                        </button>
                    </div>
                </div>
            `);

            card.find('.serve-prescription').on('click', (e) => {
                const prescriptionName = $(e.target).data('prescription');
                this.mark_prescription_as_served(prescriptionName, card);
            });

            $content.append(card);
        });
    }

    mark_prescription_as_served(prescriptionName, $card) {
        frappe.db.set_value('Prescription', prescriptionName, 'served', 1)
            .then(r => {
                frappe.show_alert({
                    message: __('Prescription marked as served'),
                    indicator: 'green'
                });
                $card.slideUp(300, () => $card.remove());
            })
            .catch(err => {
                frappe.show_alert({
                    message: __('Failed to update prescription status'),
                    indicator: 'red'
                });
                console.error(err);
            });
    }
}

$(document).ready(function () {
    const prescriptionServing = new frappe.ui.PrescriptionServingPopup();

    frappe.router.on('change', () => {
        if (prescriptionServing.is_pos_route()) {
            if (!prescriptionServing.$button) {
                prescriptionServing.create_button();
                prescriptionServing.create_popup();
                prescriptionServing.bind_events();
            }
            prescriptionServing.$button.show();
        } else {
            if (prescriptionServing.$button) {
                prescriptionServing.$button.hide();
            }
        }
    });
});