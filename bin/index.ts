import program from 'commander'
import axios from 'axios'
import cheerio from 'cheerio'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

program.option('--slack [type]', 'slack incoming hook key')
program.option('--configs [type]', 'slack incoming hook key')
program.parse(process.argv)

const main = async() => {
    const configDir = path.resolve(process.cwd(), program.configs)
    const files = fs.readdirSync(configDir)
    const configs = files.map(file => yaml.safeLoad(fs.readFileSync(path.resolve(configDir, file), 'utf8')))
    await configs[0].tracks.map((config: { url: string }) => {
        return parse(config)
    })
}

const parse = async(config: {
    url: string,
    name?: string,
    exp?: { ignore?: string[] }
}) => {
    const response = await axios.get<string>(config.url)
    const $ = cheerio.load(response.data)
    const name = config.name || $('.wg-title').text()
    const data = $('.table-main > tbody > tr').get().map($tr => ({
        shop: $($tr.children[0]).text(),
        price: $($tr.children[1]).text(),
        exp: $($tr.children[2]).text() || 'Promo',
        lang: $($tr.children[3]).text(),
        condition: $($tr.children[6]).text(),
        link: $($tr.children[7]).find('a').attr('href'),
    }))

    const target = data.filter(d => {
        if (config.exp && config.exp.ignore && config.exp.ignore.indexOf(d.exp) >= 0) {
            return false
        }
        return true
    })[0] || null
    if (!target) {
        return false
    }

    try {
        await axios.post(`https://hooks.slack.com/services/${program.slack}`, JSON.stringify({
            "text": `${name} ${target.shop} ${target.price} ${target.exp} ${target.lang} ${target.condition} ${target.link}`
        }))
        return true
    } catch(e) {
        return false
    }
}
main()
