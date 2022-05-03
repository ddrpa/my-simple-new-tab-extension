function requestUpdateBackground() {
    chrome.runtime.sendMessage({
        module: 'background',
        action: 'update',
    });
}

function onBackgroundUpdated(payload) {
    const {url, copyright, link} = payload;
    document.body.style.backgroundImage = `url(${url})`;
    const anchor = document.querySelector('footer a');
    anchor.innerText = copyright;
    anchor.href = link;
}

function isBackgroundFresh() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('background', ({background}) => {
            if (background?.lastUpdateDate === new Date().toDateString()) {
                resolve(background);
            } else {
                reject();
            }
        });
    });
}

(function onNewTabOpen() {
    chrome.storage.onChanged.addListener((event) => {
        if (Object.hasOwnProperty.call(event, 'background')) {
            onBackgroundUpdated(event.background.newValue);
        }
    });
    isBackgroundFresh().then(onBackgroundUpdated).catch(requestUpdateBackground);
    // register bookmarks
    [...document.querySelectorAll('#favourites .item-card')].forEach(node => {
        const targetUrl = node.dataset.url;
        node.addEventListener('click', () => {
            chrome.tabs.create({url: targetUrl, active: false});
        });
    });
    // register open all button
    // TODO
})();
