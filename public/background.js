// optionalConverter should be a function that takes oldValue and changes to gets a newValue.
// otherwise, storage will be updated by Object.assign({}, oldValue, changes).
async function updateBrowserStorage(namespace, changes, optionalConverter) {
    const result = await chrome.storage.local.get(namespace);
    const oldValue = result[namespace] ?? {};
    const newValue = optionalConverter === undefined
        ? Object.assign({}, oldValue, changes)
        : optionalConverter(oldValue, changes);
    return chrome.storage.local.set({ [namespace]: newValue });
}

function defaultBackground() {
    return {
        url: '',
        copyright: '',
        link: '',
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set
        // It's generally not possible to store other types, such as Function, Date, RegExp, Set, Map, ArrayBuffer,
        // and so on. Some of these unsupported types will restore as an empty object, and some cause set() to
        // throw an error. The exact behavior here is browser-specific.
        lastUpdateDate: new Date(1970, 0, 1).toDateString(),
    };
}

// One write, and only when the key is missing, so install/update does not race with or wipe a cached image.
let storageReady = Promise.resolve();

function initializeLocalStorage() {
    storageReady = storageReady.then(async () => {
        const stored = await chrome.storage.local.get('background');
        if (stored.background) {
            return;
        }
        await chrome.storage.local.set({ background: defaultBackground() });
    }).catch((error) => {
        console.error(error);
    });
    return storageReady;
}

function getBackgroundImageFromAPI() {
    return fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&uhd=1&mkt=zh-CN')
        .then((response) => response.json())
        .then((res) => {
            const url = 'https://cn.bing.com' + res.images[0].urlbase + '_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4';
            const copyright = res.images[0].copyright;
            const link = res.images[0].copyrightlink;
            return { url, copyright, link };
        });
}

function updateBackgroundImage() {
    return getBackgroundImageFromAPI().then((payload) =>
        updateBrowserStorage('background', { ...payload, lastUpdateDate: new Date().toDateString() })
    );
}

chrome.runtime.onInstalled.addListener(() => {
    initializeLocalStorage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.module === 'background') {
        if (request.action === 'update') {
            storageReady.then(() => updateBackgroundImage()).catch(console.error);
        }
    }
    return true;
});
