
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
// convert time from "9:00:00" to "09:00:00"
function formatTime(timeStr) {
	const [hour, minute, second] = timeStr.split(':').map(str => str.padStart(2, '0'));
	return `${hour}:${minute}:${second}`;
  }

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
frappe.pages['appointments-dashboa'].on_page_load = async function (wrapper) {
	
	let parent = $(`<div class="app"></div>`).appendTo(wrapper);

	const data = await frappe.db.get_list("Patient Appointment",{
		fields: '*',
		// ['appointment_date', '=', new Date()],
		filters: [['status','!=','Closed']],
		// limit: 10,
	})
	frappe.realtime.on("visited",(data)=>{
		console.log(data);
		frappe.show_alert({
			message: `${data.patient_name} visited by ${data.practitioner_name}`,
			indicator: "green"
		  });
		setTimeout(()=>{
			location.reload();
		},3000)
	})
	// new-appointment
	frappe.realtime.on("new-appointment",(data)=>{
		console.log(data);
		frappe.show_alert({
			message: `${data.patient_name} added to patient appointment`,
			indicator: "blue"
		  });
		setTimeout(()=>{
			location.reload();
		},3000)
	})
	setTimeout(()=>{
		setTimer("13:37:00",() => {
			document.querySelector(".istime").classList.add("active")
		})
		document.querySelectorAll(".istime").forEach(elm=>{
			console.log(elm.lastElementChild.firstElementChild.lastElementChild.textContent.trim())
			const time = elm.lastElementChild.firstElementChild.lastElementChild.textContent.trim()
			if(isTimeLessThanNow(formatTime(time))){
				elm.classList.add("active")
			}
			setTimer(time,() => {
				elm.classList.add("active")
			})
		})
	},1000)
	if(data.length > 0){
		parent.html(frappe.render_template("appointments_dashboa",{appointments : data}));
	}else{
		parent.html(frappe.render_template("appointments_dashboa",{appointments : null}));
	}
}


