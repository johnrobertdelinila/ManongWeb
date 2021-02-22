const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const engines = require('consolidate');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const serviceAccount = './one-tap-manong-ec225-firebase-adminsdk-s9mzb-e5f998ab14.json';
var defaultApp = admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://one-tap-manong-ec225.firebaseio.com",
	storageBucket: "one-tap-manong-ec225.appspot.com"
});

const settings = {timestampsInSnapshots: true};

const app = express();
app.engine('hbs', engines.handlebars);
app.set('view engine', 'hbs');
app.set('views', './views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

var mAuth = defaultApp.auth();
var mDatabase = defaultApp.database();
var mMessaging = defaultApp.messaging();
var mDb = defaultApp.firestore();

mAuth = admin.auth();
mDatabase = admin.database();
mMessaging = admin.messaging();
mDb = admin.firestore();

mDb.settings(settings);

// 1. https://www.google.com/settings/security/lesssecureapps
// 2. https://accounts.google.com/DisplayUnlockCaptcha
const mailTransport = nodemailer.createTransport({
	service: 'gmail',
		auth: {
			user: 'johnrobert.delinila@lorma.edu',
			pass: 'stevenpauljobswilliamhenrygates3'
	}
});
const APP_NAME = 'One Tap Manong';

// HTTP GET REQUEST
app.get('/', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('index.hbs');
	setCustomClaimsAdmin();
	console.log("Rendering Index HBS");
});

app.get('/home', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('home.hbs');
	console.log("Rendering Home HBS");
});

app.get('/customer', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('customer.hbs');
	console.log("Rendering Customer Page");

});

app.get('/provider', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('provider.hbs');
	console.log("Rendering Customer Page");
});

app.get('/pending', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('pending.hbs');
	console.log("Rendering Customer Page");
}); 

app.get('/earning', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('remit.hbs');
	console.log("Rendering Customer Page");
}); 

app.get('/review', (req, res) => {
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	res.render('review.hbs');
	console.log("Rendering Customer Page");
}); 


// REQUEST FUNCTIONS
exports.app = functions.https.onRequest(app);

// CALLABLE FUNCTIONS
exports.listAllUsers = functions.https.onCall((data, context) => {

	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			return {
				users: listUsersResult.users
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});
});
exports.getNumberOfServices = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			var plumbing_repair = 0;
			var laundry = 0;
			var appliance_repair = 0;
			var electrical_wiring = 0;
			var household_cleaning = 0;
			var painting = 0;

			listUsersResult.users.forEach(userRecord => {
				if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.provider !== null 
					&& userRecord.customClaims.provider === true && userRecord.customClaims.verified !== null && userRecord.customClaims.verified === true
					&& userRecord.customClaims.services !== null) {

					var services = userRecord.customClaims.services;

					if (services !== null || services !== undefined) {
						services.forEach(service => {
							if (service === "Plumbing Repair") {
								plumbing_repair++;
							}else if (service === "Laundry") {
								laundry++;
							}else if (service === "Appliance Repair") {
								appliance_repair++;
							}else if (service === "Electrical Wiring") {
								electrical_wiring++;
							}else if (service === "Household Cleaning") {
								household_cleaning++;
							}else if (service === "Painting") {
								painting++;
							}
						});
					}
				}
			});

			var data = {
				plumbing_repair: plumbing_repair,
				laundry: laundry,
				appliance_repair: appliance_repair,
				electrical_wiring: electrical_wiring,
				household_cleaning: household_cleaning,
				painting: painting
			}
			return data;
		});

});
exports.verifiyServiceProvider = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}
	const uid = data.uid;
	const email = data.email;
	const displayName = data.displayName;

	const claims = {};
	claims.verified = true;
	claims.provider = true;
	claims.services = null;

	return mAuth.setCustomUserClaims(uid, claims)
		.then(() => {
			console.log("Successfully verified the service provider.");
			sendVerifiedProviderEmail(email, displayName, true);
			return {
				result: true
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});

exports.rejectServiceProvider = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}
	const uid = data.uid;
	const email = data.email;
	const displayName = data.displayName;

	const claims = {};
	claims.verified = false;
	claims.provider = false;
	claims.services = null;

	return mAuth.setCustomUserClaims(uid, claims)
		.then(() => {
			console.log("Successfully rejected the service provider.");
			sendVerifiedProviderEmail(email, displayName, false);
			return {
				result: true
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});

exports.listUnverifiedProviders = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			var unverified = [];
			listUsersResult.users.forEach(userRecord => {
				if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.provider !== null 
					&& userRecord.customClaims.provider === true && userRecord.customClaims.verified !== null && userRecord.customClaims.verified === false) {
					unverified.push(userRecord);
				}
			});
			return unverified;
		});

});
exports.listAllCustomers = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			var customers = [];
			listUsersResult.users.forEach(userRecord => {
				if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.customer !== null 
					&& userRecord.customClaims.customer === true) {
					customers.push(userRecord);
				}
			});
			return customers;
		});

})
exports.listVerifiedProviders = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			var verified = [];
			listUsersResult.users.forEach(userRecord => {
				if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.provider !== null 
					&& userRecord.customClaims.provider === true && userRecord.customClaims.verified !== null && userRecord.customClaims.verified === true) {
					verified.push(userRecord);
				}
			});
			return verified;
		});

});
exports.listAllDevelopers = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.listUsers()
		.then(listUsersResult => {
			var developers = [];
			listUsersResult.users.forEach(userRecord => {
				if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.developer !== null 
					&& userRecord.customClaims.developer === true) {
					developers.push(userRecord);
				}
			});
			return developers;
		});

});
exports.getNumberOfUsers = functions.https.onCall((data, context) => {

	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	const user = data.user;

	return mAuth.listUsers()
		.then(listUsersResult => {
			var result = 0;
			if (user === "customer") {
				listUsersResult.users.forEach(userRecord => {
					console.log(userRecord.toJSON());
					if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.customer !== null 
						&& userRecord.customClaims.customer === true) {
						result++;
					}
				});
			}else if (user === "provider") {
				listUsersResult.users.forEach(userRecord => {
					console.log(userRecord.toJSON());
					if (userRecord.customClaims !== undefined && userRecord.customClaims !== null && userRecord.customClaims.provider !== null 
						&& userRecord.customClaims.provider === true && userRecord.customClaims.verified !== null && 
						userRecord.customClaims.verified === true) {
						result++;
					}
				});
			}
			return {
				users: result
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});
});
exports.setCustomClaimsServices = functions.https.onCall((data, context) => {

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	console.log(context.auth.token);

	const uid = context.auth.uid;
	const service = data.services;

	const customClaims = {
		services: service
	}
	customClaims.provider = true;
	customClaims.verified = context.auth.token.verified;

	return mAuth.setCustomUserClaims(uid, customClaims)
		.then(() => {
			console.log("Done setting the services for the service provider");
			return {
				result: true
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});
exports.setUserAddress = functions.https.onCall((data, context) => {
	// Get the data string.
	const uid = data.uid;
	const userAddress = data.address;
	const userType = data.userType;
	// const service = data.services;

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	// Check if the data is valid.
	if (!(typeof uid === 'string') || uid.length === 0 || !(typeof userType === 'string') || userType.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}

	const customClaims = {
		address: userAddress
	};

	if (userType === "customer") {
		customClaims.customer = true;
	}else if (userType === "provider") {
		customClaims.provider = true;
		customClaims.services = data.services;
		customClaims.verified = true;
	}

	return mAuth.setCustomUserClaims(uid, customClaims)
		.then(() => {
			console.log("Done setting the user address");
			return {
				result: true
			};
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});
exports.setDeveloperCustomClaims = functions.https.onCall((data, context) => {

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	// Check if the data is valid.
	if (!(typeof data.role === 'string') || data.role.length === 0 || !(typeof data.role === 'string') || data.role.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}
	if (!(typeof data.info === 'string') || data.info.length === 0 || !(typeof data.info === 'string') || data.info.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}

	const uid = context.auth.uid;
	data.developer = true;

	return mAuth.setCustomUserClaims(uid, data)
		.then(() => {
			console.log("user successfully claims as developer");
			return true;
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});
exports.setCustomClaims = functions.https.onCall((data, context) => {
	// Get the data string.
	const uid = context.auth.uid;
	const userType = data.userType;
	const name = data.name || null;

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	// Check if the data is valid.
	if (!(typeof uid === 'string') || uid.length === 0 || !(typeof userType === 'string') || userType.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}

	var customClaims = {};

	// Setting the custom claims
	if (userType === "customer") {
		customClaims = {
			customer: true
		};
	}else if (userType === "provider") {
		customClaims = {
			provider: true,
			verified: false
		};
	}

	return mAuth.setCustomUserClaims(uid, customClaims)
		.then(() => {
			console.log("user successfully claims as service provider");
			if (userType === "provider") {
				const text = name + " has registered and waiting to be verified.";
				const title = 'New Service Provider';
				setAdminNotification(text, title);
			}
			return { result: true };
		})
		.catch(err => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});

});
exports.getUserRecord = functions.https.onCall((data, context) => {
	// Get the data string.
	const uid = data.uid;

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	// Check if the data is valid.
	if (!(typeof uid === 'string') || uid.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}

	// Getting the user information.
	return mAuth.getUser(uid)
		.then(userRecord => {
			console.log(userRecord.toJSON());
			return userRecord.toJSON();
		})
		.catch(error => {
			throw new functions.https.HttpsError('unknown', error.message, error);
		});

});
exports.actionUser = functions.https.onCall((data, context) => {
	const uid = data.uid;
	const isDisable = data.isDisable;

	// Check if the data is valid.
	if (!(typeof uid === 'string') || uid.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}
	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	return mAuth.updateUser(uid, {
		disabled: isDisable
	})
		.then(userRecord => {
			console.log("Successfully updated user", userRecord.toJSON());
			return {
				result: true,
				userRecord: userRecord.toJSON()
			};
		})
		.catch(error => {
			throw new functions.https.HttpsError('unknown', error.message, error);
		});
});

exports.createQuote = functions.https.onCall((data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	const uid = context.auth.uid;
	const displayName = context.auth.token.name || null;
	const photoUrl = context.auth.token.picture || null;
	const phone = context.auth.token.phone_number || null;

	const requestDocumentId = data.requestDocumentId;
	delete data.requestDocumentId;
	data.uid = uid;
	data.displayName = displayName;
	data.photoUrl = photoUrl;
	data.phone = phone;
	data.timestamp = admin.firestore.FieldValue.serverTimestamp() || null;

	const thisRequestDocu = mDb.collection("requests").doc(requestDocumentId);

	// Checking if the service providers for request have 5 or more in the server
	return mDb.runTransaction(transaction => {
		return transaction.get(thisRequestDocu)
			.then(doc => {
				if (doc.data().serviceProvidersUid.length >= 5) {
					return Promise.resolve(false);
				}else {
					const serviceProviders = doc.data().serviceProvidersUid;
					serviceProviders.push(uid);
					console.log("New service providers: ", serviceProviders);
					transaction.set(thisRequestDocu, {serviceProvidersUid: serviceProviders}, {merge: true});
					return Promise.resolve(true);
				}
			})
			.catch(error => console.log("Errors: ", error));
	})
		.then(result => {
			if (result === true) {
				console.log("Na update na ung bilang ng service provider.");
				delete data.requestDocumentId;
				return mDb.collection("requests").doc(requestDocumentId).collection('requestQuotes').add(data)
			}else {
				console.log("Lima na kasi sila.")
				return false;
			}
		})
		.then(documentRef => {
			data.requestDocumentId = requestDocumentId;
			createQuote(documentRef.id, data);
			return true;
		})
		.catch(error => {
			throw new functions.https.HttpsError('unknown', error.message, error);
		});

});

// TRIGGERED FUNCTIONS
exports.newServiceNotification = functions.region('asia-northeast1').firestore.document('services/{serviceId}')
	.onCreate((snap, context) => {
		const service = snap.data();
		const text = "You've successfully created " + service.serviceName + " service.";
		const title = 'New Service Created';
		return setAdminNotification(text, title);
	});
exports.updateQuoteeProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('quotes').doc(uid).collection('my_quotes').get()
			.then(snapshot => {
				var updatePromises = [];
				snapshot.forEach(doc => {
					const promise = doc.ref.update({
						displayName: displayName,
						photoUrl: photoUrl
					});
					updatePromises.push(promise);
				});
				return Promise.all(updatePromises);
			})
			.then(refs => {
				console.log("Done updating all the provider profile in his/her quotes");
				return snap.ref.remove();
			})
			.catch(error => console.log("error: ", error));
	});
exports.updateCustomerQuoteProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName + " " + uid);

		return mDb.collection('quotes').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					const promise = doc.ref.collection('my_quotes').where('userNotificationUid', '==', uid).get();
					getPromises.push(promise);
				});
				return Promise.all(getPromises);
			})
			.then(refs => {
				console.log("Done updating all the customer profile inside the quotes");
				return snap.ref.remove();
			})
			.catch(error => console.log("error: ", error));
	});
exports.updateRatingProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					if (doc.id !== uid) {
						const promise = doc.ref.collection('ratings').where('uid', '==', uid).get();
						getPromises.push(promise);
					}
				});
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				var updatePromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						const promise = doc.ref.update({
							displayName: displayName,
							photoUrl: photoUrl
						});
						updatePromises.push(promise);
					});
				});
				return Promise.all(updatePromises);
			})
			.then(refs => console.log("Done updating the profile of the users in rating and review"))
			.catch(error => console.log("error: ", error));

	});
exports.updateNotificationProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					if (doc.id !== uid) {
						var promise = doc.ref.collection('notifications').where('metadata.uid', '==', uid).get();
						getPromises.push(promise);
					}
				});
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				var updatePromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						const promise = doc.ref.update({
							'metadata.displayName': displayName,
							'metadata.photoUrl': photoUrl
						});
						updatePromises.push(promise);
					});
				});
				return Promise.all(updatePromises);
			})
			.then(refs => {
				console.log("Done updating all the notification profile of the users");
				return snap.ref.remove();
			})
			.catch(error => console.log("error: ", error));
	});
exports.updateQuotationNotificationProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					if (doc.id !== uid) {
						const promise = doc.ref.collection('notifications').where('metadata.uid', '==', uid).where('type', '==', 'quotation').get();
						getPromises.push(promise);
					}
				});
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				var updatePromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						const notif = doc.data();
						const oldMessage = notif.message;
						const oldMessageArr = oldMessage.split(' has quoted');
						const newMessage = displayName + " has quoted" + oldMessageArr[1];
						const promise = doc.ref.update({
							message: newMessage
						});
					});
				});
				return Promise.all(updatePromises);
			})
			.then(refs => {
				console.log("Done updating all the notification profile for quotation of provider.");
				return snap.ref.remove();
			})
			.catch(error => console.log("Error: ", error));
	});
exports.updateAcceptedNotificationProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				console.log("Iteraterating all the users.");
				snapshot.forEach(doc => {
					// exception for the info of who triggered the cloud function
					if (doc.id !== uid) {
						// Updating the notifications information of who triggered the cloud function to another user
						mDb.collection('users').doc(doc.id).collection('notifications').where('metadata.uid', '==', uid).where('type', '==', 'accepted').get()
							.then(snapshot2 => {
								snapshot2.forEach(doc2 => {
									const notif = doc2.data();
									const oldMessage = notif.message;
									const oldMessageArr = oldMessage.split(' has booked');
									const newMessage = displayName + " has booked" + oldMessageArr[1];
									mDb.collection('users').doc(doc.id).collection('notifications').doc(doc2.id).update({
										message: newMessage
									})
										.then(ref => console.log("Successfully updated the notifications to the latest profile."))
										.catch(error => console.log('error', error));
								});
								return snap.ref.remove();
							})
							.catch(error => console.log("Error: ", error));
					}
				});
				return null;
			})
			.catch(error => console.log("Error", error));
	});
exports.updateCompletedNotificationProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				console.log("Iteraterating all the users.");
				snapshot.forEach(doc => {
					// exception for the info of who triggered the cloud function
					if (doc.id !== uid) {
						// Updating the notifications information of who triggered the cloud function to another user
						mDb.collection('users').doc(doc.id).collection('notifications').where('metadata.uid', '==', uid).where('type', '==', 'completed').get()
							.then(snapshot2 => {
								snapshot2.forEach(doc2 => {
									const notif = doc2.data();
									const oldMessage = notif.message;
									const oldMessageArr = oldMessage.split(' has completed');
									const newMessage = displayName + " has completed" + oldMessageArr[1];
									mDb.collection('users').doc(doc.id).collection('notifications').doc(doc2.id).update({
										message: newMessage
									})
										.then(ref => console.log("Successfully updated the notifications to the latest profile."))
										.catch(error => console.log('error', error));
								});
								return snap.ref.remove();
							})
							.catch(error => console.log("Error: ", error));
					}
				});
				return null;
			})
			.catch(error => console.log("Error", error));
	});
exports.updateRatingNotificationProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				console.log("Iteraterating all the users.");
				snapshot.forEach(doc => {
					// exception for the info of who triggered the cloud function
					if (doc.id !== uid) {
						// Updating the notifications information of who triggered the cloud function to another user
						mDb.collection('users').doc(doc.id).collection('notifications').where('metadata.uid', '==', uid).where('type', '==', 'rate').get()
							.then(snapshot2 => {
								snapshot2.forEach(doc2 => {
									const newMessage = displayName + ' has approved your finished quote. Please rate ' + displayName;
									mDb.collection('users').doc(doc.id).collection('notifications').doc(doc2.id).update({
										message: newMessage
									})
										.then(ref => console.log("Successfully updated the rating notifications to the latest profile."))
										.catch(error => console.log('error', error));
								});
								return snap.ref.remove();
							})
							.catch(error => console.log("Error: ", error));
					}
				});
				return null;
			})
			.catch(error => console.log("Error", error));
	});
exports.updateMessageProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {

		console.log(context.auth);
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;

		console.log("New name: ", displayName);

		return mDb.collection('users').doc(uid).collection('chat').get()
			.then(snapshot => {
				console.log("Fetching all the messages.");
				var getPromises = [];
				snapshot.forEach(doc => {
					const promise = mDb.collection('chats').doc(doc.id).collection('chat_room').where('senderUid', '==', uid).get();
					getPromises.push(promise);
				})
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				console.log("Updating all the message profile");
				var setPromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						var promise = doc.ref.set({
							name: displayName,
							phone: phone,
							photoUrl: photoUrl
						}, {merge: true});
						setPromises.push(promise);
					});
				});
				return Promise.all(setPromises);
			})
			.then(refs => console.log("All mesage profile for " + displayName + " has been updated."))
			.catch(error => console.log("Error: ", error));

	});
exports.updateRequestProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('requests').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					var promise = mDb.collection('requests').doc(doc.id).collection('requestQuotes').where("uid", "==", uid).get();
					getPromises.push(promise);
				});
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				var setPromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						var promise = doc.ref.set({
							displayName: displayName,
							phone: phone,
							photoUrl: photoUrl
						}, {merge: true});
						setPromises.push(promise);
					});
				});
				return Promise.all(setPromises);
			})
			.then(refs => console.log("Done updating for all the quotes in request."))
			.catch(error => console.log("Error: ", error));

	});
exports.updateRequestCustomerProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;

		return mDb.collection('requests').where("uid", "==", uid).get()
			.then(snapshot => {
				var updatePromises = [];
				snapshot.forEach(doc => {
					var promise = doc.ref.update({'customerName': displayName, 'photoUrl': photoUrl});
				})
				return Promise.all(updatePromises);
			})
			.then(ref => {
				console.log("Done updating all the request profile of customer.");
				return snap.ref.remove();
			})
			.catch(error => console.log("Error: ", error));

	});
exports.updateChatProfile = functions.region('asia-northeast1').database.ref('/profile_update/{uid}/{pushId}')
	.onCreate((snap, context) => {
		// Current Authentication information of who triggered the cloud function.
		const uid = context.auth.uid;
		const displayName = context.auth.token.name || null;
		const photoUrl = context.auth.token.picture || null;
		const phone = context.auth.token.phone_number || null;
		console.log("New name: ", displayName);

		return mDb.collection('users').get()
			.then(snapshot => {
				var getPromises = [];
				snapshot.forEach(doc => {
					if (doc.id !== uid) {
						var promise = mDb.collection('users').doc(doc.id).collection('chat').where('uid', '==', uid).get();
						getPromises.push(promise);
					}
				});
				return Promise.all(getPromises);
			})
			.then(snapshots => {
				var setPromises = [];
				snapshots.forEach(snapshot => {
					snapshot.forEach(doc => {
						var promise = doc.ref.set({
							displayName: displayName,
							phone: phone,
							photoUrl: photoUrl
						}, {merge: true});
						setPromises.push(promise);
					});
				});
				return Promise.all(setPromises);
			})
			.then(refs => {
				console.log("Done updating all the chat profile from the user");
				return snap.ref.remove();
			})
			.catch(error => console.log("error: ", error));

	});
exports.presenceUpdateFirestore = functions.region('asia-northeast1').database.ref('/Presence/{uid}')
	.onCreate((snapshot, context) => {
		if (!context.auth) {
			throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
		}
		const uid = context.auth.uid;
		const ref = snapshot.ref;
		// User has been detected to disconnect
		// set the presence to false
		return mDb.collection('users').doc(uid).update({presence: false})
			.then(() => {
				console.log("Successfully updated the presence of the user.");
				return snapshot.ref.remove();
			})
			.then(() => console.log("Realtime database presence for the user has been deleted"))
			.catch(error => {
				throw new functions.https.HttpsError('unknown', error.message, error);
			});
	});
exports.saveDownloadUrlImage = functions.region('asia-northeast1').storage.object().onFinalize(object => {
	const contentType = object.contentType;
	if (!contentType.startsWith('image/')) {
		console.log('The uploaded file was not an image.');
		return null;
	}

	const filePath = object.name;
	const fileDir = path.dirname(filePath);

	const fileBucket = object.bucket;
	const fileName = path.basename(filePath);

	const bucket = admin.storage().bucket(fileBucket);

	const SIGNED_BUCKET_URL_CONFIG = {
	    action: 'read',
	    expires: '03-01-2500'
	};

	if (fileDir !== null && fileDir === "credential_image") {
		console.log("Image is from credential image.");
		const arr = fileName.split("==");
		const id = arr[0];
		const key = arr[1].split(".")[0];

		const images = {};
		const update = {};
		return bucket.file(filePath).getSignedUrl(SIGNED_BUCKET_URL_CONFIG, (err, url) => {                                  
			if (err) {
	            console.error(err);
	            return null;
	        }else {
	        	update[key] = url;
	        	images.credentials = update;

	        	return mDb.collection("users").doc(id).set(images, {merge: true})
	        		.then(() => console.log("Successfull updated the image url of request."))
	        		.catch(error => {
	        			throw new functions.https.HttpsError('unknown', error.message, error);
	        		});
	        }                                         
		});

	}else if (fileDir !== null && fileDir === "request_image") {
		console.log("Image is from request image.");
		const arr = fileName.split("==");
		const id = arr[0];
		const key = arr[1].split(".")[0];

		var images = {};
		var update = {};
		return bucket.file(filePath).getSignedUrl(SIGNED_BUCKET_URL_CONFIG, (err, url) => {                                  
			if (err) {
	            console.error(err);
	            return null;
	        }else {
	        	update[key] = url;
	        	images.images = update;

	        	return mDb.collection("requests").doc(id).set(images, {merge: true})
	        		.then(() => console.log("Successfull updated the image url of request."))
	        		.catch(error => {
	        			throw new functions.https.HttpsError('unknown', error.message, error);
	        		});
	        }                                         
		});

	}else if (fileDir !== null && fileDir === "chat_image") {
		console.log("Image is from chat image.");
		const arr = fileName.split("==");
		const id = arr[0];
		const chatRoomId = arr[1];

		return bucket.file(filePath).getSignedUrl(SIGNED_BUCKET_URL_CONFIG, (err, url) => {                                  
			if (err) {
	            console.error(err);
	            return null;
	        }else {
	        	return mDb.collection("chats").doc(chatRoomId).collection('chat_room').doc(id).update({imageUrl: url})
	        		.then(() => console.log("Successfull updated the image url of chat."))
	        		.catch(error => {
	        			throw new functions.https.HttpsError('unknown', error.message, error);
	        		});
	        }                                         
		});

	}else {
		console.log("The image was not request image.");
		return null;
	}
});
exports.sendRateCustomerNotification = functions.region('asia-northeast1').firestore.document("requests/{documentId}")
	.onUpdate((change, context) => {
		const oldDocu = change.before.data();
		const newDocu = change.after.data();

		if (oldDocu.status !== newDocu.status && newDocu.status === "completed") {
			console.log("Request has been completed");
			const booked = newDocu.booked;
			const customerUid = newDocu.uid;
			const customerName = newDocu.customerName || null;
			const photoUrl = newDocu.photoUrl || null;

			if (booked !== null && Object.keys(booked).length > 0) {
				const uid = booked.uid;
				const title = "Customer Rating";
				const message = customerName + ' has approved your finished quote. Please rate ' + customerName;
				const metadata = {
					uid: customerUid,
					displayName: customerName,
					photoUrl: photoUrl
				};

				return mDb.collection("users").doc(uid).get()
					.then(doc => {
						if (!doc.exists) {
							console.log("No document exists");
							return null;
						}else {
							const user = doc.data();
							const settings = user.settings;
							const fcmToken = user.fcmTokenDevice;
							const isSignedIn = user.isSignedIn;

							if (settings !== null && settings !== undefined && settings["Customer Rating"] !== null && settings["Customer Rating"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
								return sendNotificationDevice(fcmToken, title, message);
							}else {
								console.log("Push notification for Accepted Quote is turned off or the user is signed out.");
								return null;
							}
						}
					})
					.then(value => console.log("Done sending Accepted Quote push notification."))
					.catch(error => console.log("Error: ", error));

			}else {
				console.log("Request have no booked service provider.");
				return null;
			}
		}else {
			console.log("Request has been updated but not the cancellation.");
			return null;
		}

	});
exports.newRequestCancellation = functions.region('asia-northeast1').firestore.document("requests/{documentId}")
	.onUpdate((change, context) => {
		const oldDocu = change.before.data();
		const newDocu = change.after.data();

		if (oldDocu.status !== newDocu.status && newDocu.status === "cancelled") {
			console.log("Request has been cancelled");
			const uid = newDocu.uid;
			return cancellationTransaction(uid);
		}else if (oldDocu.status !== newDocu.status && newDocu.status === "completed") {
			console.log("Request has been completed");
			const booked = newDocu.booked;
			const customerUid = newDocu.uid;
			const customerName = newDocu.customerName || null;
			const photoUrl = newDocu.photoUrl || null;

			if (booked !== null && Object.keys(booked).length > 0) {
				const uid = booked.uid;
				const title = "Customer Rating";
				const message = customerName + ' has approved your finished quote. Please rate ' + customerName;
				const metadata = {
					uid: customerUid,
					displayName: customerName,
					photoUrl: photoUrl
				};
				return sendInAppNotification(uid, message, title, 'rate', metadata, false);
			}else {
				console.log("Request have no booked service provider.");
				return null;
			}
		}else if (oldDocu.booked !== null && oldDocu.booked.uid === undefined && Object.keys(oldDocu.booked).length === 0 && newDocu.booked !== null && Object.keys(newDocu.booked).length > 0) {
			console.log("Request have booked");
			const providerUid = newDocu.booked.uid;
			const customerName = newDocu.customerName;
			const serviceName = newDocu.serviceName;
			const message = customerName + " has booked your quote for "+ serviceName + " request";

			return mDb.collection("users").doc(providerUid).get()
				.then(doc => {
					if (!doc.exists) {
						console.log("No document exists");
						return null;
					}else {
						const user = doc.data();
						const settings = user.settings;
						const fcmToken = user.fcmTokenDevice;
						const isSignedIn = user.isSignedIn;

						if (settings !== null && settings !== undefined && settings["Accepted Quote"] !== null && settings["Accepted Quote"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
							return sendNotificationDevice(fcmToken, customerName, message);
						}else {
							console.log("Push notification for Accepted Quote is turned off or the user is signed out.");
							return null;
						}
					}
				})
				.then(value => console.log("Done sending Accepted Quote push notification."))
				.catch(error => console.log("Error: ", error));
		}else {
			console.log("Request has been updated but not the cancellation.");
			return null;
		}

	});
exports.newRequestBooked = functions.region('asia-northeast1').firestore.document("requests/{documentId}")
	.onUpdate((change, context) => {
		const oldDocu = change.before.data();
		const newDocu = change.after.data();

		if (oldDocu.booked !== null && Object.keys(oldDocu.booked).length === 0 && newDocu.booked !== null && Object.keys(newDocu.booked).length > 0) {
			console.log("Request have booked");
			const providerUid = newDocu.booked.uid;
			const quoteDocumentId = newDocu.booked.quoteId;
			const customerUid = newDocu.uid;
			const customerName = newDocu.customerName;
			const serviceName = newDocu.serviceName;
			const title = "Accepted Quote";
			const message = customerName + " has booked your quote for "+ serviceName + " request";
			const photoUrl = newDocu.photoUrl || null;
			const metadata = {
				uid: customerUid,
				requestDocumentId: context.params.documentId,
				photoUrl: photoUrl
			};

			return mDb.collection("users").doc(providerUid).get()
				.then(doc => {
					if (!doc.exists) {
						console.log("No document exists");
						return null;
					}else {
						const user = doc.data();
						const settings = user.settings;
						const fcmToken = user.fcmTokenDevice;
						const isSignedIn = user.isSignedIn;

						if (settings !== null && settings !== undefined && settings["In-App Accepted Quote"] !== null && settings["In-App Accepted Quote"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
							return sendInAppNotification(providerUid, message, title, 'accepted', metadata, false);
						}else {
							return sendInAppNotification(providerUid, message, title, 'accepted', metadata, true);
						}
					}
				})
				.then(value => console.log("Done sending Accepted Quote push notification."))
				.catch(error => console.log("Error: ", error));
		}
		else {
			console.log("Request has been updated but not the cancellation.");
			return null;
		}
	});
exports.updateNotAcceptedBooked = functions.region('asia-northeast1').firestore.document("requests/{documentId}")
	.onUpdate((change, context) => {
		const oldDocu = change.before.data();
		const newDocu = change.after.data();

		if (oldDocu.booked !== null && Object.keys(oldDocu.booked).length === 0 && newDocu.booked !== null && Object.keys(newDocu.booked).length > 0) {
			console.log("Quotes have not accepted.");
			// Accepted quote id
			const quoteId = newDocu.booked.quoteId;
			const requestDocumentId = change.after.id;
			// Updating the not accepted quotes
			return change.after.ref.collection("requestQuotes").get()
				.then(snapshot => {
					snapshot.forEach(doc => {
						if (doc.id !== quoteId) {
							const quote = doc.data();
							const notAcceptedUid = quote.uid;
							mDb.collection('quotes').doc(notAcceptedUid).collection('my_quotes').doc(doc.id)
								.set({accepted: false}, {merge: true});
							const title = "Not Accepted";
							const message = quote.displayName + " have chosen another quote. Thanks for sending the quote for the request";
							const metadata = {
								displayName: quote.displayName,
								uid: notAcceptedUid,
								photoUrl: quote.photoUrl,
								requestDocumentId: requestDocumentId
							};
							sendInAppNotification(notAcceptedUid, message, title, 'rejected', metadata, true);
						}
					});
					return null;
				})
				.catch(error => console.log("Error: ", error));
			
		}
		else {
			console.log("Request has been updated but not the booked.");
			return null;
		}
	});
exports.sendWelcomeEmail = functions.region('asia-northeast1').auth.user().onCreate(user => {

	const email = user.email;
	const displayName = user.displayName;

	return sendWelcomeEmail(email, displayName);
});
exports.sendQuotationInAppNotification = functions.region('asia-northeast1').firestore.document('requests/{requestDocumentId}/requestQuotes/{requestQuotesId}')
	.onCreate((snap, context) => {
		const requestQuote = snap.data();
		const serviceName = requestQuote.serviceName || null;
		const photoUrl = requestQuote.photoUrl || null;
		const providerUid = requestQuote.uid;
		
		const providerName = requestQuote.displayName || 'Anonymous';
		const uid = requestQuote.userNotificationUid;

		const requestDocumentId = context.params.requestDocumentId;

		const metadata = {
			requestDocumentId: requestDocumentId,
			photoUrl: photoUrl,
			uid: providerUid
		};

		const title = "New Quote";
		const message = providerName + " has quoted for your " + serviceName + " request";

		return mDb.collection("users").doc(uid).get()
			.then(doc => {
				if (!doc.exists) {
					console.log("No document exists");
					return null;
				}else {

					const user = doc.data();
					const settings = user.settings;
					const fcmToken = user.fcmTokenDevice;
					const isSignedIn = user.isSignedIn;
					if (settings !== null && settings !== undefined && settings["In-App New Quotations"] !== null && settings["In-App New Quotations"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
						return sendInAppNotification(uid, message, title, 'quotation', metadata, false);
					}else {
						console.log("Push notification for New Quotations is turned off or the user is signed out.");
						return sendInAppNotification(uid, message, title, 'quotation', metadata, true);
					}
				}
			})
			.catch(error => console.log("Error: ", error));
	});
exports.sendReceivingQuotesNotification = functions.region('asia-northeast1').firestore.document('requests/{requestDocumentId}')
	.onCreate((snap, context) => {
		const request = snap.data();
		const serviceName = request.serviceName;
		const uid = request.uid;

		const title = serviceName;
		const message = 'You will be receiving quotes shortly';
		const requestDocumentId = context.params.requestDocumentId;
		const metadata = {
			requestDocumentId: requestDocumentId
		};

		return sendInAppNotification(uid, message, title, 'receiving', metadata, true);
	});
exports.sendBookedNotification = functions.region('asia-northeast1').firestore.document('requests/{requestDocumentId}/requestQuotes/{requestQuotesId}')
	.onCreate((snap, context) => {
		const requestQuote = snap.data();
		const uid = requestQuote.userNotificationUid;
		const requestDocumentId = context.params.requestDocumentId;
		const metadata = {
			requestDocumentId: requestDocumentId
		};

		const title = "Booked a service provider!";
		const message = "We have sent you all available quotes. Book a service provider now";

		return mDb.collection('requests').doc(requestDocumentId).collection('requestQuotes').get()
			.then(snapshot => {
				var numOfQuotes = 0;
				snapshot.forEach(doc => {
					numOfQuotes++;
				});
				if (numOfQuotes > 4) {
					return sendInAppNotification(uid, message, title, 'booked', metadata, true);
				}else {
					return null;
				}
				
			})
			.catch(error => console.log("Error: ", error));

	});
exports.sendQuotationNotification = functions.region('asia-northeast1').firestore.document('requests/{requestDocumentId}/requestQuotes/{requestQuotesId}')
	.onCreate((snap, context) => {
		const requestQuote = snap.data();
		const serviceName = requestQuote.serviceName || null;
		
		const providerName = requestQuote.displayName || 'Anonymous';
		const uid = requestQuote.userNotificationUid;

		const title = "New Quote";
		const message = providerName + " has quoted for your " + serviceName + " request";

		return mDb.collection("users").doc(uid).get()
			.then(doc => {
				if (!doc.exists) {
					console.log("No document exists");
					return null;
				}else {

					const user = doc.data();
					const settings = user.settings;
					const fcmToken = user.fcmTokenDevice;
					const isSignedIn = user.isSignedIn;
					if (settings !== null && settings !== undefined && settings["New Quotations"] !== null && settings["New Quotations"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
						return sendNotificationDevice(fcmToken, title, message);
					}else {
						console.log("Push notification for New Quotations is turned off or the user is signed out.");
						return null;
					}
				}
			})
			.catch(error => console.log("Error: ", error));

	});
exports.notificationExtinguisher = functions.region('asia-northeast1').firestore.document('users/{uid}/notifications/{notificationId}')
	.onCreate((snap, context) => {

		var promise1 = new Promise((resolve, reject) => {
			setTimeout(resolve, 9000, true);
		});
		var promise2 = snap.ref.update({shown: true});

		Promise.all([promise1, promise2])
			.then(values => console.log("Done updating yess."))
			.catch(error => console.log('Error', error));

	});
exports.sendCompletedInAppNofication = functions.region('asia-northeast1').firestore.document('quotes/{uid}/my_quotes/{quoteId}')
	.onUpdate((change, context) => {

		const beforeCompleted = change.before.get('completed'); // default value is false
		const afterCompleted = change.after.get('completed');

		if (beforeCompleted !== afterCompleted && beforeCompleted === false && afterCompleted === true) {
			const uid = change.after.get('userNotificationUid');
			const providerName = change.after.get('displayName');
			const photoUrl = change.after.get('photoUrl');
			const serviceName = change.after.get('serviceName') || null;

			const providerUid = context.params.uid;
			const requestDocumentId = change.after.get('requestDocumentId');

			const metadata = {
				requestDocumentId: requestDocumentId,
				uid: providerUid,
				displayName: providerName,
				photoUrl: photoUrl
			};

			const title = "Completed Service";
			const message = providerName + ' has completed your ' + serviceName + ' request. Tap to approve';

			return mDb.collection("users").doc(uid).get()
				.then(doc => {
					if (!doc.exists) {
						console.log("No document exists");
						return null;
					}else {
						const user = doc.data();
						const settings = user.settings;
						const fcmToken = user.fcmTokenDevice;
						const isSignedIn = user.isSignedIn;
						if (settings !== null && settings !== undefined && settings["In-App Completed Service"] !== null && settings["In-App Completed Service"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
							return sendInAppNotification(uid, message, title, 'completed', metadata, false);
						}else {
							console.log("Push notification for Completed Service is turned off or the user is signed out.");
							return sendInAppNotification(uid, message, title, 'completed', metadata, true);
						}
					}
				})
				.catch(error => console.log("Error: ", error));

		}else {
			return null;
		}
	});
exports.sendCompletedNofication = functions.region('asia-northeast1').firestore.document('quotes/{uid}/my_quotes/{quoteId}')
	.onUpdate((change, context) => {

		const beforeCompleted = change.before.get('completed'); // default value is false
		const afterCompleted = change.after.get('completed');

		if (beforeCompleted !== afterCompleted && afterCompleted === true) {
			const uid = change.after.get('userNotificationUid');
			const providerName = change.after.get('displayName');
			const serviceName = change.after.get('serviceName') || null;

			const title = "Completed Service";
			const message = providerName + ' has completed your ' + serviceName + ' request. Tap to approve';

			return mDb.collection("users").doc(uid).get()
				.then(doc => {
					if (!doc.exists) {
						console.log("No document exists");
						return null;
					}else {
						const user = doc.data();
						const settings = user.settings;
						const fcmToken = user.fcmTokenDevice;
						const isSignedIn = user.isSignedIn;
						if (settings !== null && settings !== undefined && settings["Completed Service"] !== null && settings["Completed Service"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
							return sendNotificationDevice(fcmToken, title, message);
						}else {
							console.log("Push notification for Completed Service is turned off or the user is signed out.");
							return null;
						}
					}
				})
				.catch(error => console.log("Error: ", error));
		}else {
			return null;
		}
	});
exports.updateSenderMessage = functions.region('asia-northeast1').firestore.document('chats/{chatId}/chat_room/{messageId}')
	.onCreate((snap, context) => {
		const chatId = context.params.chatId;
		const senderUid = snap.get('senderUid');
		var message = snap.get('text') || null;
		const imageUrl = snap.get('imageUrl') || null;
		if (message === null && imageUrl !== null) {
			message = 'You sent a photo';
		}
		const senderUpdate = {
			timestamp: admin.firestore.FieldValue.serverTimestamp(),
			lastMessage: message
		};
		return mDb.collection("users").doc(senderUid).collection('chat').doc(chatId).set(senderUpdate, {merge: true})
			.then(ref => console.log("Done sending notification and updating the message to the latest."))
			.catch(error => console.log("Error: ", error));
	});
exports.updateReceiverMessage = functions.region('asia-northeast1').firestore.document('chats/{chatId}/chat_room/{messageId}')
	.onCreate((snap, context) => {
		const chatId = context.params.chatId;
		const senderName = snap.get('name') || 'Anonymous';
		const senderPhotoUrl = snap.get('photoUrl') || null;
		// const senderPhone = context.auth.variable.token.phone_number || null;
		const senderPhone = snap.get('phone') || null;
		const receiverUid = snap.get('receiverUid');
		var message = snap.get('text') || null;
		const imageUrl = snap.get('imageUrl') || null;
		if (message === null && imageUrl !== null) {
			message = 'Sent a photo';
		}
		const receiverUpdate = {
			timestamp: admin.firestore.FieldValue.serverTimestamp(),
			displayName: senderName,
			phone: senderPhone,
			photoUrl: senderPhotoUrl,
			lastMessage: message
		};

		return mDb.collection("users").doc(receiverUid).collection('chat').doc(chatId).set(receiverUpdate, {merge: true})
			.then(ref => console.log("Done sending notification and updating the message to the latest."))
			.catch(error => console.log("Error: ", error));
	});
exports.sendMessageNotification = functions.region('asia-northeast1').firestore.document('chats/{chatId}/chat_room/{messageId}')
	.onCreate((snap, context) => {
		const senderName = snap.get('name') || 'Anonymous';
		var message = snap.get('text') || null;
		const imageUrl = snap.get('imageUrl') || null;
		if (message === null && imageUrl !== null) {
			message = 'Sent a photo';
		}

		const receiverUid = snap.get('receiverUid');

		return mDb.collection("users").doc(receiverUid).get()
			.then(doc => {
				if (!doc.exists) {
					console.log("No document exists");
					return null;
				}else {
					const user = doc.data();
					const settings = user.settings;
					const fcmToken = user.fcmTokenDevice;
					const isSignedIn = user.isSignedIn;
					if (settings !== null && settings !== undefined && settings["New Messages"] !== null && settings["New Messages"] === true && isSignedIn !== null && isSignedIn === true && fcmToken !== null) {
						return sendNotificationDevice(fcmToken, senderName, message);
					}else {
						console.log("Push notification for New Messages is turned off or the user is signed out.");
						return null;
					}
				}
			})
			.then(value => console.log("Done sending message push notification."))
			.catch(error => console.log("Error: ", error));
	});
exports.setUserAverageRating = functions.region('asia-northeast1').firestore.document('users/{uid}/ratings/{ratingId}')
	.onCreate((snap, context) => {
		const uid = context.params.uid;
		const userRef = mDb.collection('users').doc(uid);
		var averageRating;

		return userRef.collection('ratings').get()
			.then(snapshot => {
				var totalRating = 0;
				var numOfRating = 0;
				snapshot.forEach(doc => {
					totalRating += doc.get('rating');
					numOfRating++;
				});
				averageRating = totalRating / numOfRating;
				return userRef.set({averageRating: averageRating, ratingCount: numOfRating}, {merge: true});
			})
			.then(ref => {
				return mAuth.getUser(uid);
			})
			.then(userRecord => {
				var claims = userRecord.customClaims;
				claims.rating = averageRating;
				return setUserCustomClaims(claims, uid);
			})
			.catch(error => console.log('Transaction failure: ', error));

	});


// LOCAL FUNCTIONS
function sendWelcomeEmail(email, displayName) {
	const mailOptions = {
		from: `${APP_NAME} <noreply@firebase.com>`,
		to: email,
	};
	mailOptions.subject = `Welcome to ${APP_NAME}!`;
	mailOptions.text = `Hey ${displayName || ''}! Welcome to ${APP_NAME}. We guarantee you'll be happy with every service. If not, we'll do whatever it takes to make it right.`;
	return mailTransport.sendMail(mailOptions).then(() => {
		return console.log('New welcome email sent to:', email);
	});
}
function sendVerifiedProviderEmail(email, displayName, isVerified) {
	const mailOptions = {
		from: `${APP_NAME} <noreply@firebase.com>`,
		to: email,
	};
	mailOptions.subject = `Your Account has been verified to ${APP_NAME}!`;
	if (isVerified === true) {
		mailOptions.text = `Congratulations ${displayName || ''}! Your account has been verified as service provider. You can now login to your account to the service provider application.`;
	}else {
		mailOptions.text = `Sorry ${displayName || ''}! Your account has been rejected because you're not eligble to become a service provider.`;
	
	}
	return mailTransport.sendMail(mailOptions).then(() => {
		return console.log('Verified email sent to:', email);
	});
}
function cancellationTransaction(uid) {
	var userRef = mDb.collection("users").doc(uid);
	console.log("Updating the cancellations of user...");

	var currentCancellation;

	return mDb.runTransaction(transaction => {
		return transaction.get(userRef)
			.then(doc => {
				var newCancellation = doc.data().cancellations + 1;
				console.log("New Cancellation: ", newCancellation);
				transaction.set(userRef, {cancellations: newCancellation}, {merge: true});
				return Promise.resolve(newCancellation);
			})
			.catch(error => console.log("Errors: ", error));
	})
		.then(newCancellation => {
			currentCancellation = newCancellation;
			if (newCancellation >= 5) {
				console.log("User has detected with 5 or more cancellations. User will be disabled.");
				return mAuth.updateUser(uid, {disabled: true});
			}else {
				return mAuth.getUser(uid);
			}
		})
		.then(userRecord => {
			var claims = userRecord.customClaims;
			claims.cancelled = currentCancellation;
			return setUserCustomClaims(claims, uid);
		})
		.catch(error => console.log('Transaction failure: ', error));
}
function setUserCustomClaims(claims, uid) {
	return mAuth.setCustomUserClaims(uid, claims)
		.then(() => console.log("Successfully updated the custom claims of user."))
		.catch(error => console.log("Error: ", error));
}
function sendNotificationDevice(registationToken, messenger, text) {
	const payload = {
		notification: {
			title: messenger,
			body: text
		}
	};

	return mMessaging.sendToDevice(registationToken, payload)
		.then(response => console.log('Successfully sent message ', response))
		.catch(err => console.log("Error sending message: ", err));
}
function setCustomClaimsAdmin() {
	// Admin of One Tap Manong
	var adminUid = "IlCx3vpc4qe0bQwsYFORssdVAt63";
	return mAuth.setCustomUserClaims(adminUid, {admin: true})
		.then(() => console.log('successfully claims as admin!'))
		.catch(err => console.log(err.message));
}
function createQuote(quoteDocumentId, data) {
	const providerUid = data.uid;
	const customerUid = data.userNotificationUid;

	const dateCreated = {timestamp: admin.firestore.FieldValue.serverTimestamp()};

	const phone = data.phone;
	const photoUrl = data.photoUrl;

	delete data.phone;
	delete data.uid;

	const chatBoxId = customerUid + providerUid;

	const my_quotes = mDb.collection("quotes").doc(providerUid).collection("my_quotes").doc(quoteDocumentId);
	const users = mDb.collection('users');

	const customerDoc = users.doc(customerUid);
	const providerDoc = users.doc(providerUid);

	data.completed = false;
 
	my_quotes.set(data)
		.then(ref => {
			dateCreated.uid = customerUid;
			return providerDoc.get();
			// return providerDoc.collection("chat").doc(chatBoxId).set(dateCreated, {merge:true});
		})
		.then(doc => {
			if (!doc.exists) {
				return providerDoc.collection("chat").doc(chatBoxId).set(dateCreated, {merge:true});
			}else {
				const providerUser = doc.data();
				const introduction = providerUser.introduction;
				if (introduction !== null && introduction !== undefined && introduction.isOn !== undefined && introduction.isOn !== null && introduction.isOn === true && introduction.message !== null) {
					const introductionMessage = introduction.message;
					// sendIntroductionMessage(message, chatBoxId, senderUid, recieverUid, senderName, senderPhotoUrl, senderPhone)
					const metadata = {
						min: data.minAmount,
						max: data.maxAmount,
						date: data.requestDate
					};
					sendIntroductionMessage(introductionMessage, chatBoxId, providerUid, customerUid, data.displayName, photoUrl, phone, metadata);
					return providerDoc.collection("chat").doc(chatBoxId).set(dateCreated, {merge:true});
				}else {
					console.log("Provider doesn't have introduction message");
					return providerDoc.collection("chat").doc(chatBoxId).set(dateCreated, {merge:true});
				}
			}
		})
		.then(ref => {
			dateCreated.phone = phone;
			dateCreated.photoUrl = photoUrl;
			dateCreated.uid = providerUid;
			dateCreated.displayName = data.displayName;
			return customerDoc.collection("chat").doc(chatBoxId).set(dateCreated, {merge: true});
		})
		.then(ref => console.log("Successfully created chat for the users."))
		.catch(error => console.log("Error: ", error));
}
function sendInAppNotification(uid, message, title, type, metadata, isShown) {
	const notification = {
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
		shown: isShown,
		done: false,
		type: type,
		message: message,
		title: title,
		metadata: metadata
	};
	mDb.collection('users').doc(uid).collection('notifications').add(notification)
		.then(ref => console.log("Done sending in app notifiction"))
		.catch(error => console.log("Error: ", error));
}
function sendIntroductionMessage(message, chatBoxId, senderUid, recieverUid, senderName, senderPhotoUrl, senderPhone, metadata) {
	const manongMessage = {
		text: message,
		name: senderName,
		photoUrl: senderPhotoUrl,
		imageUrl: null,
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
		senderUid: senderUid,
		receiverUid: recieverUid,
		phone: senderPhone,
		type: 'introduction',
		metadata: metadata
	};
	return mDb.collection('chats').doc(chatBoxId).collection('chat_room').add(manongMessage)
		.then(ref => console.log("Successfully send a introduction message from " + senderName))
		.catch(error => console.log("Error: ", error));
}
function setAdminNotification(text, title) {
	const payload = {
	  notification: {
	    title: title,
	    body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
	    icon: '/images/manong_customer_logo.png',
	    click_action: `https://one-tap-manong-ec225.firebaseapp.com/pending`,
	  }
	};

	var fcmAdminToken = admin.database().ref().child('adminToken');
	return fcmAdminToken.once('value', snapshot => {
		fcmToken = snapshot.val();
		if (fcmToken !== null) {
			console.log(fcmToken);
			return admin.messaging().sendToDevice(fcmToken, payload)
				.then(response => console.log("Successfully sent a push notification to admin"))
				.catch(error => console.log(error));
		}else {
			console.log("Fcm token for admin is missing");
			return null;
		}
	});
}

