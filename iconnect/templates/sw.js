let CACHE_STATIC = 'static-v6.5';
let CACHE_DYNAMIC = 'dynamic-v2.1';

self.addEventListener('install', (event) => {
    // event.waitUntil(
    //     caches.open(CACHE_STATIC).then( (cache) => {
    //         return cache.addAll([
    //
    //         ]);
    //     }).catch( (err) => {
    //         console.log(err)
    //     })
    // );
});

self.addEventListener('activate', (event) => {
    // event.waitUntil(
    //     caches.keys().then( (keyList) => {
    //         return Promise.all(
    //             keyList.map( function(key) {
    //                 if( key !== CACHE_STATIC ){
    //                     return caches.delete(key);
    //                 }
    //             })
    //         )
    //     })
    // )
    // return event.waitUntil( self.clients.claim() );
});

self.addEventListener('fetch', (event) => {
    // event.respondWith(
    //     caches.match(event.request).then( function(response){
    //         if ( response ) {
    //             return response;
    //         } else {
    //             return fetch(event.request).then( (res) => {
    //                 if ( event.request.url.match(/\.(jpeg|jpg|gif|png|css|js|svg|woff|woff2)$/) ){
    //                     return caches.open(CACHE_STATIC).then( (cache) => {
    //                         cache.put(event.request.url, res.clone());
    //                         return res;
    //                     }).catch((err)=>{
    //                         console.log(err)
    //                     })
    //                 } else {
    //                     return res;
    //                 }
    //             }).catch( (err) => {
    //                 return caches.open(CACHE_STATIC).then( (cache) => {
    //                     return cache.match('/offline.html');
    //                 })
    //             });
    //         }
    //     }).catch( (err) => {
    //         return cache.match('/offline.html');
    //     })
    // );
});

self.addEventListener('push', function(event){
    data = event.data.json();
    var options = {
        icon: '/static/images/icon.jpg',
        badge: '/static/images/badge.jpg',
        body: 'Click to view',
        vibrate: [300, 100, 800],
        data: {
            link: data.link
        }
    }
    event.waitUntil(self.registration.showNotification(data.body, options));
});

self.addEventListener('notificationclick', function(event){
    var link = event.notification.data.link;
    event.notification.close();
    event.waitUntil(clients.matchAll({
        type: "window"
      }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url == link && 'focus' in client)
            return client.focus();
        }
        if (clients.openWindow)
          return clients.openWindow(link);
      })
    );
})
