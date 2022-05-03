const path = require('path');
const fs = require('fs');
const {execSync} = require('child_process');
const pug = require('pug');

const sites = [{
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    backgroundImage: 'ycombinator.ico',
}, {
    name: 'InfoQ',
    url: 'https://www.infoq.cn/',
    backgroundImage: 'infoq.webp',
}, {
    name: 'Thoughtworks 洞见',
    url: 'https://insights.thoughtworks.cn/',
    backgroundImage: 'thoughtworks.png',
}, {
    name: 'Solidot',
    url: 'https://www.solidot.org/',
    backgroundImage: 'solidot.jpeg',
}]

const locals = {
    sites: sites.map(site => ({
        description: site.name,
        url: site.url,
        style: `background-image: url('vendor/${site.backgroundImage}')`,
    })),
}

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}
// copy /public/* to /dist
execSync(`cp -rf ${path.resolve('public', '*')} ${path.resolve('dist')}`);

// generate style file from scss source
execSync(`sass ${path.resolve('style.scss')}:${path.resolve('dist', 'style.css')}`);

// generate html from pug template
const indexHtml = pug.compileFile(path.resolve('index.pug'))(locals);
fs.writeFileSync(path.resolve('dist', 'index.html'), indexHtml);
