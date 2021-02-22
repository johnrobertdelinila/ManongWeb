import $ from 'jquery';
import {MDCDialog, MDCDialogFoundation, util} from '@material/dialog';
import any from 'chart.js/dist/Chart.min';
import {MDCRipple} from '@material/ripple';
import {MDCTextField} from '@material/textfield';
import iyottayo from 'material-design-lite';
import bodymovin from 'lottie-web/bodymovin.min.js';
import swal from 'sweetalert';

$(document).ready(() => {

	var auth;
    var functions;
    var database;
    var rootRef;
    var messaging;
    var requestRef;

    var firestore;
    var settings = {timestampsInSnapshots: true};
    var requests;
    var services;

    var storage;
    var serviceImageRef;

    try {
        auth = firebase.auth();
        functions = firebase.functions();
        database = firebase.database();
        rootRef = database.ref();
        messaging = firebase.messaging();
        requestRef = rootRef.child("Request");

        firestore = firebase.firestore();
        firestore.settings(settings);
        requests = firestore.collection('requests');
        services = firestore.collection('services');

        storage = firebase.storage();
        serviceImageRef = storage.ref().child('service_images');
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
                .then(token => {
                    rootRef.child('adminToken').set(token);
                    return console.log("Updating the cloud token done.");
                })
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

    function initbodyMovin(file_name_json, element_id) {
        bodymovin.loadAnimation({
            container: $('#' + element_id)[0],
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: 'images/' + file_name_json
        });
    }

    new MDCRipple($('.mdc-button')[0]);
    new MDCTextField($('.service-name')[0]);
    initbodyMovin('loading_table.json', 'loading_review');

    var getNumberOfUsers = functions.httpsCallable("getNumberOfUsers");
    var getNumberOfServices = functions.httpsCallable("getNumberOfServices");

    var logout_dialog = new MDCDialog($('#logout-mdc-dialog')[0]);
    logout_dialog.listen('MDCDialog:accept', () => {
    	auth.signOut()
    		.catch(err => showSnackbar(err.message));
    });

    var service_dialog = new MDCDialog($('#service-mdc-dialog')[0]);
    service_dialog.listen('MDCDialog:cancel', () => {
        numItems = 0;
    });
    var fire_image = null;

    function getTheNumber(string) {
        var numb = string.match(/\d/g);
        numb = numb.join("");
        return numb;
    }

    $('#form_checklist').submit(function(e) {
        e.preventDefault();
        if ($('.component').length > 0) {
            const serviceName = $('#service_name').val().trim();
            const title = [];
            const subTitle = [];
            const isInput = [];
            const isOptional = [];
            const viewTypes = [];
            const answers = {};
            $('.component').each((i, element) => {
                const type = $(element).attr('type');
                const num = getTheNumber($(element).attr('id'));

                const this_title = $('#title_' + num).val().trim();
                const this_subTitle = $('#question_' + num).val().trim();
                var bool_haveInput = false;
                var bool_optional = false;
                var viewType = null;
                var arr_answer = [];

                if (type === 'question') {
                    bool_haveInput = $('#input_' + num).is(":checked"); 
                    bool_optional = $('#optional_' + num).is(":checked");

                    const view = $('input[name='+num+']:checked').val();
                    if (view === 'radio') {
                        viewType = 2
                    }else if (view === 'check') {
                        viewType = 1;
                    }

                    if ($('.input_answer_' + num).length > 0) {
                        $('.input_answer_' + num).each((ii, obj) => {
                            arr_answer.push($(obj).val().trim());
                        });
                    }

                }else if (type === 'description') {
                    viewType = 3;
                    arr_answer = null;
                }else if (type === 'attachment') {
                    viewType = 5;
                    bool_optional = true;
                    arr_answer = null;
                }

                title.push(this_title);
                subTitle.push(this_subTitle);
                isInput.push(bool_haveInput);
                isOptional.push(bool_optional);
                viewTypes.push(viewType);
                answers[i] = arr_answer;
            });

            // TODO: Check if no choices found

            title.push("Date");
            subTitle.push("When do you need it?");
            isInput.push(false);
            isOptional.push(false);
            viewTypes.push(4);
            answers[$('.component').length] = null;

            const service = {
                answers: answers,
                isInput: isInput,
                isOptional: isOptional,
                serviceName: serviceName,
                subtitle: subTitle,
                title: title,
                viewTypes: viewTypes
            };

            const key = requestRef.push().key;

            if (fire_image !== null) {

                swal({
                    title: "Confirm Service",
                    text: "Are you sure to add '" + serviceName + "' as service?",
                    icon: "warning",
                    buttons: true,
                    dangerMode: true,
                })
                .then((willAdd) => {
                    if (willAdd) {
                        showServiceLoading();
                        service_dialog.close();
                        uploadFile(key, fire_image, service);
                    }
                    return null;
                })
                .catch(err => console.log(err));

                /*if (confirm("Are you sure to add this service? ")) { //eslint-disable-line no-alert
                    showServiceLoading();
                    service_dialog.close();
                    uploadFile(key, fire_image, service);
                }*/
            }
        }
    });

    $('#logout').click((e) => {
    	logout_dialog.lastFocusedTarget = e.target;
    	logout_dialog.show();
    });

    $('#view-source').click(e => {
        $('#dialog_service_container').empty();
        $('#add_question').trigger('click');
        $('#service_image').attr('src', 'images/no_image.jpg');
        $('#file').val('');
        $('#service_name').val('');
        $('#add_description').removeAttr('disabled');
        $('#add_attachment').removeAttr('disabled');
        $('#service_service').scrollTop(0);

        service_dialog.lastFocusedTarget = e.target;
        $('#text_service_name').text("New Service");
        service_dialog.show();
    });

    function showServiceLoading() {
        $('#progress_bar').css('visibility', 'visible');
        $('#view-source').text("ADDING SERVICE...");
        $('#view-source').attr('disabled', '');
    }

    function hideServiceLoading() {
        $('#progress_bar').css('visibility', 'hidden');
        $('#view-source').text("ADD SERVICE");
        $('#view-source').removeAttr('disabled');
    }

    getNumberOfUsers({user:"customer"})
        .then(result => {
            var customers = result.data.users;
            return $('#customers').text("Customers: " + customers);
        })
        .catch(error => console.log("ERROR: " + error.message));

    getNumberOfUsers({user:"provider"})
        .then(result => {
            var providers = result.data.users;
            return $('#providers').text('Registered Providers: ' + providers);
        })
        .catch(error => console.log("ERROR: " + error.message));

    requests.where('status', '==', 'completed').get()
        .then(snapshot => {
            var completedRequests = 0;
            if (snapshot.empty === false) {
                completedRequests = snapshot.size;
                console.log(completedRequests);
            }
            return $('#completed').text("Completed Jobs: " + completedRequests);
        })
        .catch(error => console.log("Fetching requets error: ", error));

    const ctx = $('#myChart');

    var data = {
        datasets: [
            {
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#36A2EB',
                    '#FF6384',
                    '#FFCD56',
                    '#4BC0C0',
                    '#A87DFF',
                    '#66BB6A'
                ]
            }
        ],

        // These labels appear in the legend and in the tooltips when hovering different arcs
        labels: [
            'Plumbing',
            'Laundry Services',
            'Appliance Repair',
            'Electrical Wiring',
            'Household Cleaning',
            'Painting'
        ]
    };

    var options = {
        animation: {
            animateRotate: true
        },
        title: {
            text: 'Fetching data...',
            display: true
        }
    }

    var myDoughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: options
    });

    getNumberOfServices()
        .then(result => {
            console.log(result);
            var newData = [result.data.plumbing_repair, result.data.laundry, result.data.appliance_repair, 
            result.data.electrical_wiring, result.data.household_cleaning, result.data.painting];
            myDoughnutChart.data.datasets[0].data = newData;
            myDoughnutChart.options.title.text = "Service Provider Overview";
            return myDoughnutChart.update();
        })
        .catch(error => console.log("ERROR: " + error.message));

    services.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            $('#loading_review').css('display', 'none');
            if (change.type === "added") {
                const service = change.doc.data();
                const card = '<div class="mdl-cell mdl-cell--4-col">\
                                <div class="demo-card-image mdl-card mdl-shadow--2dp" style="background: url(\''+service.servicePhotoUrl+'\') center / cover;">\
                                  <div class="mdl-card__title mdl-card--expand"></div>\
                                  <div class="mdl-card__actions">\
                                    <span class="demo-card-image__filename">' + service.serviceName + '</span>\
                                  </div>\
                                </div>\
                              </div>';

                $('#service_container').append(card);
            }
        });
    });

    var numItems = 0;

    $('#add_question').click(() => {
        addNewComponents(numItems, 'question');
        numItems++;
    });

    function addNewComponents(numItems, type) {
        var component = '<div class="component" id="question_container_'+numItems+'" type="'+type+'">\
                '+ ((numItems > 0) ? '<button style="margin-left: 108px; display: inline-block; color: red !important;" class="mdl-button mdl-js-button mdl-button--primary delete_question" id="question_container_'+numItems+'" type="button">DELETE THIS '+type+'</button>' : '') +'\
                <br>\
                <div class="information" id="information_'+numItems+'" style="display: '+((type === "question") ? 'block' : 'none')+'">\
                    <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="optional_'+numItems+'">\
                      <input type="checkbox" id="optional_'+numItems+'" class="mdl-checkbox__input">\
                      <span class="mdl-checkbox__label">Optional</span>\
                    </label>\
                    <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="input_'+numItems+'">\
                      <input type="checkbox" id="input_'+numItems+'" class="mdl-checkbox__input">\
                      <span class="mdl-checkbox__label">Show input for \'Others\'</span>\
                    </label>\
                </div>\
                <div class="mdc-text-field mdc-text-field--box service-title" id="service_title_'+numItems+'">\
                  <input type="text" class="mdc-text-field__input" id="title_'+numItems+'" required>\
                  <label class="mdc-floating-label" for="title_'+numItems+'">Enter the Title</label>\
                  <div class="mdc-line-ripple"></div>\
                </div><br>\
                <div class="mdc-text-field mdc-text-field--box service-question" id="service_question_'+numItems+'">\
                  <input type="text" class="mdc-text-field__input" id="question_'+numItems+'" required>\
                  <label class="mdc-floating-label" for="question_'+numItems+'">Enter the Question</label>\
                  <div class="mdc-line-ripple"></div>\
                </div>\
                <br>\
                <div style="margin-left: 24px; display: '+((type === "question") ? 'inline-block' : 'none')+'">\
                    <label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="radio_'+numItems+'">\
                      <input type="radio" id="radio_'+numItems+'" class="mdl-radio__button" name="'+numItems+'" value="radio" '+((type === "question") ? 'required' : '')+'>\
                      <span class="mdl-radio__label">Radio Buttons</span>\
                    </label>\
                    <label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="check_'+numItems+'">\
                      <input type="radio" id="check_'+numItems+'" class="mdl-radio__button" name="'+numItems+'" value="check" '+((type === "question") ? 'required' : '')+'>\
                      <span class="mdl-radio__label">Checkboxes</span>\
                    </label>\
                </div>\
                '+((type === "question") ? '<div>\
                    <div class="answer_container" id="answers_container_'+numItems+'"></div>\
                    <button class="mdl-button mdl-js-button mdl-button--accent mdl-js-ripple-effect add_answer" id="'+numItems+'" type="button">ADD NEW CHOICE</button>\
                </div>' : '')+'\
                <br><br>\
              </div>';

        $('#dialog_service_container').append(component);

        if (type === 'question') {
            addAnswer(numItems);
            addAnswer(numItems);
        }

        initComponents(numItems);
    }
    function initComponents(numItems) {
        componentHandler.upgradeDom();
        new MDCTextField($('#service_title_' + numItems)[0]);
        new MDCTextField($('#service_question_' + numItems)[0]);
    }

    function readURL(input) {
      if (input.files && input.files[0]) {
          var reader = new FileReader();

          reader.onload = function (e) {

            $('#service_image').attr('src', e.target.result);
            fire_image = input.files[0];
          };

          reader.readAsDataURL(input.files[0]);
      }
    }

    $('body').on('change', '#file', e => {
        const input = $(e.currentTarget)[0];
        readURL(input);
    });

    $('body').on('click', '.delete_question', (e) => {
        const id = $(e.currentTarget).attr('id');
        const val = $(e.currentTarget).text();

        swal({
            title: "Confirmation",
            text: "Are you sure to remove this question?",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
        .then((willAdd) => {
            if (willAdd) {
                $('#' + id).remove();
                if (val === "DELETE THIS description") {
                    $('#add_description').removeAttr('disabled');
                }else if (val === "DELETE THIS attachment") {
                    $('#add_attachment').removeAttr('disabled');
                }
            }
            return null;
        })
        .catch(err => console.log(err));

        /*if (confirm("Remove this question?")) { //eslint-disable-line no-alert
            $('#' + id).remove();
            if (val === "DELETE THIS description") {
                $('#add_description').removeAttr('disabled');
            }else if (val === "DELETE THIS attachment") {
                $('#add_attachment').removeAttr('disabled');
            }
        }*/
    });

    $('body').on('click', '.add_answer', e => {
        const id = $(e.currentTarget).attr('id');
        addAnswer(id);
    });

    function addAnswer(num) {
        const input = '<div id="remove_answer_'+num+'">\
                        <div class="mdl-textfield mdl-js-textfield">\
                          <input class="mdl-textfield__input input_answer_'+num+'" type="text" id="answer" placeholder="Enter the choice">\
                          <label class="mdl-textfield__label" for="answer"></label>\
                        </div>\
                        <button type="button" class="mdl-button mdl-js-button mdl-button--icon remove_answer">\
                            <i style="color: red !important;" class="material-icons">clear</i>\
                        </button><br>\
                    </div>';
        $('#answers_container_' + num).append(input);
        componentHandler.upgradeDom();
    }

    $('#add_description').click(e => {
        $(e.currentTarget).attr('disabled', '');
        addNewComponents(numItems, 'description');
        numItems++;
    });
    $('#add_attachment').click(e => {
        $(e.currentTarget).attr('disabled', '');
        addNewComponents(numItems, 'attachment');
        numItems++;
    });

    $('body').on('click', '.remove_answer', e => {
        $(e.currentTarget).parent().remove();
    });

    function uploadFile(keyName, file, service) {
        var metadata = {
          contentType: 'image/jpeg',
        };
        const finalRef = serviceImageRef.child(keyName);
        const uploadTask = finalRef.put(file, metadata);
        uploadTask.on('state_changed', snapshot => console.log("Uploading image..."), error => swal(error), () => {
            console.log("Successfully uploaded");
            uploadTask.snapshot.ref.getDownloadURL()
                .then(downloadURL => {
                    service.servicePhotoUrl = downloadURL;
                    return pushToFirestore(downloadURL, service);
                })
                .catch(error => swal(error));
        });
    }

    function pushToFirestore(downloadURL, service) {
        services.add(service)
            .then(docRef => {
                return hideServiceLoading();
            })
            .catch(error => swal(error));
    }

    $('#service_name').change((e) => {
        const service_name = $(e.currentTarget).val();
        if (service_name === null || service_name !== null && service_name.trim() === "") {
            $('#text_service_name').text("New Service");
        }else if (service_name !== null) {
            $('#text_service_name').text(service_name);
        }
    });

});