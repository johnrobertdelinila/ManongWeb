import $ from 'jquery';
// DataTabble
import fucker from 'datatables.net/js/dataTables.material.min.js';
import dt from 'datatables.net';
import buttons from 'datatables.net-buttons';

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

$(document).ready(() => {

	var functions;
	var database;
	var auth;
	var messaging;

	var firestore;
	var settings;
	var users;
	var requests;

	try {
		functions = firebase.functions();
		database = firebase.database();
		auth = firebase.auth();
		messaging = firebase.messaging();

		firestore = firebase.firestore();
		settings = {timestampsInSnapshots: true};
		firestore.settings(settings);
		users = firestore.collection('users');
		requests = firestore.collection('requests');
	}catch(err) {
		setTimeout(() => {
			location.reload();
		}, 1000);
	}

	firestore.collection('remit').doc('remit_id')
		.onSnapshot(doc => {
			if (!doc.exists) {
				$('#profit').text("Profit: ₱0");
			}else {
				const totalRemit = doc.data().value;
				$('#profit').text("Profit: ₱" + totalRemit);
				console.log(totalRemit);
			}
			
		});

	const monthNames = ["January", "February", "March", "April", "May", "June",
	  "July", "August", "September", "October", "November", "December"
	];

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

	function fetchNumOfCompletedJobs(requestsCollection, uid) {
		requestsCollection.get()
			.then(snapshot => {
				var count = 0;
				if (snapshot.empty === false) {
					count = snapshot.size;
				}
				$('#' + uid).text(count);
				return null;
			})
			.catch(error => console.log("Error: ", error));
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

	var rootRef = database.ref();
	var providerRef = rootRef.child("Providers");
	var getUserRecord = functions.httpsCallable('getUserRecord');
	var actionUser = functions.httpsCallable('actionUser');
	var listVerifiedProviders = functions.httpsCallable('listVerifiedProviders');
	
	var provider_table = $('#provider_table').DataTable({
        columnDefs: [
            {
                targets: [ 0, 1, 2 ],
                className: 'mdl-data-table__cell--non-numeric'
            },
            {
            	orderable: false,
            	targets: [0]
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
    initbodyMovin('loading_table.json', 'loading_table');

	var snackbar = new MDCSnackbar($('.mdc-snackbar')[0]);
	var dataObj = {
			message: "Hello world",
			actionText: null,
			timeout: 3500,
			multiline: true
		};
	var dialog = new MDCDialog($('#my-mdc-dialog')[0]);
	dialog.listen('MDCDialog:accept', () => {
		var uid = $('#hidden_customer_id').val();
		const remitValue = Number($('#remitValue').val());

		const totalRemitRef = firestore.collection('remit').doc('remit_id');

		return firestore.runTransaction(transaction => {
			return transaction.get(totalRemitRef).then(doc => {
				if (!doc.exists) {
					transaction.set(totalRemitRef, {value: remitValue});
				}else {
					var newTotal = doc.data().value + remitValue;
					transaction.update(totalRemitRef, {value: newTotal});
				}
				return null;
			});
		}).then(() => {
			return alert("Done successfully")  //eslint-disable-line no-alert
		})
		.catch(error => console.log("error: ", error));
	});
	var logout_dialog = new MDCDialog($('#logout-mdc-dialog')[0]);
	logout_dialog.listen('MDCDialog:accept', () => {
		auth.signOut()
			.catch(err => showSnackbar(err.message));
	});

	var services_dialog = new MDCDialog($('#services-mdc-dialog')[0]);
	const concerns_dialog = new MDCDialog($('#concerns-mdc-dialog')[0]);
	const review_dialog = new MDCDialog($('#review-mdc-dialog')[0]);

	listVerifiedProviders()
		.then(userRecords => {
			console.log(userRecords);
			provider_table.row('.loading_row').remove().draw();
			userRecords.data.forEach(userRecord => {
				var providerId = userRecord.uid;

				var dataset = [];
				for(var i = 1; i <= 5; i++) {
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
			return componentHandler.upgradeDom();
		})
		.catch(error => console.log(error.message));

	$('body').on('click', '.action', (e) => {
		const name = $(e.currentTarget).attr('name');
		$('#my-mdc-dialog-label').text("Payment of " + name);
		const uid = $(e.currentTarget).attr('id');
		const currentRemit = $('#' + uid).text();
		if (isNaN(currentRemit)) {
			return false;
		}
		$('#remitValue').val(currentRemit * 40);
		$('#my-mdc-dialog-description').html("The booking fee per quote is ₱40<br>The current payment of " + name + " is ₱" + (currentRemit * 40) + " (40 * "+ currentRemit +")"); 
		$('#hidden_customer_id').val(uid);
		$('#hidden_is_disable').val(($(e.currentTarget).attr("isDisable") === "false" ? true : false));
		dialog.lastFocusedTarget = e.target;
		dialog.show();
		return null;
	});

	function updateTableRow(userRecord) {
		var image;
		if (userRecord.photoURL !== null) {
			image = '<img class="image profile_img" name="'+userRecord.displayName+'" src="'+ (userRecord.photoURL.match("^https://graph.facebook.com") ? userRecord.photoURL + "?height=400" : userRecord.photoURL) +'" width="70" height="70" />';			
		}else {
			image = '<img class="profile_img" name="'+userRecord.displayName+'" src="images/no_image.jpg" width="70" height="70" />';
		}
		const completedRequests = requests.where('booked.uid', '==', userRecord.uid).where('status', '==', 'completed');
		var mdc_button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action" id="'+userRecord.uid+'" name="'+ (userRecord.displayName || 'Undefined') +'" isDisable="'+userRecord.disabled+'">PAYMENT</button>';
		var dataset = [image, userRecord.displayName || 'Undefined', userRecord.email, ((userRecord.customClaims.rating || 'No rating yet')), '<div id="'+userRecord.uid+'">fetching...</div>', mdc_button];
		provider_table.row('.' + userRecord.uid).data(dataset).draw();
		fetchNumOfCompletedJobs(completedRequests, userRecord.uid);
	}


	function showSnackbar(message) {
		dataObj.message = message;
		snackbar.show(dataObj);
	}

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

	function initbodyMovin(file_name_json, element_id) {
	    bodymovin.loadAnimation({
			container: $('#' + element_id)[0],
			renderer: 'svg',
			loop: true,
			autoplay: true,
			path: 'images/' + file_name_json
	    });
	}

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

});