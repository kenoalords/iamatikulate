(function($, window, navigator, swal, google, Noty){
    var pusher = new Pusher('cfeed7cd889c28123bbd', {
      cluster: 'eu',
      forceTLS: true
    });

    var channel = pusher.subscribe('iamatikulate');
    channel.bind('sitenotify', function(data) {
        new Noty({
            timeout: 3000,
            text: data.message,
            layout: 'bottomRight',
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

    var geoBtn = $('#get_location'),
        geoInfo = $('span.geo-info'),
        geodata = $('.geodata'),
        location = [];

    if ( 'geolocation' in navigator ){
        $('body').on('click', 'a#get_location', function(e){
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
                            geodata.after('<a href="#" class="proceed next-button"><span>Proceed</span><span class="icon"><i class="fas fa-arrow-right"></i></span></a>');
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

    var form = $('.conversation-form'),
        boxes = form.find('.box'),
        steps = 1,
        stepsUI = $('ul.steps').find('li');
    $('body').on('click', 'a.proceed', function(e){
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

    var categoryList = $('#id_category').find('li');
    $('body').on('click', 'input[name="category"]', function(e){
        $.each(categoryList, function(i, val){
            $(val).removeClass('is-checked');
        })
        $(this).parents('li').addClass('is-checked');
        $('#expectation-category').html( 'Share your expectations on <strong>' + $(this).val() + '</strong>' )
        var anchor = $(this).parents('.box').find('a.proceed');
        anchor.removeAttr('disabled');
    });

    var counter = $('.char-count'),
        reviewText = $('#review-text'),
        textArea = $('#id_text');
    $('body').on('keyup', '#id_text', function(e){
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
                zoom: 10,
            });
            var mapIcon = {
                url: static_images_url + '/marker.png',
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

    var gmapsExplore, gmapsCoords = [];
    if( $('#map-explore').length > 0 ){
        var mapExplore = $('#map-explore'),
            posts = $('.post'),
            defaultLatLng = {
                lat: 9.076479,
                lng: 7.398574
            };

        gmapsExplore = new google.maps.Map(document.getElementById('map-explore'), {
            center: defaultLatLng,
            zoom: 3
        });

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
            url: static_images_url + '/marker.png',
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
    $('.modal-close').on('click', function(e){
        e.preventDefault();
        $('body').removeClass('is-overlay');
        $(this).parents('.modal').removeClass('is-active')
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

})(jQuery, window, navigator, swal, google, Noty);
