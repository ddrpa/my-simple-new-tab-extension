const urls = document.getElementById('urls');
const message = document.getElementById('message');
const save = document.getElementById('save');

function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('error', Boolean(isError));
}

async function fillEditor() {
    const favourites = await loadFavourites();
    urls.value = favourites.map(formatFavourite).join('\n');
}

save.addEventListener('click', async () => {
    save.disabled = true;
    const result = await saveFavouritesFromText(urls.value);
    save.disabled = false;
    if (result.ok) {
        setMessage('已保存', false);
        return;
    }
    if (result.lines) {
        setMessage(`第 ${result.lines.join('、')} 行不是有效的网址或 Markdown 链接`, true);
        return;
    }
    setMessage(`保存失败：${result.message}`, true);
});

fillEditor().catch((error) => {
    setMessage(`读取失败：${error.message}`, true);
});
