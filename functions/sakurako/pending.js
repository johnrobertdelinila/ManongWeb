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
	var listUnverifiedProviders = functions.httpsCallable('listUnverifiedProviders');
	var verifiyServiceProvider = functions.httpsCallable('verifiyServiceProvider');
	const rejectServiceProvider = functions.httpsCallable('rejectServiceProvider');
	
	var provider_table = $('#provider_table').DataTable({
        columnDefs: [
            {
                targets: [ 0, 1, 2 ],
                className: 'mdl-data-table__cell--non-numeric'
            }
        ],
        aaSorting: [[0, 'asc']],
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

		var data = provider_table.row( $('.' + uid) ).data();
		var action_loading = '<div id="loading_action'+uid+'" class="lottie_action"></div>';
		var dataset = [data[0], data[1], data[2], data[3], data[4], action_loading];
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
	var logout_dialog = new MDCDialog($('#logout-mdc-dialog')[0]);
	logout_dialog.listen('MDCDialog:accept', () => {
		auth.signOut()
			.catch(err => showSnackbar(err.message));
	});
	var credential_dialog = new MDCDialog($('#credential-mdc-dialog')[0]);
	credential_dialog.listen('MDCDialog:accept', () => {
		if (confirm("Are you sure to verify this service provider?")) { //eslint-disable-line no-alert

			var uid = $('#uid').val();

			var data = provider_table.row( $('.' + uid) ).data();
			var action_loading = '<div id="loading_action'+uid+'" class="lottie_action"></div>';
			var dataset = [data[0], data[1], data[2], data[3], action_loading];
			provider_table.row('.' + uid).data(dataset).draw();
			initbodyMovin('loading_action.json', ('loading_action' + uid));

			var datas = {
				uid: uid,
				email: $('#email').val(),
				displayName: $('#displayName').val()
			};
			verifiyServiceProvider(datas)
				.then(result => {
					alert("Service provider successfully verified."); //eslint-disable-line no-alert
					provider_table.row('.' + uid).remove().draw();
					return null;
				})
				.catch(error => alert("Error: " + error)); //eslint-disable-line no-alert
		} 
	});
	$('.mdc-dialog__footer__button--reject').click(() => {
		if (confirm("Are you sure to reject this service provider?")) { //eslint-disable-line no-alert

			var uid = $('#uid').val();

			var data = provider_table.row( $('.' + uid) ).data();
			var action_loading = '<div id="loading_action'+uid+'" class="lottie_action"></div>';
			var dataset = [data[0], data[1], data[2], data[3], action_loading];
			provider_table.row('.' + uid).data(dataset).draw();
			initbodyMovin('loading_action.json', ('loading_action' + uid));

			var datas = {
				uid: uid,
				email: $('#email').val(),
				displayName: $('#displayName').val()
			};
			rejectServiceProvider(datas)
				.then(result => {
					alert("Service provider successfully rejected."); //eslint-disable-line no-alert
					provider_table.row('.' + uid).remove().draw();
					return null;
				})
				.catch(error => alert("Error: " + error)); //eslint-disable-line no-alert
		}
		credential_dialog.close();
	});

	listUnverifiedProviders()
		.then(userRecords => {
			provider_table.row('.loading_row').remove().draw();
			userRecords.data.forEach(userRecord => {
				console.log(userRecord);
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
				var button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action" id="'+userRecord.uid+'">Loading</button>';
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

		const uid = $(e.currentTarget).attr('id');

		$('#uid').val(uid);
		$('#displayName').val($(e.currentTarget).attr('displayName'));

		$('#email').val($(e.currentTarget).attr('email'));

		$('#credential0').attr('src', 'https://www.google.com/images/spin-32.gif');
		$('#credential1').attr('src', 'https://www.google.com/images/spin-32.gif');
		$('#credential2').attr('src', 'https://www.google.com/images/spin-32.gif');
		
		users.doc(uid).get()
			.then(doc => {
				const credentials = doc.data().credentials;
				$('#credential0').attr('src', credentials.credential0);
				$('#credential1').attr('src', credentials.credential1);
				$('#credential2').attr('src', credentials.credential2);
				return null;
			})
			.catch(error => console.log("error: ", error));

		credential_dialog.lastFocusedTarget = e.target;
		credential_dialog.show();
	});

	function updateTableRow(userRecord) {
		var image;
		if (userRecord.photoURL !== null) {
			image = '<img class="image" name="'+userRecord.displayName+'" src="'+ (userRecord.photoURL.match("^https://graph.facebook.com") ? userRecord.photoURL + "?height=400" : userRecord.photoURL) +'" width="100" height="100" />';			
		}else {
			image = '<img name="'+userRecord.displayName+'" src="images/no_image.jpg" width="100" height="100" />';
		}
		
		var mdc_button = '<button class="mdc-button mdc-button--outlined mdc-button--dense action" displayName="'+userRecord.displayName+'" email="'+userRecord.email+'" services="'+userRecord.customClaims.services+'" id="'+userRecord.uid+'" name="'+ (userRecord.displayName || 'Undefined') +'" isDisable="'+userRecord.disabled+'">CREDENTIALS</button>';
		var dataset = [userRecord.displayName || 'Undefined', userRecord.email, userRecord.metadata.creationTime.slice(0, -3), userRecord.phoneNumber || 'Not signed yet', mdc_button];
		provider_table.row('.' + userRecord.uid).data(dataset).draw();
	}


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
		credential_dialog.close();
	});

	$('#close_haha').click(() => {
		$('#myModal').css("display", "none");
		credential_dialog.show();
	});

	$('#myModal').click(() => {
		$('#myModal').css("display", "none");
		credential_dialog.show();
	});

});