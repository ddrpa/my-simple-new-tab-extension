const path = require('path');
const fs = require('fs');
const {execSync} = require('child_process');
const pug = require('pug');
const sass = require('sass');

const sites = [{
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    backgroundImage: 'ycombinator.ico',
}, {
    name: 'InfoQ',
    url: 'https://www.infoq.cn/',
    backgroundImage: 'infoq.webp',
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
const stylePath = path.resolve('style.scss');
const cssPath = path.resolve('dist', 'style.css');
const result = sass.compile(stylePath, { style: 'expanded', sourceMap: true });
fs.writeFileSync(cssPath, result.css + '/*# sourceMappingURL=style.css.map */\n');
fs.writeFileSync(cssPath + '.map', JSON.stringify(result.sourceMap));

// generate html from pug template
const indexHtml = pug.compileFile(path.resolve('index.pug'))(locals);
fs.writeFileSync(path.resolve('dist', 'index.html'), indexHtml);
