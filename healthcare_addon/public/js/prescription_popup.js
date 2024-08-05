frappe.provide('frappe.ui');

frappe.ui.PrescriptionServingPopup = class PrescriptionServingPopup {
    constructor() {
        this.initialize();
    }

    initialize() {
        if (this.isPosRoute()) {
            this.createButton();
            this.createPopup();
            this.bindEvents();
        }
    }

    isPosRoute() {
        return frappe.get_route_str() === "point-of-sale";
    }

    createButton() {
        this.$button = $(`
            <div class="issue-tracker-btn-wrapper">
                <button class="issue-tracker-btn" title="${__('Latest Prescriptions')}">
                    <i class="fa fa-list-ul"></i>
                </button>
            </div>
        `).appendTo('body');

        this.$button.css({
            position: 'fixed',
            bottom: '50px',
            right: '30px',
            zIndex: 1000
        });
    }

    createPopup() {
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

        this.applyPopupStyles();
    }

    applyPopupStyles() {
        this.$popup.css({
            display: 'none',
            position: 'fixed',
            bottom: '120px',
            right: '30px',
            width: '350px',
            height: '700px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #388ea6',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column'
        });

        this.$popup.find('.prescription-serving-popup-header').css({
            padding: '15px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        this.$popup.find('.prescription-serving-popup-body').css({
            flex: '1',
            overflow: 'hidden'
        });

        this.$popup.find('.scrollable-content').css({
            height: '100%',
            overflowY: 'auto',
            padding: '10px'
        });
    }

    bindEvents() {
        this.$button.on('click', () => {
            this.togglePopup();
            this.loadPrescriptions();
        });
        this.$popup.find('.close').on('click', () => this.hidePopup());
    }

    togglePopup() {
        this.$popup.toggle();
    }

    hidePopup() {
        this.$popup.hide();
    }

    loadPrescriptions() {
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
                    this.renderPrescriptions(response.message);
                }
            }
        });
    }

    renderPrescriptions(prescriptions) {
        const $content = this.$popup.find('.scrollable-content');
        $content.empty();

        prescriptions.forEach(prescription => {
            const card = this.createPrescriptionCard(prescription);
            $content.append(card);
        });
    }

    createPrescriptionCard(prescription) {
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
            this.markPrescriptionAsServed(prescriptionName, card);
        });

        return card;
    }

    markPrescriptionAsServed(prescriptionName, $card) {
        frappe.db.set_value('Prescription', prescriptionName, 'served', 1)
            .then(() => {
                this.showAlert('Prescription marked as served', 'green');
                $card.slideUp(300, () => $card.remove());
            })
            .catch(err => {
                this.showAlert('Failed to update prescription status', 'red');
                console.error(err);
            });
    }

    showAlert(message, indicator) {
        frappe.show_alert({
            message: __(message),
            indicator: indicator
        });
    }
}

$(document).ready(function () {
    const prescriptionServing = new frappe.ui.PrescriptionServingPopup();

    frappe.router.on('change', () => {
        if (prescriptionServing.isPosRoute()) {
            if (!prescriptionServing.$button) {
                prescriptionServing.createButton();
                prescriptionServing.createPopup();
                prescriptionServing.bindEvents();
            }
            prescriptionServing.$button.show();
        } else {
            if (prescriptionServing.$button) {
                prescriptionServing.$button.hide();
            }
        }
    });
});