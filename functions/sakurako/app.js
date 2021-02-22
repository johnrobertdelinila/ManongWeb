// FUCKING IMPORTS
import {MDCTextField} from '@material/textfield';
import {MDCRipple} from '@material/ripple';
import iyottayo from 'material-design-lite';
import {MDCSnackbar} from '@material/snackbar';
import $ from 'jquery';

$(document).ready(() => {

	var mAuth;
	try {
		// init firebase variables
		mAuth = firebase.auth();
	}catch(err) {
		setTimeout(() => {
			location.reload();
		}, 1000);
	}

	var snackbar = null;
	var  dataObj = null;

	init();
	values();

	// Check user
	firebase.auth().onAuthStateChanged(user => {
		if (user) {
			console.log("USER");
			confirmAdmin(user);
		}else {
			console.log("NO USER");
		}
	});

	$('body').on('submit', '#login_form', (e) => {
		e.preventDefault();

		$('#progress_bar').css('visibility', 'visible');
		$('#spinner').show();
		$('.my-shape-container').hide();

		const username = $('#username-input').val().trim();
		const password = $('#password-input').val().trim();

		mAuth.signInWithEmailAndPassword(username, password)
			.catch(err => {
				console.log("ERROR");
				dataObj.message = err.message;
				snackbar.show(dataObj);
				$('#progress_bar').css('visibility', 'hidden');
				$('#spinner').hide();
				$('.my-shape-container').show();
			});

	});


	function init() {
		new MDCTextField($('.username')[0]);
		new MDCTextField($('.password')[0]);
		new MDCRipple($('.mdc-button')[0]);
		snackbar = new MDCSnackbar($('.mdc-snackbar')[0]);
	}

	function values() {
		dataObj = {
			message: "Hello world",
			actionText: null,
			timeout: 3500,
			multiline: true
		};
	}

	function confirmAdmin(user) {
		user.getIdTokenResult()
			.then(idTokenResult => {
				if (idTokenResult.claims.admin) {
					var result = 'done';
					return result;
				}else {
					return mAuth.signOut();
				}
			})
			.then((result) => {

				if (result !== null && result.trim() === "done") {
					return window.location.href = '/home';
				}else {
					$('#progress_bar').css('visibility', 'hidden');
					$('#spinner').hide();
					$('.my-shape-container').show();
					dataObj.message = "The password is invalid or the user does not have a password.";
					snackbar.show(dataObj);
					return console.log("NOT ADMIN. SIGN OUT");
				}
				
			})
			.catch(err => {
				dataObj.message = err.message;
				snackbar.show(dataObj);
				$('#progress_bar').css('visibility', 'hidden');
				$('#spinner').hide();
				$('.my-shape-container').show();
				return console.log(err.message);
			});
	}

});