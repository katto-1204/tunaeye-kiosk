const fs = require('fs')
const s = fs.readFileSync('new ui/index (4).html', 'utf8')
const i = s.indexOf('Recent <em>records')
fs.writeFileSync('tmp-extract-out.txt', s.slice(i, i + 4500))
