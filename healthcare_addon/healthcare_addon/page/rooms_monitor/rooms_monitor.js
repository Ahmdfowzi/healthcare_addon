// frappe.pages['rooms-monitor'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Rooms Dashboard',
// 		single_column: true
// 	});
// 	page.html(frappe.render_template("rooms_monitor"));
// }


/**
 * It takes the data from the database and maps it to a data structure that is easy to use in the
 * frontend
 * @returns [
 * 		{
 * 			floor_name : "Floor 1",
 * 			floor_sections : [
 * 				{
 * 					section_name : "Section 1",
 * 					section_rooms : [
 * 						{
 * 							room_name
 */
async function MapThroughTables(){
	let data = []
	let floor_section_room = await frappe.call({
		method : 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_floor_section_room',
	})
	floor_section_room = floor_section_room.message

	// collect floors in set to ensure there is no dublicate
	const floorSet = new Set()
	for(let floor of floor_section_room){
		floorSet.add(floor.service_unit_type)
	}
	// add floors to data
	for (const floor of floorSet.keys()) {
		data.push({
			floor_name : floor,
			floor_sections : []
		})
	}
	// ----------------------------- END ==> floors added to data

	/* The code is creating a new array called sections and pushing the values of the
	floor_section_room array into the new array. */
	const sections = []
	for (const section of floor_section_room) {
		sections.push({
			section_name: section.parent_healthcare_service_unit,
			room_name: section.name,
			floor_name: section.service_unit_type,
			room_status : section.occupancy_status,
		})
	}

	/* Adding the sections to the floor_sections array of the floor object inside data array. */
	const visitedSections = new Set()
	for(let obj of data){
		for (const section of sections) {
			if(visitedSections.has(section.section_name + ":" + section.floor_name)) continue
			if(obj.floor_name == section.floor_name){
				obj.floor_sections.push({
					section_name : section.section_name,
					section_rooms : [],
				})
				visitedSections.add(section.section_name + ":" + section.floor_name)
			}
		}
	}
	/* Adding rooms inside thier sections */
	for (const i of sections) {
		for (const obj of data) {
			if(i.floor_name == obj.floor_name){
				for (const section of obj.floor_sections) {
					if(section.section_name == i.section_name){
						section.section_rooms.push({
							room_name : i.room_name.split(" - ")[0],
							room_status :i.room_status
						})
					}
				}
			}
		}
	}
	// add the patients to the rooms
	// get_patient_floor_section_room
	let patient_floor_section_room = await frappe.call({
		method : 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_patient_floor_section_room',
	})
	patient_floor_section_room = patient_floor_section_room.message

	/* The code is iterating through the data and adding the patient name and gender to the room
	object. */
	for (const obj of data) {
		for (const section of obj.floor_sections) {
			for (const room of section.section_rooms) {
				for (const patient of patient_floor_section_room) {
					if(patient.service_unit_type == obj.floor_name && patient.parent_healthcare_service_unit == section.section_name && patient.healthcare_service_unit_name == room.room_name){
						room.patient_name = patient.patient
						room.gender =  patient.gender
					}
				}
			}
		}
	}
	return data
}

// convert time from "9:00:00" to "09:00:00"
function formatTime(timeStr) {
	const [hour, minute, second] = timeStr.split(':').map(str => str.padStart(2, '0'));
	return `${hour}:${minute}:${second}`;
  }
/**
 * "Convert a 24-hour time string to a 12-hour time string."
 * 
 * The function takes a single parameter, time24, which is a string in the format "HH:MM". The function
 * returns a string in the format "HH:MM AM/PM"
 * @param time24 - The time in 24-hour format (e.g. "13:00")
 * @returns The new time string
 */
function convertTime(time24) {
	// Split the time string into hours and minutes
	var [hours, minutes] = time24.split(':');
	
	// Convert hours from string to number
	hours = parseInt(hours);
	
	// Determine if it's AM or PM
	var meridiem = hours < 12 ? 'AM' : 'PM';
	
	// Convert to 12-hour format
	hours = hours % 12;
	hours = hours ? hours : 12; // Handle midnight (0:00) and noon (12:00)
	
	// Construct the new time string
	var time12 = hours + ':' + minutes + ' ' + meridiem;
	
	// Return the new time string
	return time12;
  }
  
/**
 * It takes a time string in the format "HH:MM:SS" and a callback function, and calls the callback
 * function at the specified time
 * @param stopTime - The time to stop the timer, in the format HH:MM:SS.
 * @param callback - The function to run when the stop time is reached.
 */
  function setTimer(stopTime, callback) {
	 // Get the current time
	var now = new Date();

	// Parse the stop time string into hours, minutes, and seconds
	var [stopHours, stopMinutes, stopSeconds] = stopTime.split(':');

	// Create a new date object for the stop time, using today's date
	var stopDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stopHours, stopMinutes, stopSeconds);

	// If the stop time is before the current time, add 1 day to the stop time
	if (stopDate < now) {
		stopDate.setDate(stopDate.getDate() + 1);
	}

	// Calculate the number of milliseconds until the stop time
	var timeout = stopDate - now;

	// Set a timeout to run the callback function when the stop time is reached
	setTimeout(callback, timeout);
  }
/**
 * It takes a time string in the format of `HH:MM` and returns `true` if the time is less than the
 * current time, and `false` otherwise
 * @param timeStr - a string in the format of "HH:MM"
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

frappe.pages['rooms-monitor'].on_page_load = async function (wrapper) {
	
	let parent = $(`<div class="app"></div>`).appendTo(wrapper);
	let data = await MapThroughTables()

		/**
	 * It takes a state object, converts it to a string, and saves it to localStorage
	 * @param state - The state object to save.
	 */
	function saveState(state) {
		localStorage.setItem('state', JSON.stringify(state));
	}
	/**
	 * If there's a state in localStorage, return it, otherwise return the default state
	 * @returns The state is being returned.
	 */
	function loadState() {
		const state = localStorage.getItem('state');
		//console.log(state);
		return state ? JSON.parse(state) : null;
	}
	/**
	 * It returns an object with two properties: index and floor. The index property is set to 0, and the
	 * floor property is set to the floor_name property of the first object in the data array
	 * @returns an object with two properties: index and floor.
	 */
	function getDefaultState(){
		const state = {
			index : 0,
			floor : data[0].floor_name
		}
		//console.log(state);
		saveState(state)
		return state
	}
	

	setTimeout(()=>{
		document.querySelectorAll("[data-floorname]").forEach((el,i)=>{
			el.dataset.index = i
		})
		document.querySelectorAll("[data-floor]").forEach((el,i)=>{
			el.dataset.floor_index = i
		})
		
		const initialState = loadState() ? loadState() : getDefaultState() 
		//console.log("init ",initialState);
		document.querySelectorAll("[data-floorname]")[initialState.index].classList.add("btn-primary")
		//console.log(document.querySelectorAll("[data-floor]")[initialState.index]);
		//console.log(document.querySelectorAll("[data-floorname]")[initialState.index]);
		document.querySelectorAll("[data-floor]")[initialState.index].classList.add("active")
		document.querySelectorAll("[data-time]").forEach(elm=>{
			if(elm.dataset.time===initialState.floor){
				// // //console.log(elm.dataset);
				elm.classList.add("active")
			}
		})
		document.querySelectorAll("[data-floorname]").forEach(floor_btn=>{
			floor_btn.addEventListener("click",(e) => {
				//console.log(floor_btn.dataset.index)
				saveState({index :parseInt(floor_btn.dataset.index),floor : data[parseInt(floor_btn.dataset.index)].floor_name})
				// // //console.log(loadState());
				document.querySelectorAll("[data-time]").forEach(elm=>{
					elm.classList.remove("active")
					
				})
				document.querySelectorAll("[data-time]").forEach(elm=>{
					if(elm.dataset.time===data[parseInt(floor_btn.dataset.index)].floor_name){
						// // //console.log("insidey");
						elm.classList.add("active")
					}
				})
				// // // //console.log(floor_btn.dataset.index)
				document.querySelectorAll("[data-floorname]").forEach(elm=>{
					elm.classList.remove("btn-primary")
					elm.classList.add("btn-secondary")
				})
				floor_btn.classList.add("btn-primary")
				floor_btn.classList.remove("btn-secondary")
				let floors = [...document.querySelectorAll("[data-floor]")]
				for(let floor of floors){
					floor.classList.remove("active")
				}
				document.querySelector(`[data-floor="${e.target.innerText}"]`).classList.add("active")
			})
			})

			//   document.querySelector(".alarm-sound").play()
			  // Example usage
			  setTimer('13:47:00', function() {
				// // //console.log('Time is up!');
				document.querySelector(".timer-item").classList.add("bg-warning")
				document.querySelector(".timer-item").classList.add("border-0")
				document.querySelector(".thetime svg").classList.add("alarm-ring")
				document.querySelector(".timer-item").addEventListener("click",(e)=>{
					let patient_name = document.querySelector(".timer-item").children[0].textContent.trim()
					let dosage_time = document.querySelector(".timer-item").children[1].children[1].textContent.trim()
					frappe.route_options = {
						'patient': patient_name,
						'from_date': "25-03-2023",
						'to_date': "25-03-2023",
					};
					frappe.new_doc('Inpatient Medication Entry');
					// document.querySelector(".timer-item").remove()
				})

			  });
			  document.querySelectorAll(".timer-item").forEach(elm=>{
				let patient_name = elm.children[0].textContent.trim()
				let dosage_time = elm.children[1].children[1].textContent.trim()
				let clock_icon = elm.children[1].children[0]
				//console.log(dosage_time)
				if(isTimeLessThanNow(formatTime(dosage_time))){
					//console.log(dosage_time)
					elm.classList.add("bg-warning")
					elm.classList.add("border-0")
					clock_icon.classList.add("alarm-ring")
					const date = new Date()
					elm.addEventListener("click",()=>{
						frappe.route_options = {
							'patient': patient_name,
							'from_date': "25-03-2023",
							'to_date': "25-03-2023",
						};
						frappe.new_doc('Inpatient Medication Entry');
					})
				}
				setTimer(dosage_time,function() {
					elm.classList.add("bg-warning")
					elm.classList.add("border-0")
					clock_icon.classList.add("alarm-ring")
					elm.addEventListener("click",()=>{
						frappe.route_options = {
							'patient': patient_name,
							'from_date': "25-03-2023",
							'to_date': "25-03-2023",
						};
						frappe.new_doc('Inpatient Medication Entry');
					})
				  })
			  })
			  document.querySelectorAll(".thetime span").forEach(elm=>{
				const newTime = convertTime(elm.textContent)
				elm.textContent = newTime
			  })

	},[1000])
	/* Creating a new date object and then assigning the year, month, and day to variables. */
	const now = new Date();
	const year = now.getFullYear();
	const month = ('0' + (now.getMonth() + 1)).slice(-2);
	const day = ('0' + now.getDate()).slice(-2);
	const formattedDate = `${year}-${month}-${day}`;
	let result = await frappe.call({
		method : 'healthcare_addon.healthcare_addon.page.rooms_monitor.rooms_monitor.get_patient_floor_drug',
		args : {
			date: formattedDate
		}
	})
	result = result.message
	let newResult = []
	/* Removing duplicates from the result array. */
	const visitedNodes = new Set()
	for (const r of result) {
		if(!visitedNodes.has(r.time + ":" + r.patient)){
			newResult.push(r)
			visitedNodes.add(r.time + ":" + r.patient)
		}
	}

	/* Listening to the event "enter" and when it is triggered it will show an alert with the message
	"data.data added to room" and it will reload the page after 2 seconds */
	frappe.realtime.on("enter",(data)=>{
		frappe.show_alert({
			message: `${data.data} added to room`,
			indicator: "green"
		  });
		setTimeout(()=>{
			location.reload();
		},2000)
	})
	/* Listening to the event "out" and when it is triggered it will show an alert with the message
	"data.data discharged from room" and it will reload the page after 2 seconds */
	frappe.realtime.on("out",(data)=>{
		frappe.show_alert({
			message: `${data.data} discharged from room`,
			indicator: "blue"
		  });
		setTimeout(()=>{
			location.reload();
		},2000)
	})
	frappe.realtime.on("new-medication",data=>{
		frappe.show_alert({
			message: `${data.patient} is given a ${data.item_code} right now`,
			indicator: "blue"
		  });
		setTimeout(()=>{
			location.reload();
		},2000)
	})

	parent.html(frappe.render_template("rooms_monitor", {floors:data, timer: newResult}));
}


