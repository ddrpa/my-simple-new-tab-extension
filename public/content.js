function requestUpdateBackground() {
    ext.runtime.sendMessage({
        module: 'background',
        action: 'update',
    });
}

function onBackgroundUpdated(payload) {
    if (!payload) {
        return;
    }
    const { url, copyright, link } = payload;
    document.body.style.backgroundImage = `url(${url})`;
    const anchor = document.querySelector('footer a');
    anchor.innerText = copyright;
    anchor.href = link;
}

async function isBackgroundFresh() {
    const { background } = await ext.storage.local.get('background');
    if (background?.lastUpdateDate === new Date().toDateString()) {
        return background;
    }
    throw new Error('stale');
}

function hostnameOf(value) {
    try {
        return new URL(value).hostname;
    } catch {
        return value;
    }
}

function pickIcon(doc, pageUrl) {
    const pageOrigin = new URL(pageUrl).origin;
    const icons = [];
    for (const link of doc.querySelectorAll('link[rel][href]')) {
        const rel = link.getAttribute('rel').toLowerCase();
        if (!rel.includes('icon')) {
            continue;
        }
        try {
            const iconUrl = new URL(link.getAttribute('href'), pageUrl);
            icons.push({
                url: iconUrl.href,
                sameOrigin: iconUrl.origin === pageOrigin,
                apple: rel.includes('apple-touch-icon'),
            });
        } catch {
            // Ignore malformed icon addresses declared by the page.
        }
    }
    icons.sort((a, b) => Number(b.sameOrigin) - Number(a.sameOrigin) || Number(b.apple) - Number(a.apple));
    return icons[0]?.url || '';
}

async function resolveIcon(pageUrl) {
    const page = new URL(pageUrl);
    const fallback = new URL('/favicon.ico', page.origin).href;
    try {
        const response = await fetch(page.origin + '/', { credentials: 'omit' });
        if (!response.ok) {
            return fallback;
        }
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return pickIcon(doc, response.url || page.origin) || fallback;
    } catch {
        return fallback;
    }
}

function showIcon(img, letter, url) {
    img.hidden = false;
    letter.hidden = true;
    img.src = url;
}

function hideIcon(img, letter) {
    img.hidden = true;
    letter.hidden = false;
    img.removeAttribute('src');
}

async function applyIcon(item, img, letter, cachedIcon, generation) {
    const useIcon = async (iconUrl) => {
        if (generation !== renderGeneration || !iconUrl) {
            return;
        }
        const current = await loadFavourites();
        if (generation !== renderGeneration || !current.some((entry) => entry.id === item.id)) {
            return;
        }
        img.addEventListener('load', () => rememberIcon(item.id, iconUrl), { once: true });
        img.addEventListener('error', () => hideIcon(img, letter), { once: true });
        showIcon(img, letter, iconUrl);
    };

    if (cachedIcon) {
        img.addEventListener('error', async () => {
            hideIcon(img, letter);
            await useIcon(await resolveIcon(item.url));
        }, { once: true });
        showIcon(img, letter, cachedIcon);
        return;
    }
    await useIcon(await resolveIcon(item.url));
}

let renderGeneration = 0;

async function renderFavourites() {
    const generation = ++renderGeneration;
    const section = document.getElementById('favourites');
    const container = section.querySelector('.container');
    const favourites = await loadFavourites();
    if (generation !== renderGeneration) {
        return;
    }
    container.replaceChildren();
    if (!favourites.length) {
        section.hidden = true;
        return;
    }
    section.hidden = false;
    const cache = await loadIconCache();
    if (generation !== renderGeneration) {
        return;
    }
    for (const item of favourites) {
        const card = document.createElement('div');
        card.className = 'item-card';

        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        const letter = document.createElement('span');
        letter.className = 'letter';
        const hostname = hostnameOf(item.url);
        letter.textContent = hostname.slice(0, 1).toUpperCase();
        const img = document.createElement('img');
        img.alt = '';
        img.hidden = true;
        thumbnail.append(letter, img);

        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = hostname;

        const website = document.createElement('p');
        website.className = 'website';
        website.textContent = item.url;

        card.append(thumbnail, description, website);
        card.addEventListener('click', () => {
            ext.tabs.create({ url: item.url, active: false });
        });
        container.append(card);
        applyIcon(item, img, letter, cache[item.id], generation);
    }
}

ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.prototype.hasOwnProperty.call(changes, 'background')) {
        onBackgroundUpdated(changes.background.newValue);
    }
    if (area === 'sync' && Object.prototype.hasOwnProperty.call(changes, 'favourites')) {
        renderFavourites();
    }
});

isBackgroundFresh().then(onBackgroundUpdated).catch(requestUpdateBackground);
renderFavourites();
