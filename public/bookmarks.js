const ext = globalThis.browser ?? globalThis.chrome;

const FAVOURITES_KEY = 'favourites';
const ICON_CACHE_KEY = 'favouriteIcons';

function favouriteKey(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return '';
        }
        return url.href;
    } catch {
        return '';
    }
}

function parseFavouriteLines(text, existing) {
    const existingByUrl = new Map();
    for (const item of existing) {
        const key = favouriteKey(item.url);
        if (key && !existingByUrl.has(key)) {
            existingByUrl.set(key, item);
        }
    }

    const errors = [];
    const seen = new Set();
    const next = [];
    const keptIds = new Set();
    const lines = String(text).split(/\r?\n/);

    lines.forEach((raw, index) => {
        const line = raw.trim();
        if (!line) {
            return;
        }
        const key = favouriteKey(line);
        if (!key) {
            errors.push(index + 1);
            return;
        }
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        const previous = existingByUrl.get(key);
        const id = previous ? previous.id : crypto.randomUUID();
        keptIds.add(id);
        next.push({ id, url: line });
    });

    const removedIds = existing
        .map((item) => item.id)
        .filter((id) => !keptIds.has(id));

    return { errors, next, removedIds };
}

async function loadFavourites() {
    const stored = await ext.storage.sync.get(FAVOURITES_KEY);
    const list = stored[FAVOURITES_KEY];
    return Array.isArray(list) ? list : [];
}

async function loadIconCache() {
    const stored = await ext.storage.local.get(ICON_CACHE_KEY);
    const cache = stored[ICON_CACHE_KEY];
    return cache && typeof cache === 'object' ? cache : {};
}

async function rememberIcon(id, iconUrl) {
    const cache = await loadIconCache();
    if (cache[id] === iconUrl) {
        return;
    }
    cache[id] = iconUrl;
    await ext.storage.local.set({ [ICON_CACHE_KEY]: cache });
}

async function forgetIcons(ids) {
    if (!ids.length) {
        return;
    }
    const cache = await loadIconCache();
    let changed = false;
    for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(cache, id)) {
            delete cache[id];
            changed = true;
        }
    }
    if (changed) {
        await ext.storage.local.set({ [ICON_CACHE_KEY]: cache });
    }
}

async function saveFavouritesFromText(text) {
    const existing = await loadFavourites();
    const parsed = parseFavouriteLines(text, existing);
    if (parsed.errors.length) {
        return { ok: false, lines: parsed.errors };
    }
    try {
        await ext.storage.sync.set({ [FAVOURITES_KEY]: parsed.next });
        await forgetIcons(parsed.removedIds);
        return { ok: true };
    } catch (error) {
        return { ok: false, message: error && error.message ? error.message : String(error) };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseFavouriteLines,
        favouriteKey,
        saveFavouritesFromText,
    };
}
