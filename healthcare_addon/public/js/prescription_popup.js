// frappe.provide('frappe.ui');

// frappe.ui.IssueTrackerPopup = class IssueTrackerPopup {
//     constructor() {
//         this.initialize();
//     }

//     initialize() {
//         this.create_button();
//         this.create_popup();
//         this.bind_events();
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
//             'bottom': '100px',
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
//                         <div class="card border-primary mb-3">
//                             <div class="card-header">
//                                 <h2 class="text-lg font-semibold mb-2">Patient: John Doe</h2>
//                                 <p class="text-sm mb-1">${__('Doctor:')}: Dr. XYZ'</p>
//                             </div>
//                             <div class="card-body text-primary">
//                                 <h5 class="card-title">${__('Medicine Prescription')}</h5>
//                                 <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
//                             </div>
//                         </div>
//                         <div class="card border-primary mb-3">
//                             <div class="card-header">
//                                 <h2 class="text-lg font-semibold mb-2">Patient: John Doe</h2>
//                                 <p class="text-sm mb-1">${__('Doctor:')}: Dr. XYZ'</p>
//                             </div>
//                             <div class="card-body text-primary">
//                                 <h5 class="card-title">${__('Medicine Prescription')}</h5>
//                                 <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
//                             </div>
//                         </div>
//                         <!-- Add more prescription cards here -->
//                     </div>
//                 </div>
//             </div>
//         `).appendTo('body');

//         this.$popup.css({
//             'display': 'none',
//             'position': 'fixed',
//             'bottom': '180px',
//             'right': '30px',
//             'width': '400px',
//             'height': '700px', // Set a fixed height for the popup
//             'background': 'white',
//             'border-radius': '12px',
//             'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
//             'z-index': 1001,
//             'overflow': 'hidden'
//         });

//         // Style the scrollable content
//         this.$popup.find('.scrollable-content').css({
//             'max-height': 'calc(100% - 100px)', // Adjust based on header and footer height
//             'overflow-y': 'auto',
//             'padding': '10px'
//         });
//     }

//     bind_events() {
//         this.$button.on('click', () => this.toggle_popup());
//         this.$popup.find('.close').on('click', () => this.hide_popup());
//         this.$popup.find('.submit-issue').on('click', () => this.submit_issue());
//     }

//     toggle_popup() {
//         this.$popup.toggle();
//     }

//     hide_popup() {
//         this.$popup.hide();
//     }
// }

// $(document).ready(function () {
//     new frappe.ui.IssueTrackerPopup();
// });













frappe.provide('frappe.ui');

frappe.ui.IssueTrackerPopup = class IssueTrackerPopup {
    constructor() {
        this.initialize();
    }

    initialize() {
        // Check if the current route is app/point-of-sale
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
            'bottom': '100px',
            'right': '30px',
            'z-index': 1000
        });
    }

    create_popup() {
        this.$popup = $(`
            <div class="issue-tracker-popup">
                <div class="issue-tracker-popup-header">
                    <h3>${__('Latest Prescriptions')}</h3>
                    <button class="close">&times;</button>
                </div>
                <div class="issue-tracker-popup-body">
                    <div class="scrollable-content">
                        <div class="card border-info mb-3">
                            <div class="card-header">
                                <h3 class="text-lg font-semibold mb-2">Patient: John Doe</h3>
                                <p class="text-sm mb-1">${__('Doctor')}: Dr. XYZ'</p>
                            </div>
                            <div class="card-body text-primary">
                                <h5 class="card-title">${__('Medicine Prescription')}</h5>
                                <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                            </div>
                        </div>
                        <!-- Add more prescription cards here -->
                    </div>
                </div>
            </div>
        `).appendTo('body');

        this.$popup.css({
            'display': 'none',
            'position': 'fixed',
            'bottom': '180px',
            'right': '30px',
            'width': '350px',
            'height': '700px', // Set a fixed height for the popup
            'background': 'white',
            'border-radius': '12px',
            'border': '1px solid #388ea6',            
            'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
            'z-index': 1001,
            'overflow': 'hidden'
        });

        // Style the scrollable content
        this.$popup.find('.scrollable-content').css({
            'max-height': 'calc(100% - 100px)', // Adjust based on header and footer height
            'overflow-y': 'auto',
            'padding': '10px'
        });
    }

    bind_events() {
        this.$button.on('click', () => this.toggle_popup());
        this.$popup.find('.close').on('click', () => this.hide_popup());
    }

    toggle_popup() {
        this.$popup.toggle();
    }

    hide_popup() {
        this.$popup.hide();
    }
}

$(document).ready(function () {
    // Create the IssueTrackerPopup instance
    const issueTracker = new frappe.ui.IssueTrackerPopup();

    // Listen for route changes
    frappe.router.on('change', () => {
        if (issueTracker.is_pos_route()) {
            if (!issueTracker.$button) {
                issueTracker.create_button();
                issueTracker.create_popup();
                issueTracker.bind_events();
            }
            issueTracker.$button.show();
        } else {
            if (issueTracker.$button) {
                issueTracker.$button.hide();
            }
        }
    });
});