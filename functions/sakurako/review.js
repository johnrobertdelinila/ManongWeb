import $ from 'jquery';
import dt from 'datatables.net';
import buttons from 'datatables.net-buttons';
import fucker from 'datatables.net/js/dataTables.material.min.js';
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
	var users;

	try {
		functions = firebase.functions();
		database = firebase.database();
		auth = firebase.auth();
		messaging = firebase.messaging();

		firestore = firebase.firestore();
		const settings = {timestampsInSnapshots: true};
		firestore.settings(settings);
		users = firestore.collection('users');
	}catch(err) {
		setTimeout(() => {
		    location.reload();
		}, 1000);
	}

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
						
						if (photoUrl === null || photoUrl === "null") {
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
				if (snapshot.empty === false) {
					$('#review_title').text("Reviews(" + snapshot.size + ")");
					snapshot.forEach(doc => {
						const review = doc.data();
						const displayName = review.displayName || null;
						const rating = review.rating;
						const revieww = review.review;
						const timestamp = review.timestamp.toDate();
						const date = monthNames[timestamp.getMonth()] + " " + timestamp.getDate() + ", " + timestamp.getFullYear();
						var photoUrl = review.photoUrl || null;
						
						if (photoUrl === null) {
							photoUrl = "images/profile_placeholder.png";
						}

						var div ='\
							<div class="review_container">\
								<div class="fixed">\
									<img class="profile_img" src="'+photoUrl+'" />\
								</div>\
							    <div class="flex-item" style="margin-left: 15px;">\
							    	<b>'+ displayName +'</b><br>\
							    	<span>'+rating+ '/5&nbsp&nbsp</span><span>'+ date +'</span><br>\
							    	<span>'+revieww+'</span>\
							    </div>\
							</div><br>\
						';
						$('#reviews').append(div); 
					});
				}else {
					$('#reviews').append("<p>No reviews for yet.</p>");
				}
				return null;
			})
			.catch(error => console.log("Error: ", error));
	}

	const ratings = firestore.collection('ratings');
	showReviews(ratings);

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
	var customerRef = rootRef.child("Customers");
	var getUserRecord = functions.httpsCallable('getUserRecord');
	var actionUser = functions.httpsCallable('actionUser');
	var listAllCustomers = functions.httpsCallable('listAllCustomers');

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

		var data = customer_table.row( $('.' + uid) ).data();
		var action_loading = '<div id="loading_action'+uid+'" class="lottie_action"></div>';
		var dataset = [data[0], data[1], data[2], data[3], data[4], action_loading];
		customer_table.row('.' + uid).data(dataset).draw();
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

	var logout_dialog = new MDCDialog($('#logout-mdc-dialog')[0]);
	const concerns_dialog = new MDCDialog($('#concerns-mdc-dialog')[0]);
	const review_dialog = new MDCDialog($('#review-mdc-dialog')[0]);

	logout_dialog.listen('MDCDialog:accept', () => {
		auth.signOut()
			.catch(err => showSnackbar(err.message));
	});

	/*listAllCustomers()
		.then(userRecords => {
			customer_table.row('.loading_row').remove().draw();
			console.log(userRecords);
			return userRecords.data.forEach(userRecord => {
				var customerId = userRecord.uid;
				var dataset = [];
				for(var i = 1; i <= 6; i++) {
					var combine = i.toString() + customerId;
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

				customer_table.rows.add([dataset]).draw().nodes().to$().addClass('table_row ' + customerId);
				for(var s = 1; s <= 5; s++) {
					var combines = s.toString() + customerId;
					if (s === 1) {
						initbodyMovin('loading_image.json', ('loading_text_' + combines));
					}else {
						initbodyMovin('simple_loader.json', ('loading_text_' + combines));
					}
				}

				updateTableRow(userRecord);
				customer_table.row('.loading_row').remove().draw();
				return new MDCRipple($('.mdc-button')[0]);

			});
		})
		.catch(error => console.log(error.message));*/

	$('body').on('click', '.action', (e) => {
		$('#my-mdc-dialog-label').text(($(e.currentTarget).attr("isDisable") === "false" ? 'Disable' : 'Enable') + " Account");
		$('#my-mdc-dialog-description').html("Are you sure to " + ($(e.currentTarget).attr("isDisable") === "false" ? 'disable' : 'enable') + " <strong>" + $(e.currentTarget).attr('name') + "</strong>? " + ($(e.currentTarget).attr("isDisable") === "false" ? "Users with disabled account arent't able to sign in." : '')); 
		$('#hidden_customer_id').val($(e.currentTarget).attr('id'));
		$('#hidden_is_disable').val(($(e.currentTarget).attr("isDisable") === "false" ? true : false));
		dialog.lastFocusedTarget = e.target;
		dialog.show();
	});

	function updateTableRow(userRecord) {
		var image;
		if (userRecord.photoURL !== null) {
			var subImage;
			if (userRecord.photoURL.match("^https://graph.facebook.com")) {
				subImage = userRecord.photoURL + "?height=400";
			}else if (userRecord.photoURL.match("^https://pbs.twimg.com")) {
				subImage = userRecord.photoURL.replace("_normal", "").trim();
			}else if (userRecord.photoURL.match("^https://lh5.googleusercontent.com")) {
				subImage = userRecord.photoURL.replace("s96-c", "s400-c").trim();
			}else {
				subImage = userRecord.photoURL;
			}
			image = '<img class="image" name="'+userRecord.displayName+'" src="'+ subImage +'" width="70" height="70" />';			
		}else {
			image = '<img name="'+userRecord.displayName+'" src="images/no_image.jpg" width="70" height="70" />';
		}
		var viewIcons = '<i class="material-icons concerns" id="'+userRecord.uid+'">assignment_late</i><i class="material-icons review" id="'+userRecord.uid+'">rate_review</i>';
		var mdc_button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action" id="'+userRecord.uid+'" name="'+ (userRecord.displayName || 'Undefined') +'" isDisable="'+userRecord.disabled+'">'+ (userRecord.disabled ? 'ENABLE' : 'DISABLE') +'</button>';
		var dataset = [image, userRecord.displayName || 'Undefined', userRecord.email, userRecord.customClaims.rating, userRecord.customClaims.cancelled, viewIcons, mdc_button];
		customer_table.row('.' + userRecord.uid).data(dataset).draw();
	}

	/*userRecord.metadata.creationTime.slice(0, -3)
	userRecord.metadata.lastSignInTime.slice(0, -3) || 'Not signed yet'*/

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

	function showSnackbar(message) {
		dataObj.message = message;
		snackbar.show(dataObj);
	}

	$('#logout').click((e) => {
		logout_dialog.lastFocusedTarget = e.target;
		logout_dialog.show();
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