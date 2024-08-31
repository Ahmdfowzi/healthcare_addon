async function MapThroughTables() {
	const { message: floor_section_room } = await frappe.call({
		method: 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_floor_section_room',
	});

	const floorSet = new Set(floor_section_room.map(floor => floor.service_unit_type));
	const data = Array.from(floorSet).map(floor => ({ floor_name: floor, floor_sections: [] }));

	const sections = floor_section_room.map(section => ({
		section_name: section.parent_healthcare_service_unit,
		room_name: section.name,
		floor_name: section.service_unit_type,
		room_status: section.occupancy_status,
	}));

	const visitedSections = new Set();
	data.forEach(obj => {
		sections.forEach(section => {
			const key = `${section.section_name}:${section.floor_name}`;
			if (!visitedSections.has(key) && obj.floor_name === section.floor_name) {
				obj.floor_sections.push({ section_name: section.section_name, section_rooms: [] });
				visitedSections.add(key);
			}
		});
	});

	sections.forEach(section => {
		const floor = data.find(obj => obj.floor_name === section.floor_name);
		if (floor) {
			const floorSection = floor.floor_sections.find(s => s.section_name === section.section_name);
			if (floorSection) {
				floorSection.section_rooms.push({
					room_name: section.room_name.split(" - ")[0],
					room_status: section.room_status
				});
			}
		}
	});

	const { message: patient_floor_section_room } = await frappe.call({
		method: 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_patient_floor_section_room',
	});

	data.forEach(obj => {
		obj.floor_sections.forEach(section => {
			section.section_rooms.forEach(room => {
				const patient = patient_floor_section_room.find(p =>
					p.service_unit_type === obj.floor_name &&
					p.parent_healthcare_service_unit === section.section_name &&
					p.healthcare_service_unit_name === room.room_name
				);
				if (patient) {
					room.patient_name = patient.patient;
					room.gender = patient.gender;
					room.primary_practitioner = patient.primary_practitioner;
				}
			});
		});
	});

	return data;
}

function formatTime(timeStr) {
	return timeStr.split(':').map(str => str.padStart(2, '0')).join(':');
}

function convertTime(time24) {
	const [hours, minutes] = time24.split(':');
	const hour = parseInt(hours) % 12 || 12;
	const meridiem = parseInt(hours) < 12 ? 'AM' : 'PM';
	return `${hour}:${minutes} ${meridiem}`;
}

function setTimer(stopTime, callback) {
	const now = new Date();
	const [stopHours, stopMinutes, stopSeconds] = stopTime.split(':');
	const stopDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stopHours, stopMinutes, stopSeconds);
	if (stopDate < now) stopDate.setDate(stopDate.getDate() + 1);
	const timeout = stopDate - now;
	setTimeout(callback, timeout);
}

function isTimeLessThanNow(timeStr) {
	const now = new Date();
	const [hours, minutes] = timeStr.split(':');
	const givenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
	return givenTime < now;
}

frappe.pages['rooms-monitor'].on_page_load = async function (wrapper) {
	const parent = $(`<div class="app"></div>`).appendTo(wrapper);
	const data = await MapThroughTables();

	const saveState = state => localStorage.setItem('state', JSON.stringify(state));
	const loadState = () => JSON.parse(localStorage.getItem('state')) || null;
	const getDefaultState = () => {
		const state = { index: 0, floor: data[0].floor_name };
		saveState(state);
		return state;
	};

	const now = new Date();
	const formattedDate = now.toISOString().split('T')[0];
	const { message: result } = await frappe.call({
		method: 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_patient_floor_drug',
		args: { date: formattedDate }
	});

	const newResult = Array.from(new Set(result.map(JSON.stringify))).map(JSON.parse);

	setTimeout(() => {
		const elements = {
			floorButtons: document.querySelectorAll("[data-floorname]"),
			floors: document.querySelectorAll("[data-floor]"),
			timers: document.querySelectorAll("[data-time]"),
			timerItems: document.querySelectorAll(".timer-item"),
			timeSpans: document.querySelectorAll(".thetime span")
		};

		elements.floorButtons.forEach((el, i) => el.dataset.index = i);
		elements.floors.forEach((el, i) => el.dataset.floor_index = i);

		const initialState = loadState() || getDefaultState();
		elements.floorButtons[initialState.index].classList.add("btn-primary");
		elements.floors[initialState.index].classList.add("active");
		elements.timers.forEach(elm => {
			if (elm.dataset.time === initialState.floor) elm.classList.add("active");
		});

		elements.floorButtons.forEach(floor_btn => {
			floor_btn.addEventListener("click", (e) => {
				const index = parseInt(floor_btn.dataset.index);
				saveState({ index, floor: data[index].floor_name });

				elements.timers.forEach(elm => elm.classList.toggle("active", elm.dataset.time === data[index].floor_name));

				elements.floorButtons.forEach(elm => {
					elm.classList.remove("btn-primary");
					elm.classList.add("btn-secondary");
				});
				floor_btn.classList.add("btn-primary");
				floor_btn.classList.remove("btn-secondary");

				elements.floors.forEach(floor => floor.classList.remove("active"));
				document.querySelector(`[data-floor="${e.target.innerText}"]`).classList.add("active");
			});
		});

		elements.timerItems.forEach(elm => {
			const patient_name = elm.children[0].textContent.trim();
			const dosage_time = elm.children[2].children[1].textContent.trim();
			const clock_icon = elm.children[2].children[0];

			const updateTimerItem = () => {
				elm.classList.add("bg-warning", "border-0");
				clock_icon.classList.add("alarm-ring");
				elm.addEventListener("click", () => {
					frappe.route_options = { 'patient': patient_name };
					frappe.new_doc('Inpatient Medication Entry');
				});
			};

			if (isTimeLessThanNow(formatTime(dosage_time))) {
				updateTimerItem();
			} else {
				setTimer(dosage_time, updateTimerItem);
			}
		});

		elements.timeSpans.forEach(elm => {
			elm.textContent = convertTime(elm.textContent);
		});
	}, 1000);

	frappe.realtime.on("enter", (data) => {
		frappe.show_alert({
			message: `${data.data} added to room`,
			indicator: "green"
		});
		setTimeout(() => location.reload(), 2000);
	});

	frappe.realtime.on("out", (data) => {
		frappe.show_alert({
			message: `${data.data} discharged from room`,
			indicator: "blue"
		});
		setTimeout(() => location.reload(), 2000);
	});

	frappe.realtime.on("new-medication", data => {
		frappe.show_alert({
			message: `${data.patient} is given a ${data.item_code} right now`,
			indicator: "blue"
		});
		setTimeout(() => location.reload(), 2000);
	});

	parent.html(frappe.render_template("rooms_monitor", { floors: data, timer: newResult }));
};