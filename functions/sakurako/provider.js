import $ from 'jquery';
// DataTabble
import fucker from 'datatables.net/js/dataTables.material.min.js';
import dt from 'datatables.net';
import buttons from 'datatables.net-buttons';

import jsPDF from 'jspdf';
import jspdf_autotable from 'jspdf-autotable';

import button from 'datatables.net-buttons/js/dataTables.buttons.min.js';
import flash from 'datatables.net-buttons/js/buttons.flash.min.js';
import zip from 'jszip/dist/jszip.min.js';
// import pdff from 'pdfmake/build/pdfmake.min.js';
// import font from 'pdfmake/build/vfs_fonts.js';
import html from 'datatables.net-buttons/js/buttons.html5.min.js';
import print from 'datatables.net-buttons/js/buttons.print.min.js';

import {MDCRipple} from '@material/ripple';
import {MDCDialog, MDCDialogFoundation, util} from '@material/dialog';
import {MDCSnackbar} from '@material/snackbar';
import bodymovin from 'lottie-web/bodymovin.min.js';
import iyottayo from 'material-design-lite';

$(document).ready(() => {
	console.log('Hello world');
	var functions;
	var database;
	var auth;
	var messaging;

	var firestore;
	var users;
	var quotes;

	try {
		functions = firebase.functions();
		database = firebase.database();
		auth = firebase.auth();
		messaging = firebase.messaging();

		firestore = firebase.firestore();
		const settings = {timestampsInSnapshots: true};
		firestore.settings(settings);
		users = firestore.collection('users');
		quotes = firestore.collection('quotes');
	}catch(err) {
		setTimeout(() => {
            location.reload();
        }, 1000);
	}

	const monthNames = ["January", "February", "March", "April", "May", "June",
	  "July", "August", "September", "October", "November", "December"
	];

	var rootRef = database.ref();
	var providerRef = rootRef.child("Providers");
	var getUserRecord = functions.httpsCallable('getUserRecord');
	var actionUser = functions.httpsCallable('actionUser');
	var listVerifiedProviders = functions.httpsCallable('listVerifiedProviders');

	var dataObj = {
		message: "Hello world",
		actionText: null,
		timeout: 3500,
		multiline: true
	};

	function updateTableRow(userRecord) {
		var image;
		if (userRecord.photoURL !== null) {
			image = '<img class="image profile_img" name="'+userRecord.displayName+'" src="'+ (userRecord.photoURL.match("^https://graph.facebook.com") ? userRecord.photoURL + "?height=400" : userRecord.photoURL) +'" width="70" height="70" />';			
		}else {
			image = '<img class="profile_img" name="'+userRecord.displayName+'" src="images/no_image.jpg" width="70" height="70" />';
		}
		const mdl_button = '<button services="'+userRecord.customClaims.services+'" id="'+userRecord.uid+'" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent filter_report">PRINT</button>';
		var mdc_button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action" id="'+userRecord.uid+'" name="'+ (userRecord.displayName || 'Undefined') +'" isDisable="'+userRecord.disabled+'">'+ (userRecord.disabled ? 'ENABLE' : 'DISABLE') +'</button>';
		var dataset = [image, userRecord.displayName || 'Undefined', userRecord.email, ((userRecord.customClaims.rating || 'No rating yet')), '<i class="material-icons services" services="'+userRecord.customClaims.services+'">build</i><i class="material-icons concerns" id="'+userRecord.uid+'">assignment_late</i><i class="material-icons review" id="'+userRecord.uid+'">rate_review</i>', mdl_button, mdc_button];
		provider_table.row('.' + userRecord.uid).data(dataset).draw();
	}

	function showSnackbar(message) {
		dataObj.message = message;
		snackbar.show(dataObj);
	}

	function showConcerns(concernsCollection) {
		$('#concerns').empty();
		$('#concerns').append('<center><div id="loading_review" class="lottie_table"></center>');
		initbodyMovin('loading_table.json', 'loading_review');
		concernsCollection.get()
			.then(snapshot => {
				$('#concerns').empty();
				if (snapshot.empty === false) {
					$('#concern_title').text("Concerns(" + snapshot.size + ")");
					snapshot.forEach(doc => {
						const concern = doc.data();
						const displayName = concern.displayName || null;
						const concernn = concern.concern || null;
						var photoUrl = concern.photoUrl || null;
						const timestamp = concern.timestamp.toDate();
						var date;
						if (timestamp !== null || timestamp !== undefined) {
							date = monthNames[timestamp.getMonth()] + " " + timestamp.getDate() + ", " + timestamp.getFullYear();
						}else {
							date = "";
						}
						if (photoUrl === undefined || photoUrl === null) {
							photoUrl = "images/profile_placeholder.png";
						}

						var div ='\
							<div class="review_container">\
								<div class="fixed">\
									<img class="profile_img" src="'+photoUrl+'" />\
								</div>\
							    <div class="flex-item">\
							    	<b>'+ displayName +'</b><br>\
							    	<span>'+ date +'</span><br>\
							    	<span>'+concernn+'</span>\
							    </div>\
							</div><br>\
						';
						$('#concerns').append(div); 

					});
				}else {
					$('#concerns').append("<p>No concerns for this user.</p>");
				}
				return null;
			})
			.catch(error => console.log("Error: ", error));
	}

	function showReviews(reviewsCollection) {
		$('#reviews').empty();
		$('#reviews').append('<center><div id="loading_review" class="lottie_table"></center>');
		initbodyMovin('loading_table.json', 'loading_review');
		reviewsCollection.get()
			.then(snapshot => {
				$('#reviews').empty();
				console.log(snapshot);
				if (snapshot.empty === false) {
					$('#review_title').text("Reviews(" + snapshot.size + ")");
					snapshot.forEach(doc => {
						const review = doc.data();
						const displayName = review.displayName;
						const rating = review.rating;
						const revieww = review.review;
						const timestamp = review.timestamp.toDate();
						const date = monthNames[timestamp.getMonth()] + " " + timestamp.getDate() + ", " + timestamp.getFullYear();
						var photoUrl = review.photoUrl;
						console.log(photoUrl);
						if (photoUrl === undefined) {
							photoUrl = "images/profile_placeholder.png";
						}

						var div ='\
							<div class="review_container">\
								<div class="fixed">\
									<img class="profile_img" src="'+photoUrl+'" />\
								</div>\
							    <div class="flex-item">\
							    	<b>'+ displayName +'</b><br>\
							    	<span>'+rating+ '/5&nbsp&nbsp</span><span>'+ date +'</span><br>\
							    	<span>'+revieww+'</span>\
							    </div>\
							</div><br>\
						';
						$('#reviews').append(div); 
					});
				}else {
					$('#reviews').append("<p>No reviews for this user.</p>");
				}
				return null;
			})
			.catch(error => console.log("Error: ", error));
	}

	function generatePdf(rows) {
		var columns = ["Customer Name", "Service Name", "Request Date", "Date Completed", "Remarks"];

		// Only pt supported (not mm or in)
		var doc = new jsPDF('p', 'pt');
		doc.autoTable(columns, rows);
		doc.save('table.pdf');
	}

	function initbodyMovin(file_name_json, element_id) {
	    bodymovin.loadAnimation({
			container: $('#' + element_id)[0],
			renderer: 'svg',
			loop: true,
			autoplay: true,
			path: 'images/' + file_name_json
	    });
	}

	function printElem(content, text) {
	    // var content = document.getElementById(divId).innerHTML;
	    var mywindow = window.open('', 'One Tap Manong', 'height=600,width=800');

	    const div = '\
	    	<html>\
	    		<head>\
	    			<title>Print</title>\
	    		</head>\
	    		<body>\
	    			<center><img src="images/manong_customer_logo.png" width="120" height="120" />\
	    			<h2 class="mdc-typography--headline2">One Tap Manong Reports</h2><h3>'+text+'</h3></center>\
	    			'+ content +'\
	    		</body>\
	    	</html>\
	    ';

	    mywindow.document.write(div);

	    mywindow.document.close();
	    mywindow.focus();
	    mywindow.print();
	    mywindow.close();
	    return true;
	}

	auth.onAuthStateChanged(user => {
		if (!user) {
			window.location.href = '/';
		}else {
			messaging
                .requestPermission()
                .then(() => messaging.getToken())
                .then(token => rootRef.child('adminToken').set(token))
                .catch(err => console.log(err));
            messaging
                .onMessage(payload => {
                    const notificationTitle = payload.notification.title;
                    const notificationOptions = {
                        body: payload.notification.body,
                        icon: payload.notification.icon,        
                    };

                    if (!("Notification" in window)) {
                        console.log("This browser does not support system notifications");
                    }else if (Notification.permission === "granted") {
                        var notification = new Notification(notificationTitle,notificationOptions);
                        notification.onclick = function(event) {
                            event.preventDefault(); // prevent the browser from focusing the Notification's tab
                            window.open(payload.notification.click_action , '_blank');
                            notification.close();
                        }
                    }
                    
                    return console.log("Message received. ", payload);
                });
		}
	});
	
	var provider_table = $('#provider_table').DataTable({
        columnDefs: [
            {
                targets: [ 0, 1, 2 ],
                className: 'mdl-data-table__cell--non-numeric'
            },
            {
            	orderable: false,
            	targets: [0, 5]
            }
        ],
        aaSorting: [[1, 'asc']],
		dom: 'lBfrtip',
        buttons: [
        	{ extend: 'copy', className: 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' },
            { extend: 'excel', className: 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' },
            { extend: 'pdf', className: 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' },
            { extend: 'print', className: 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' },
            { extend: 'csv', className: 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' }
        ]
    });

    var snackbar = new MDCSnackbar($('.mdc-snackbar')[0]);
    var dialog = new MDCDialog($('#my-mdc-dialog')[0]);
    var services_dialog = new MDCDialog($('#services-mdc-dialog')[0]);
    const concerns_dialog = new MDCDialog($('#concerns-mdc-dialog')[0]);
    const review_dialog = new MDCDialog($('#review-mdc-dialog')[0]);
    var logout_dialog = new MDCDialog($('#logout-mdc-dialog')[0]);
    var filter_dialog = new MDCDialog($('#filter')[0]);

    initbodyMovin('loading_table.json', 'loading_table');

    listVerifiedProviders()
    	.then(userRecords => {
    		console.log(userRecords);
    		provider_table.row('.loading_row').remove().draw();
    		userRecords.data.forEach(userRecord => {
    			var providerId = userRecord.uid;

    			var dataset = [];
    			for(var i = 1; i <= 6; i++) {
    				var combine = i.toString() + providerId;
    				var loading_text = '<div id="loading_text_'+combine+'" class="lottie_text"></div>';
    				var loading_image = '<div id="loading_text_'+combine+'" class="lottie_image"></div>';
    				if (i === 1) {
    					dataset.push(loading_image);
    				}else {
    					dataset.push(loading_text);
    				}
    			}
    			var button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action">Loading</button>';
    			dataset.push(button);

    			provider_table.rows.add([dataset]).draw().nodes().to$().addClass('table_row ' + providerId);
    			for(var s = 1; s <= 5; s++) {
    				var combines = s.toString() + providerId;
    				if (s === 1) {
    					initbodyMovin('loading_image.json', ('loading_text_' + combines));
    				}else {
    					initbodyMovin('simple_loader.json', ('loading_text_' + combines));
    				}
    			}

    			updateTableRow(userRecord);
    			provider_table.row('.loading_row').remove().draw();
    			return new MDCRipple($('.mdc-button')[0]);

    		});
    		// componentHandler.upgradeDom();
    		return null;
    	})
    	.catch(error => console.log(error.message));

	dialog.listen('MDCDialog:accept', () => {
		var uid = $('#hidden_customer_id').val();

		var data = provider_table.row( $('.' + uid) ).data();
		var action_loading = '<div id="loading_action'+uid+'" class="lottie_action"></div>';
		var dataset = [data[0], data[1], data[2], data[3], data[4], data[5], action_loading];
		provider_table.row('.' + uid).data(dataset).draw();
		initbodyMovin('loading_action.json', ('loading_action' + uid));

		actionUser({uid: $('#hidden_customer_id').val(), isDisable: ($('#hidden_is_disable').val() === 'true')})
			.then(results => {
				var result = results.data.result;
				var userRecord = results.data.userRecord;

				if (result === true) {
					showSnackbar((userRecord.disabled ? 'Disabled' : 'Enabled') + " " + (userRecord.displayName === null ? 'Undefined' : userRecord.displayName) + " ("+userRecord.email+")");
					// Updating the current table row with new table data.
					return updateTableRow(userRecord);
				}else {
					return showSnackbar("Transaction Failed. Something went wrong...");
				}
			})
			.catch(error => {
				var message = error.message;
				showSnackbar("Error: " + message);
				return console.log("Error: ", message);
			});
	});

	logout_dialog.listen('MDCDialog:accept', () => {
		auth.signOut()
			.catch(err => showSnackbar(err.message));
	});

	$('#hahaha').click(() => {
		
		const currentDate = new Date();
		const currentTimestamp = currentDate.getTime();
		const dayMilli = 86400000;
		const weekMilli = (dayMilli * 7);
		const twelveWeekMilli = (dayMilli * (7 * 12));
		const sixMonthsMilli = (dayMilli * (7 * 24));

		const status = $('#select_status').val();
		const service = $('#select_services').val();
		const time = $('#select_time').val();
		const sort = $('#select_sort').val();
		const uid = $('#provider_id').val();

		var unit = null;
		if (time === '24hours') {
			unit = currentTimestamp - dayMilli;
		}else if (time === '7days') {
			unit = currentTimestamp - weekMilli;
		}else if (time === '12weeks') {
			unit = currentTimestamp - twelveWeekMilli;
		}else if (time === '6months') {
			unit = currentTimestamp - sixMonthsMilli;
		}

		var provider_quotes = quotes.doc(uid).collection('my_quotes');
		// status
		if (status === 'completed') {
			provider_quotes = provider_quotes.where('completed', '==', true);
		}else if (status === 'pending') {
			provider_quotes = provider_quotes.where('completed', '==', false);
		}
		// service
		if (service !== 'all_service') {
			provider_quotes = provider_quotes.where('serviceName', '==', service);
		}
		// sort
		if (sort === 'newest') {
			provider_quotes = provider_quotes.orderBy('timestamp', 'desc');
		}else {
			provider_quotes = provider_quotes.orderBy('timestamp', 'asc');
		}

		provider_quotes.get()
			.then((snapshots) => {
				if (snapshots.empty === false) {

					const arr_quotes = [];
					snapshots.forEach(snapshot => {
						const quote = snapshot.data();
						const timestamp = quote.timestamp.toMillis();

						if (unit !== null) {
							if (timestamp > unit) {
								arr_quotes.push(quote);
							}else {
								console.log('skip');
							}
						}else {
							arr_quotes.push(quote);
						}	
					});

					var trs = '';
					arr_quotes.forEach(quote => {
						const customerName = quote.customerName;
						const estimatedTime = quote.estimatedTime;
						const serviceName = quote.serviceName;
						const requestDate = quote.requestDate;
						const completed = quote.completed;
						const min = quote.maxAmount;
						const max = quote.minAmount;

						trs += '<tr>\
									<td>'+customerName+'</td>\
									<td>'+estimatedTime+'</td>\
									<td>'+serviceName+'</td>\
									<td>'+requestDate+'</td>\
									<td>'+(min + " - " + max)+'</td>\
									<td>'+completed+'</td>\
								</tr>';
					});

					var table = '\
						<table>\
							<thead>\
								<th>Customer Name</th>\
								<th>Estimated Time</th>\
								<th>Service</th>\
								<th>Request Date</th>\
								<th>Amount</th>\
								<th>Completed</th>\
							</thead>\
							<tbody>\
								'+trs+'\
							</tbody>\
						</table\
					';

					return printElem(table);

				}else {
					return console.log("No quotes for this provider.");
				}
			})
			.catch(error => console.log(error));


		filter_dialog.close();
	});

	$('body').on('click', '.action', (e) => {
		$('#my-mdc-dialog-label').text(($(e.currentTarget).attr("isDisable") === "false" ? 'Disable' : 'Enable') + " Account");
		$('#my-mdc-dialog-description').html("Are you sure to " + ($(e.currentTarget).attr("isDisable") === "false" ? 'disable' : 'enable') + " <strong>" + $(e.currentTarget).attr('name') + "</strong>? " + ($(e.currentTarget).attr("isDisable") === "false" ? "Users with disabled account arent't able to sign in." : '')); 
		$('#hidden_customer_id').val($(e.currentTarget).attr('id'));
		$('#hidden_is_disable').val(($(e.currentTarget).attr("isDisable") === "false" ? true : false));
		dialog.lastFocusedTarget = e.target;
		dialog.show();
	});

	$('#logout').click((e) => {
		logout_dialog.lastFocusedTarget = e.target;
		logout_dialog.show();
	});

	$('body').on('click', '.services', (e) => {
		const services = $(e.currentTarget).attr('services') || "No service yet.";
		$('#services').text(services);
		services_dialog.lastFocusedTarget = e.target;
		services_dialog.show();

	});
	
	$('body').on('click', '.concerns', (e) => {
		const uid = $(e.currentTarget).attr('id');
		const concerns = users.doc(uid).collection('concerns').orderBy("timestamp", "desc");
		showConcerns(concerns);
		concerns_dialog.lastFocusedTarget = e.target;
		concerns_dialog.show();
	});

	$('body').on('click', '.review', (e) => {
		const uid = $(e.currentTarget).attr('id');
		const ratings = users.doc(uid).collection('ratings').orderBy("timestamp", "desc");
		showReviews(ratings);
		review_dialog.lastFocusedTarget = e.target;
		review_dialog.show();
	});

	$('body').on('click', '.image', (e) => {
		$('#myModal').css("display", "block");
		var src = $(e.currentTarget).attr("src");
		var name = $(e.currentTarget).attr("name");
		$('#img01').attr("src", src);
		$('#caption').text(name);
	});

	$('#close_haha').click(() => {
		$('#myModal').css("display", "none");
	});

	$('#myModal').click(() => {
		$('#myModal').css("display", "none");
	});

	$('body').on('click', '.filter_report', e => {
		const strServices = $(e.currentTarget).attr('services');
		const services = strServices.split(",");
		const uid = $(e.currentTarget).attr('id');

		$('#provider_id').val(uid);
		$('#select_services').empty();
		if (services.length > 0) {
			$("#select_services").append('<option value="all_service">All Service</option>');
			services.forEach(service => {
				$("#select_services").append('<option value="'+service+'">'+ service +'</option>');
			});
		}else {
			$("#select_services").append('<option value="no_service">No Service</option>');
		}

		filter_dialog.lastFocusedTarget = e.target;
		filter_dialog.show();
	});

	filter_dialog.listen('MDCDialog:accept', () => {
		const currentDate = new Date();
		const currentTimestamp = currentDate.getTime();
		const dayMilli = 86400000;
		const weekMilli = (dayMilli * 7);
		const twelveWeekMilli = (dayMilli * (7 * 12));
		const sixMonthsMilli = (dayMilli * (7 * 24));

		const status = $('#select_status').val();
		const service = $('#select_services').val();
		const time = $('#select_time').val();
		const sort = $('#select_sort').val();
		const uid = $('#provider_id').val();

		var sort_text = '';

		var unit = null;

		var provider_quotes = quotes.doc(uid).collection('my_quotes');
		// status
		if (status === 'completed') {
			sort_text += 'Completed ';
			provider_quotes = provider_quotes.where('completed', '==', true);
		}else if (status === 'pending') {
			sort_text += 'Pending ';
			provider_quotes = provider_quotes.where('completed', '==', false);
		}
		// service
		if (service !== 'all_service') {
			sort_text += service.charAt(0).toUpperCase() + ' ';
			provider_quotes = provider_quotes.where('serviceName', '==', service);
		}else {
			sort_text += " Quotes ";
		}

		if (sort_text.trim() === 'Quotes') {
			sort_text = "All Quotes ";
		}
		// date
		if (time === '24hours') {
			sort_text += 'within last 24 hours';
			unit = currentTimestamp - dayMilli;
		}else if (time === '7days') {
			sort_text += 'within last 7 days';
			unit = currentTimestamp - weekMilli;
		}else if (time === '12weeks') {
			sort_text += 'within last 12 weeks';
			unit = currentTimestamp - twelveWeekMilli;
		}else if (time === '6months') {
			sort_text += 'within last 6 months';
			unit = currentTimestamp - sixMonthsMilli;
		}
		// sort
		if (sort === 'newest') {
			sort_text += '\nsorted by new quotes';
			provider_quotes = provider_quotes.orderBy('timestamp', 'desc');
		}else {
			sort_text += '\nsorted by oldest quotes';
			provider_quotes = provider_quotes.orderBy('timestamp', 'asc');
		}

		provider_quotes.get()
			.then((snapshots) => {
				if (snapshots.empty === false) {

					const arr_quotes = [];
					snapshots.forEach(snapshot => {
						const quote = snapshot.data();
						const timestamp = quote.timestamp.toMillis();

						if (unit !== null) {
							if (timestamp > unit) {
								arr_quotes.push(quote);
							}else {
								console.log('skip');
							}
						}else {
							arr_quotes.push(quote);
						}	
					});

					const rows = [];
					arr_quotes.forEach(quote => {
						const customerName = quote.customerName;
						const estimatedTime = quote.estimatedTime;
						const serviceName = quote.serviceName;
						const requestDate = quote.requestDate;
						const completed = quote.completed;
						const min = quote.minAmount;
						const max = quote.maxAmount;
						const date = quote.timestamp.toDate();

						var finalDate = '';
						var finalCompleted = 'Not complete';
						if (completed === true) {
							finalDate = date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();
							finalCompleted = 'Completed';
						}

						const amount = min + " - " + max;

						const row = [customerName, serviceName, requestDate, finalDate, finalCompleted];
						rows.push(row);
					});

					
					return generatePdf(rows);

				}else {
					alert("No quotes for this provider."); //eslint-disable-line no-alert
					return null;
				}
			})
			.catch(error => console.log(error));
	});

	/*var filter_dialog;
	try {
		filter_dialog = new MDCDialog($('#filter')[0]);
		filter_dialog.listen('MDCDialog:accept', () => {
			const currentDate = new Date();
			const currentTimestamp = currentDate.getTime();
			const dayMilli = 86400000;
			const weekMilli = (dayMilli * 7);
			const twelveWeekMilli = (dayMilli * (7 * 12));
			const sixMonthsMilli = (dayMilli * (7 * 24));

			const status = $('#select_status').val();
			const service = $('#select_services').val();
			const time = $('#select_time').val();
			const sort = $('#select_sort').val();
			const uid = $('#provider_id').val();

			var sort_text = '';

			var unit = null;

			var provider_quotes = quotes.doc(uid).collection('my_quotes');
			// status
			if (status === 'completed') {
				sort_text += 'Completed ';
				provider_quotes = provider_quotes.where('completed', '==', true);
			}else if (status === 'pending') {
				sort_text += 'Pending ';
				provider_quotes = provider_quotes.where('completed', '==', false);
			}
			// service
			if (service !== 'all_service') {
				sort_text += service.charAt(0).toUpperCase() + ' ';
				provider_quotes = provider_quotes.where('serviceName', '==', service);
			}else {
				sort_text += " Quotes ";
			}

			if (sort_text.trim() === 'Quotes') {
				sort_text = "All Quotes ";
			}
			// date
			if (time === '24hours') {
				sort_text += 'within last 24 hours';
				unit = currentTimestamp - dayMilli;
			}else if (time === '7days') {
				sort_text += 'within last 7 days';
				unit = currentTimestamp - weekMilli;
			}else if (time === '12weeks') {
				sort_text += 'within last 12 weeks';
				unit = currentTimestamp - twelveWeekMilli;
			}else if (time === '6months') {
				sort_text += 'within last 6 months';
				unit = currentTimestamp - sixMonthsMilli;
			}
			// sort
			if (sort === 'newest') {
				sort_text += '\nsorted by new quotes';
				provider_quotes = provider_quotes.orderBy('timestamp', 'desc');
			}else {
				sort_text += '\nsorted by oldest quotes';
				provider_quotes = provider_quotes.orderBy('timestamp', 'asc');
			}

			provider_quotes.get()
				.then((snapshots) => {
					if (snapshots.empty === false) {

						const arr_quotes = [];
						snapshots.forEach(snapshot => {
							const quote = snapshot.data();
							const timestamp = quote.timestamp.toMillis();

							if (unit !== null) {
								if (timestamp > unit) {
									arr_quotes.push(quote);
								}else {
									console.log('skip');
								}
							}else {
								arr_quotes.push(quote);
							}	
						});

						const rows = [];
						arr_quotes.forEach(quote => {
							const customerName = quote.customerName;
							const estimatedTime = quote.estimatedTime;
							const serviceName = quote.serviceName;
							const requestDate = quote.requestDate;
							const completed = quote.completed;
							const min = quote.minAmount;
							const max = quote.maxAmount;
							const date = quote.timestamp.toDate();

							var finalDate = '';
							var finalCompleted = 'Not complete';
							if (completed === true) {
								finalDate = date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();
								finalCompleted = 'Completed';
							}

							const amount = min + " - " + max;

							const row = [customerName, serviceName, requestDate, finalDate, finalCompleted];
							rows.push(row);
						});

						
						return generatePdf(rows);

					}else {
						return alert("No quotes for this provider.");
					}
				})
				.catch(error => console.log(error));
		});
	}catch(err) {
		filter_dialog = new MDCDialog($('#filter')[0]);
		filter_dialog.listen('MDCDialog:accept', () => {
			const currentDate = new Date();
			const currentTimestamp = currentDate.getTime();
			const dayMilli = 86400000;
			const weekMilli = (dayMilli * 7);
			const twelveWeekMilli = (dayMilli * (7 * 12));
			const sixMonthsMilli = (dayMilli * (7 * 24));

			const status = $('#select_status').val();
			const service = $('#select_services').val();
			const time = $('#select_time').val();
			const sort = $('#select_sort').val();
			const uid = $('#provider_id').val();

			var sort_text = '';

			var unit = null;

			var provider_quotes = quotes.doc(uid).collection('my_quotes');
			// status
			if (status === 'completed') {
				sort_text += 'Completed ';
				provider_quotes = provider_quotes.where('completed', '==', true);
			}else if (status === 'pending') {
				sort_text += 'Pending ';
				provider_quotes = provider_quotes.where('completed', '==', false);
			}
			// service
			if (service !== 'all_service') {
				sort_text += service.charAt(0).toUpperCase() + ' ';
				provider_quotes = provider_quotes.where('serviceName', '==', service);
			}else {
				sort_text += " Quotes ";
			}

			if (sort_text.trim() === 'Quotes') {
				sort_text = "All Quotes ";
			}
			// date
			if (time === '24hours') {
				sort_text += 'within last 24 hours';
				unit = currentTimestamp - dayMilli;
			}else if (time === '7days') {
				sort_text += 'within last 7 days';
				unit = currentTimestamp - weekMilli;
			}else if (time === '12weeks') {
				sort_text += 'within last 12 weeks';
				unit = currentTimestamp - twelveWeekMilli;
			}else if (time === '6months') {
				sort_text += 'within last 6 months';
				unit = currentTimestamp - sixMonthsMilli;
			}
			// sort
			if (sort === 'newest') {
				sort_text += '\nsorted by new quotes';
				provider_quotes = provider_quotes.orderBy('timestamp', 'desc');
			}else {
				sort_text += '\nsorted by oldest quotes';
				provider_quotes = provider_quotes.orderBy('timestamp', 'asc');
			}

			provider_quotes.get()
				.then((snapshots) => {
					if (snapshots.empty === false) {

						const arr_quotes = [];
						snapshots.forEach(snapshot => {
							const quote = snapshot.data();
							const timestamp = quote.timestamp.toMillis();

							if (unit !== null) {
								if (timestamp > unit) {
									arr_quotes.push(quote);
								}else {
									console.log('skip');
								}
							}else {
								arr_quotes.push(quote);
							}	
						});

						const rows = [];
						arr_quotes.forEach(quote => {
							const customerName = quote.customerName;
							const estimatedTime = quote.estimatedTime;
							const serviceName = quote.serviceName;
							const requestDate = quote.requestDate;
							const completed = quote.completed;
							const min = quote.minAmount;
							const max = quote.maxAmount;
							const date = quote.timestamp.toDate();

							var finalDate = '';
							var finalCompleted = 'Not complete';
							if (completed === true) {
								finalDate = date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();
								finalCompleted = 'Completed';
							}

							const amount = min + " - " + max;

							const row = [customerName, serviceName, requestDate, finalDate, finalCompleted];
							rows.push(row);
						});

						
						return generatePdf(rows);

					}else {
						return alert("No quotes for this provider.");
					}
				})
				.catch(error => console.log(error));
		});
	}*/
	
});