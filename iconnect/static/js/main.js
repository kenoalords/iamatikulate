(function($, window, navigator, swal, google){

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
            formdata = new Object();
        for ( var i=0; i < data.length; i++ ){
            formdata[data[i].name] = data[i].value
        }
        $.ajax({
            url: url,
            data: formdata,
            method: 'POST'
        }).done(function(response){
            swal({
                title: "Hell Yeah!!!",
                text: "Your expectation was successfully posted",
                icon: "success",
                buttons: {
                    view: {
                        text: 'View your post!',
                        value: 'view'
                    },
                    again: {
                        text: 'Post another',
                        value: 'again'
                    }
                }
            }).then(function(val){
                switch (val) {
                    case 'view':
                        window.location.href = response.redirect_to;
                        break;
                    case 'again':
                        window.location.reload();
                        break;
                    default:
                        break;
                }
            })
        })
    });

    $('body').on('submit', '.comment-form', function(e){
        e.preventDefault();
        var $this = $(this),
            button = $this.find('button[type="submit"]'),
            data = $this.serializeArray(),
            action = $this.attr('action'),
            formdata = new Object();

        for ( var i=0; i < data.length; i++ ){
            formdata[data[i].name] = data[i].value
        }
        isButtonLoading(button);
        $.post(action, formdata, function(response){
            if( response.status === true ){
                swal({
                    icon: 'success',
                    title: 'Comment posted successfully!'
                });
                $this.find('textarea').val('')
                isButtonFinishedLoading(button)
                var html = '<div class="comment new">'+
                                '<h4 class="title is-6">'+response.comment.fullname+' <i>commented a few seconds ago</i></h4>'+
                                '<p>'+response.comment.text+'</p>'+
                            '</div>';
                $('.comment-count').text(response.count)
                $('#comments').prepend(html)
            } else {
                swal({
                    icon: 'error',
                    title: 'An error occurred while submitting your comment!'
                });
                isButtonFinishedLoading(button)
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
                        title: response.message
                    });
                    form.find('.like-count').text(response.count)
                } else {
                    swal({
                        icon: 'error',
                        title: response.message
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
    })

})(jQuery, window, navigator, swal, google);
