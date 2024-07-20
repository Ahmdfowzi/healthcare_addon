frappe.pages['patient-care-monitor'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Patient Care Monitor',
		single_column: true
	});
	
	let parent = $(`<div class="app container-fluid p-2"></div>`).appendTo(page.main);
	
	const loadPatientCareMonitor = async () => {
		const floorSectionRoomData = await frappe.call({
			method: 'healthcare_addon.healthcare_addon.page.patient_care_monitor.patient_care_monitor.get_patient_floor_section_room',
		});
		
		const patientFloorDrugData = await frappe.call({
			method: 'healthcare_addon.healthcare_addon.page.patient_care_monitor.patient_care_monitor.get_patient_floor_drug',
			args: {
				date: frappe.datetime.get_today()
			}
		});
		
		renderPatientCareMonitor(parent, floorSectionRoomData.message, patientFloorDrugData.message);
	};
	
	loadPatientCareMonitor();
};

const renderPatientCareMonitor = (parent, floorSectionRoomData, patientFloorDrugData) => {
	const floors = organizeDataByFloor(floorSectionRoomData);
	const timerData = removeDuplicates(patientFloorDrugData);

	parent.html(frappe.render_template("patient_care_monitor", { floors: floors, timer: timerData }));

	// Add event listeners and timers
	initializeTimersAndEvents(timerData);
};

const organizeDataByFloor = (data) => {
	const floorMap = new Map();
	data.forEach(item => {
		if (!floorMap.has(item.floor)) {
			floorMap.set(item.floor, { floor_name: item.floor, floor_sections: [] });
		}
		let floor = floorMap.get(item.floor);
		let section = floor.floor_sections.find(sec => sec.section_name === item.parent_healthcare_service_unit);
		if (!section) {
			section = { section_name: item.parent_healthcare_service_unit, section_rooms: [] };
			floor.floor_sections.push(section);
		}
		section.section_rooms.push({ room_name: item.healthcare_service_unit_name.split(" - ")[0], room_status: "Occupied", patient_name: item.patient });
	});
	return Array.from(floorMap.values());
};

const removeDuplicates = (data) => {
	const uniqueSet = new Set();
	return data.filter(item => {
		const key = item.time + ":" + item.patient;
		if (!uniqueSet.has(key)) {
			uniqueSet.add(key);
			return true;
		}
		return false;
	});
};

const initializeTimersAndEvents = (timerData) => {
	timerData.forEach(item => {
		const time = formatTime(item.time);
		const isTimePassed = isTimeLessThanNow(time);
		const element = document.querySelector(`[data-time="${item.floor}"]`);
		if (isTimePassed) {
			element.classList.add("bg-warning");
			element.classList.add("border-0");
			element.querySelector(".bi-alarm-fill").classList.add("alarm-ring");
		}
		setTimer(time, () => {
			element.classList.add("bg-warning");
			element.classList.add("border-0");
			element.querySelector(".bi-alarm-fill").classList.add("alarm-ring");
		});
	});
};

// Additional helper functions
// Converts time from "9:00:00" to "09:00:00"
function formatTime(timeStr) {
    const [hour, minute, second] = timeStr.split(':').map(str => str.padStart(2, '0'));
    return `${hour}:${minute}:${second}`;
}

/**
 * Converts a 24-hour time string to a 12-hour time string.
 * @param time24 - The time in 24-hour format (e.g. "13:00")
 * @returns The new time string in 12-hour format with AM/PM.
 */
function convertTime(time24) {
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours);
    const meridiem = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0:00) and noon (12:00)
    return `${hours}:${minutes} ${meridiem}`;
}

/**
 * Checks if a given time string (HH:MM:SS) is less than the current time.
 * @param timeStr - a string in the format of "HH:MM:SS"
 * @returns True if the time is less than the current time, otherwise false.
 */
function isTimeLessThanNow(timeStr) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const givenTime = new Date(`${todayStr}T${timeStr}`);
    const currentTime = new Date();
    return givenTime < currentTime;
}

/**
 * Sets a timer to execute a callback function at the specified stop time.
 * @param stopTime - The time to stop the timer, in the format HH:MM:SS.
 * @param callback - The function to run when the stop time is reached.
 */
function setTimer(stopTime, callback) {
    const now = new Date();
    const [stopHours, stopMinutes, stopSeconds] = stopTime.split(':');
    const stopDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stopHours, stopMinutes, stopSeconds);
    if (stopDate < now) {
        stopDate.setDate(stopDate.getDate() + 1);
    }
    const timeout = stopDate - now;
    setTimeout(callback, timeout);
}
