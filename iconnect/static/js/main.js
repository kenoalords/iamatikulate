(function($, window, navigator, swal, google, Noty, Quill){
    var pusher = new Pusher('cfeed7cd889c28123bbd', {
      cluster: 'eu',
      forceTLS: true
    });

    var mapStyle = new google.maps.StyledMapType([
                {
                    "featureType": "administrative",
                    "elementType": "labels.text.fill",
                    "stylers": [
                        {
                            "color": "#444444"
                        }
                    ]
                },
                {
                    "featureType": "landscape",
                    "elementType": "all",
                    "stylers": [
                        {
                            "color": "#f2f2f2"
                        }
                    ]
                },
                {
                    "featureType": "poi",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "road",
                    "elementType": "all",
                    "stylers": [
                        {
                            "saturation": -100
                        },
                        {
                            "lightness": 45
                        }
                    ]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "simplified"
                        }
                    ]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "labels.icon",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "transit",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "all",
                    "stylers": [
                        {
                            "color": "#46bcec"
                        },
                        {
                            "visibility": "on"
                        }
                    ]
                }
            ], {name: 'Styled Map'});

    var channel = pusher.subscribe('iamatikulate');
    channel.bind('sitenotify', function(data) {
        new Noty({
            timeout: 10000,
            text: data.message,
            buttons: [
                Noty.button('View post', 'button is-info is-small', function () {
                    window.location.href = data.link
                }, {id: 'button1', 'data-status': 'ok'}),
            ]
        }).show()
    });

    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    var csrftoken = getCookie('csrftoken');
    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });



    if ( 'geolocation' in navigator ){

        $('body').on('click', 'a#get_location', function(e){
            var geoBtn = $('#get_location'),
                geoInfo = $('span.geo-info'),
                geodata = $('.geodata'),
                location = [];

            e.preventDefault();
            geodata.html('');
            var options = {
                enableHighAccuracy: true,
            }
            isButtonLoading(geoBtn);
            geoInfo.text('fetching coords..');
            navigator.geolocation.getCurrentPosition(function(pos){
                geoInfo.text('translating location...');
                var coords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }
                var geocoder = new google.maps.Geocoder;
                $('#id_latitude').val(parseFloat(coords.lat).toFixed(8))
                $('#id_longitude').val(parseFloat(coords.lng).toFixed(8))
                geocoder.geocode({
                    'location': coords
                }, function(results, status){
                    isButtonFinishedLoading(geoBtn);

                    if ( status === 'OK' ){
                        $.each(results, function(i, obj){
                            if ( obj.types.indexOf('street_address') !== -1 ){
                                location.push(obj);
                            }
                        });
                        var data = extractLocationData(location);
                        if ( data !== undefined ){

                            $('#id_city').val(data.city);
                            $('#id_state').val(data.state);
                            $('#id_country').val(data.country);
                            var payload = data.city + ', ' + data.state + ', ' + data.country + '.';
                            $('#review-location').find('span.text').text(payload);
                            geodata.html('<span class="tag is-medium is-success"><span class="icon"><i class="fas fa-map-marker"></i></span> <span>'+ payload +'</span></span>');
                            geoBtn.hide();
                            geodata.after('<a href="#" style="display:inline-block; margin-top:1em" class="proceed next-button"><span>Proceed</span><span class="icon"><i class="fas fa-arrow-right"></i></span></a>');
                        }

                    }
                    geoInfo.text('');
                })
            }, function(){
                isButtonFinishedLoading(geoBtn);
            }, options);
        });
    } else {
        geoBtn.hide();
    }

    $('body').on('click', '.start-here-action', function(e){
        e.preventDefault();
        if ( window.is_user_logged_in === 'False' ){
            window.location.href = '/accounts/login';
        } else {
            fetchShareModal(e.target.text);
        }
        return false;
    });

    function fetchShareModal(text=null){
        pageIsLoading(true);
        $.get('/share', function(payload){
            pageIsLoading(false);
            var form = $(payload).find('#new-post');
            $(form).css('display', 'block')
            if( text !== null ){
                form.find('h1.title').text(text);
            }
            var modal = createSiteModal();
            $('body').append(modal)
            $('body').addClass('is-overlay');
            $(modal).find('.modal-content').html(form)
            checkLocationFound(form);
        }).fail(function(){
            pageIsLoading(false);
            swal({
                icon: 'error',
                text: 'There was a problem loading the form. Please try again'
            });
        })
    }

    function checkLocationFound(form){
        var form = $(form),
            latitude = form.find('#id_latitude').val(),
            longitude = form.find('#id_longitude').val(),
            city = form.find('#id_city').val(),
            state = form.find('#id_state').val(),
            country = form.find('#id_country').val(),
            step1 = form.find('#step-1');

            if ( latitude !== '' && longitude !== '' && city !== '' && state !== '' && country !== '' ){
                var location = '<p>You are posting from...</p><span class="tag is-medium is-success"><span class="icon"><i class="fas fa-map-marker"></i></span> <span>'+ city +', '+ state +', '+ country +'.</span></span>';
                step1.find('.geodata').html(location).after('<hr><a href="#" style="display:inline-block; height: auto;" class="proceed next-button button is-info is-rounded"><span>Proceed</span><span class="icon"><i class="fas fa-arrow-right"></i></span></a>');
                step1.find('#get_location').hide();
            }
    }

    function pageIsLoading(status=false){
        if(status === true){
            var loader = document.createElement('div');
            loader.classList = 'pageloader';
            $('body').append(loader)
            var loader = $(loader);
            setTimeout(function(){
                loader.addClass('is-active');
            }, 50)
        } else{
            var loader = $('.pageloader');
            loader.removeClass('is-active');
            setTimeout(function(){
                loader.remove()
            }, 1000)
        }
    }

    function createSiteModal(){
        var modal = document.createElement('div'),
            modalBack = document.createElement('div'),
            modalClose = document.createElement('button'),
            modalContent = document.createElement('div');
        modal.classList = 'modal is-active';
        modalBack.classList = 'modal-background';
        modalContent.classList = 'modal-content';
        modalClose.classList = 'modal-close';
        modalClose.setAttribute('id', 'post-form-modal-close');
        modal.setAttribute('id', 'post-modal');
        modal.appendChild(modalBack);
        modal.appendChild(modalContent);
        modal.appendChild(modalClose);
        return modal;
    }

    if ( $('#id_text').length > 0 ){
        $('#id_text').autoExpand({
            animationTime: 10,
            windowPadding: 20
        })
    }

    var steps = 1;
    $('body').on('click', 'a.proceed', function(e){
        var form = $('.conversation-form'),
            boxes = form.find('.box'),
            stepsUI = $('ul.steps').find('li');

        e.preventDefault();
        if( $(this).attr('disabled') === 'disabled' ){
            return false;
        }
        $.each(stepsUI, function(i, el){
            $(el).removeClass('is-active');
            if ( i === steps ){
                $(el).addClass('is-active');
            }
        })
        var current = $(this).parents('.box');
        current.removeClass('is-active');
        current.next('.box').addClass('is-active');
        steps++;
    });

    $('body').on('click', '.go-back', function(e){
        e.preventDefault();
        var form = $('.conversation-form'),
            boxes = form.find('.box'),
            stepsUI = $('ul.steps').find('li');
        if( $(this).attr('disabled') === 'disabled' ){
            return false;
        }
        $.each(stepsUI, function(i, el){
            $(el).removeClass('is-active');
            if ( i === steps ){
                $(el).addClass('is-active');
            }
        })
        var current = $(this).parents('.box');
        current.removeClass('is-active');
        current.prev('.box').addClass('is-active');
        steps--;
    })

    function extractLocationData(loc){
        var location = loc[0].address_components;
        var result = {};
        $.each(location, function(i, val){
            if ( val.types.indexOf('neighborhood') !== -1 ) {
                result.city = val.long_name;
            }
            if ( val.types.indexOf('country') !== -1 ) {
                result.country = val.long_name;
            }
            if ( val.types.indexOf('administrative_area_level_1') !== -1 ) {
                result.state = val.long_name;
            }
        });
        return result;
    }

    function isButtonLoading(btn){
        btn.addClass('is-loading');
        btn.attr('disabled', 'disabled');
    }

    function isButtonFinishedLoading(btn){
        btn.removeClass('is-loading');
        btn.removeAttr('disabled');
    }


    $('body').on('click', 'input[name="category"]', function(e){
        var categoryList = $('#id_category').find('li');
        $.each(categoryList, function(i, val){
            $(val).removeClass('is-checked');
        })
        $(this).parents('li').addClass('is-checked');
        $('#expectation-category').html( 'Share your expectations on <strong>' + $(this).val() + '</strong>' )
        var anchor = $(this).parents('.box').find('a.proceed');
        anchor.removeAttr('disabled');
    });


    $('body').on('keyup', '#id_text', function(e){
        var counter = $('.char-count'),
            reviewText = $('#review-text'),
            textArea = $('#id_text');
        var count = textArea.val().length;
        if( count > 20 ){
            textArea.parents('.box').find('a.proceed').removeAttr('disabled');
        } else {
            textArea.parents('.box').find('a.proceed').attr('disabled', 'disabled');
        }
        reviewText.html(textArea.val())
        counter.text(count);
    });

    $('body').on('submit', '.conversation-form', function(e){
        e.preventDefault();
        var data = $(this).serializeArray(),
            url = $(this).attr('action'),
            formdata = new Object(),
            submitButton = $('#submit-post');
        isButtonLoading(submitButton)
        for ( var i=0; i < data.length; i++ ){
            formdata[data[i].name] = data[i].value
        }
        $.ajax({
            url: url,
            data: formdata,
            method: 'POST'
        }).done(function(response){
            isButtonFinishedLoading(submitButton)
            var success = '<div class="has-text-centered"><figure class="image is-96x96 is-centered"><img src="/static/images/ok-icon.png" alt="Post successful"></figure><h3 class="title is-5">Your expectation or idea was posted successfully</h3><a href="'+response.redirect_to+'" class="button is-info is-rounded">View your post!</a><p></p></div>';
            $('#step-4').html(success);

            setTimeout(function(e){
                activateNotificationModal()
            }, 3000)
        })
    });

    $('body').on('click', '.comment-submit', function(e){
        e.preventDefault();
        var $this = $(this),
            form = $this.parents('form'),
            data = form.serializeArray(),
            action = form.attr('action'),
            formdata = new Object();

        for ( var i=0; i < data.length; i++ ){
            formdata[data[i].name] = data[i].value
        }
        isButtonLoading($this);
        $.post(action, formdata, function(response){
            if( response.status === true ){
                swal({
                    icon: 'success',
                    text: 'Your response was posted successfully!'
                });
                $this.find('textarea').val('')
                isButtonFinishedLoading($this)
                var html = '<div class="comment new">'+
                                '<h4 class="title is-6">'+response.comment.fullname+' <i>responded a few seconds ago</i></h4>'+
                                '<p>'+response.comment.text+'</p>'+
                            '</div>';
                $('.comment-count').text(response.count)
                $('#comments').prepend(html)
                form[0].reset()
            } else {
                swal({
                    icon: 'error',
                    text: 'An error occurred while submitting your response!'
                });
                isButtonFinishedLoading($this)
            }
        });
    })

    if ( $('#map-single').length > 0 ){
        var map = $('#map-single');
        if ( map.data('longitude') !== undefined && map.data('latitude') !== undefined ){
            // Setup loading screen
            var loader = new Image();
            loader.src = static_images_url + '/loader.gif';
            loader.classList.add('loading-icon');
            map.addClass('is-loading');
            map.append(loader);

            // Load google maps
            var coords = {
                lat: parseFloat(map.data('latitude')),
                lng: parseFloat(map.data('longitude'))
            }
            var gmaps = new google.maps.Map(document.getElementById('map-single'), {
                center: coords,
                zoom: 9,
            });
            var mapIcon = {
                url: static_images_url + '/marker-2.png',
                scaledSize: new google.maps.Size(48,48),
                origin: new google.maps.Point(0, 0),
            }
            var marker = new google.maps.Marker({
                position: coords,
                map: gmaps,
                animation: google.maps.Animation.DROP,
                icon: mapIcon,
            });

            var info = new google.maps.InfoWindow({
                content: '<div class="map-info"><p>' + map.data('text') + '</p><p><strong>'+ map.data('fullname') +'</strong></p></div>',
                maxWidth: 320,
            });

            gmaps.mapTypes.set('styled_map', mapStyle);
            gmaps.setMapTypeId('styled_map');

            marker.addListener('click', function(){
                info.open(gmaps, marker)
            })
        }
    }

    $('body').on('click', '#menu', function(e){
        e.preventDefault();
        $(this).toggleClass('is-active');
        $('#main-menu').toggleClass('is-active');
    });

    if ( $('.explore-page').length > 0 ){
        var isShownSocialModal = localStorage.getItem('isShownSocialModal2'),
            socialModal = $('.explore-modal');

        if ( isShownSocialModal === null ){
            setTimeout(function(){
                $('body').addClass('is-overlay');
                socialModal.addClass('is-active');
                localStorage.setItem('isShownSocialModal2', true);
                $('body').on('click','.social-modal-links', function(e){
                    socialModal.removeClass('is-active');
                    swal({
                        icon: 'success',
                        text: 'Thank you for sharing!'
                    });
                });
            }, 10000)
        }
    }

    if ( $('.single-post').length > 0 ){
        var isFollowShown = localStorage.getItem('isFollowShown2'),
            viewModal = $('.view-modal');

        if ( isFollowShown === null ){
            setTimeout(function(){
                $('body').addClass('is-overlay');
                viewModal.addClass('is-active');
                localStorage.setItem('isFollowShown2', true);
                $('body').on('click','.twitter-follow-button', function(e){
                    viewModal.removeClass('is-active');
                    swal({
                        icon: 'success',
                        text: 'Thank you following us!'
                    });
                });
            }, 10000)
        }
    }

    var gmapsExplore, gmapsCoords = [];
    if( $('#map-explore').length > 0 ){

        var mapExplore = $('#map-explore'),
            posts = $('.post'),
            defaultLatLng = {
                lat: 6.524379,
                lng: 3.379206
            };

        gmapsExplore = new google.maps.Map(document.getElementById('map-explore'), {
            center: defaultLatLng,
            zoom: 4
        });
        gmapsExplore.mapTypes.set('styled_map', mapStyle);
        gmapsExplore.setMapTypeId('styled_map');

        $.each(posts, function(i, el){
            var lat = $(el).data('latitude'),
                lng = $(el).data('longitude'),
                text = $(el).data('text');
            if ( lat !== undefined && lng !== undefined ){
                gmapsCoords.push({
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    text: text,
                })
            }
        });
        // console.log(gmapsCoords[0]);
        for( var i = 0; i < gmapsCoords.length; i++ ){
            var coords = {
                lat: gmapsCoords[i].lat,
                lng: gmapsCoords[i].lng
            }
            addMarkerToExploreMap(coords, gmapsCoords[i].text)
        }
    }


    function addMarkerToExploreMap(coords, text){
        var mapIcon = {
            url: static_images_url + '/marker-2.png',
            scaledSize: new google.maps.Size(32,32),
            origin: new google.maps.Point(0, 0),
        }
        var marker = new google.maps.Marker({
            position: coords,
            map: gmapsExplore,
            animation: google.maps.Animation.DROP,
            icon: mapIcon,
        });
        var info = new google.maps.InfoWindow({
            content: '<p>' + text + '</p>',
            maxWidth: 320,
        });
        marker.addListener('click', function(){
            info.open(gmapsExplore, marker);
        })
    }

    if ( $('.like-button').length > 0 ){
        $('body').on('click', '.like-button', function(e){
            e.preventDefault();

            var form = $(this).parents('form'),
                uuid = form.find("#uuid").val(),
                action = form.attr('action'),
                data = {
                    uuid: uuid
                },
                $this = $(this);
            isButtonLoading($this);

            $.post(action, data, function(response){
                if ( response.status === true ){
                    swal({
                        icon: 'success',
                        text: response.message
                    });
                    form.find('.like-count').text(response.count)
                    setTimeout(function(e){
                        activateNotificationModal()
                    }, 3000)
                } else {
                    swal({
                        icon: 'error',
                        text: response.message
                    })
                }
                isButtonFinishedLoading($this)

            });
        });
    }

    $('body').on('click', '.prevent-action', function(e){
        e.preventDefault();
    });

    if ( $(window).outerWidth() < 800 ){
        if ( $('.is-categories').length > 0 ){
            $('body').on('click', '.topic-menu', function(e){
                e.preventDefault();
                var menu = $(this).next('.menu-list');
                menu.slideToggle('fast')
            })
        }
    }

    if ( $('#new-post').length > 0 ){
        $('#new-post').show();
    }

    $('body').on('submit', '.approve-post-form', function(e){
        e.preventDefault();
        var button = $(this).find('button'),
            url = $(this).attr('action'),
            id = $(this).find('.post-id').val(),
            data = {
                id: id
            };
        isButtonLoading(button)
        $.post(url, data, function(response){
            if( response.status === true ){
                swal({
                    icon: 'success',
                    title: response.message
                });
            } else {
                swal({
                    icon: 'error',
                    title: response.message
                });
            }
            button.hide();
        })
    });

    $('body').on('click', '.like-comment', function(e){
        e.preventDefault();
        var $this = $(this),
            form = $this.parents('form'),
            url = form.attr('action'),
            comment = form.find('.comment-id').val(),
            comment_id = parseInt(comment);
        isButtonLoading($this)
        if ( isNaN(comment_id) ){
            swal({
                icon: 'error',
                text: 'Sorry! we couldn\'t process your request'
            })
            isButtonFinishedLoading($this)
            return false;
        }

        var data = {
            comment: comment_id
        }
        $.post(url, data, function(response){
            if ( response.status === true ){
                form.find('span.like-count').text(response.count)
                swal({
                    icon: 'success',
                    text: response.message
                })
            } else {
                swal({
                    icon: 'error',
                    text: response.message
                })
            }
            isButtonFinishedLoading($this)
        });
    })

    function urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
                        .replace(/\-/g, '+')
                        .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Service worker and Push Notifications
    var swReg,
        appPublicKey = 'BJNzehg85svbtUwvgr9ybSCfvnVSTnKBy8YhDiNRY016BEp-wh0PpGAOsO1f8f40yF3MhwmLCBcVvoVxdocbx_A',
        subButton = $('.notification-button'),
        isSubscribed;
    if ( 'serviceWorker' in navigator ){
        navigator.serviceWorker.register('/sw.js').then(function(reg){
            swReg = reg;
        }).catch(function(error){
            console.log('Error! service worker registration');
        })
    }

    $('.notification-button').on('click', function(e){
        e.preventDefault();
        if ( isSubscribed === false ){
            subscribeUser();
        }
    })
    $('body').on('click', '.modal-close', function(e){
        e.preventDefault();
        $('body').removeClass('is-overlay');
        var $this = $(this);
        $this.parents('.modal').removeClass('is-active');
        if ( $this.attr('id') === 'post-form-modal-close' ){
            $this.parents('.modal').remove();
        }
    });

    function activateNotificationModal(){
        if ( sessionStorage.getItem('notify') === null ){
            swReg.pushManager.getSubscription().then(function(subscription){
                isSubscribed = !(subscription === null)
                if ( isSubscribed === false && is_user_logged_in == 'True' ){
                    $('#notify-modal').addClass('is-active');
                    $('body').addClass('is-overlay');
                    sessionStorage.setItem('notify', 'true');
                    updateButton()
                } else {
                    updateButton()
                }
            }).catch(function(e){
                console.log(e);
            });
        }
    }

    function updateButton(){
        if ( isSubscribed === false ){
            subButton.find('i').removeClass('fa-bell-slash').addClass('fa-bell')
            subButton.find('span').eq(1).text('Notify me')
        } else {
            subButton.find('i').removeClass('fa-bell').addClass('fa-bell-slash')
            subButton.find('span').eq(1).text('Turn off')
        }
        subButton.removeAttr('disabled')
    }

    function subscribeUser(){
        subButton.attr('disabled', 'disabled');
        var applicationServerKey = urlB64ToUint8Array(appPublicKey);
        swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
        }).then(function(subscription){
            var data = {
                endpoint: JSON.stringify(subscription)
            }
            $.post('/push-subscribe', data, function(res){
                swal({
                    icon: 'success',
                    text: 'You have subscribed for push notifications'
                });
                $('body').removeClass('is-overlay');
                subButton.parents('.modal').removeClass('is-active');
            });
            isSubscribed = true;
        }).catch(function(err){
            console.log(err);
        })
    }

    if ( $('.slick').length > 0 ){
        $('.slick').slick({
            adaptiveHeight: true,
            dots: true,
            autoplay: true,
            arrows: false,
        });
    }

    if ( $('#custom-editor').length > 0 ) {
        var options = {
                placeholder: 'Compose an epic email...',
                theme: 'snow'
            };
        var container = $('#custom-editor')[0];
        var editor = new Quill(container, options);
        $('body').on('click', '#email-broadcast-submit', function(e){
            e.preventDefault();
            var btn = $(this),
                url = btn.parents('form').attr('action'),
                data = {
                    subject: $('#id_subject').val(),
                    body: editor.root.innerHTML,
                    sender: $('#id_sender').val()
                };
            isButtonLoading(btn)
            $.post(url, data, function(response){
                if ( response.status === true ){
                    swal({
                        icon: 'success',
                        text: response.message
                    });
                    $('#id_subject').val('');
                    sender: $('#id_sender').val('');
                    editor.root.innerHTML = '';
                } else {
                    swal({
                        icon: 'error',
                        text: response.message
                    })
                }
                isButtonFinishedLoading(btn);
            });
        })
    }

    /*--------------------------------------------------------
    *   Comment Reply Block
    ----------------------------------------------------------*/
    $('body').on('click', '.reply-comment', function(e){
        e.preventDefault();
        var replyButton = $(this),
            commentID = replyButton.data('id'),
            commentUrl = replyButton.data('post-url'),
            commentParent = replyButton.parents('.comment');
            replyButton.attr('disabled', 'disabled')
        $.get(commentUrl, function(response){
            var form = $(response).find('#comment-reply');
            form.find('.button').before('<a href="#" class="close-reply button is-white is-small">Close</a>');
            var submitButton = form.find('button.button');
            var textarea = form.find('#id_text');

            submitButton.attr('disabled', 'disabled')
            textarea.on('keyup', function(e){
                e.preventDefault();
                if ( textarea.val().length > 2 ){
                    submitButton.removeAttr('disabled');
                }
            });

            submitButton.on('click', function(e){
                e.preventDefault();
                form.addClass('is-loading');
                isButtonLoading(submitButton);
                var text = textarea.val(),
                    postUrl = form.attr('action'),
                    data = {
                        'text' : text
                    };
                $.post(postUrl, data, function(response){
                    var template = $('#comment-reply-template').html();
                    var html = template.replace(/__avatar__/g, response.avatar).replace(/__text__/g, response.text).replace(/__fullname__/g, response.fullname);
                    if ( commentParent.find('.replies').length > 0 ){
                        commentParent.find('.replies').append(html)
                        form.slideUp('fast', function(){
                            form.remove();
                            replyButton.removeAttr('disabled')
                        });
                    } else {
                        var replies = document.createElement('div');
                        replies.classList = 'replies'
                        commentParent.append(replies)
                        $(replies).append(html);
                        form.slideUp('fast', function(){
                            form.remove();
                            replyButton.removeAttr('disabled')
                        });
                    }
                })
            });

            // Close form
            $('body').on('click', '.close-reply', function(e){
                e.preventDefault();
                var $this = $(this);
                $this.parents('form').slideUp('fast', function(){
                    $this.parents('form').remove();
                    replyButton.removeAttr('disabled');
                });
            });

            commentParent.append(form);
        })
    })

})(jQuery, window, navigator, swal, google, Noty, Quill);
