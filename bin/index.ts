import program from 'commander'
import axios from 'axios'
import cheerio from 'cheerio'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { Base64 } from 'js-base64'
import admin from 'firebase-admin'

program.option('--slack [type]', 'slack incoming hook key')
program.option('--configs [type]', 'configs dir')
program.option('--firebase [type]', 'firebase json')
program.parse(process.argv)

const main = async() => {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(Base64.decode(program.firebase)))
        });
    } catch (e) {
        return process.exit(2)
    }
    const db = admin.firestore();
    const configDir = path.resolve(process.cwd(), program.configs)
    const files = fs.readdirSync(configDir)
    const configs = files.map(file => yaml.safeLoad(fs.readFileSync(path.resolve(configDir, file), 'utf8')))
    configs[0].tracks.forEach(async(config: { url: string }) => {
        const data = await parse(config)
        const hash = getHash(data.name)
        const ref = db.collection('tracks').doc(hash)
        const before = await ref.get()
        const beforeData = before.data() as typeof data

        if (!beforeData) {
            ref.set({
                ...data,
                options: {
                    vector: 0
                }
            })
            await notify(data, {
                icon: 'new',
                beforePrice: 0,
                color: '#18A558'
            })
            return
        }

        // 値下がり
        if (beforeData.price > data.price) {
            ref.set({
                ...data,
                options: {
                    vector: -1
                }
            })
            await notify(data, {
                icon: 'arrow_heading_down',
                beforePrice: beforeData.price,
                color: '#D01110'
            })
            return
        }

        // 値上がり
        if (beforeData.price < data.price) {
            ref.set({
                ...data,
                options: {
                    vector: +1
                }
            })
            await notify(data, {
                icon: 'arrow_heading_up',
                beforePrice: beforeData.price,
                color: '#18A558'
            })
            return
        }

    })
}

const getHash = (name: string) => Base64.encode(name)

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
        price: parseInt($($tr.children[1]).text().replace(/,/, '')),
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

    return {
        ...target,
        name
    }
}

const notify = async(target: ReturnType<typeof parse> extends Promise<infer T> ? T : never, options: {
    icon: string,
    beforePrice: number,
    color: string
}) => {
    try {
        console.log('aa')
        await axios.post(`https://hooks.slack.com/services/${program.slack}`, JSON.stringify({
            attachments: [
                {
                    title: `:${options.icon}: ${target.name}`,
                    text: `<${target.link}|${target.shop}>`,
                    color: options.color,
                    fields: [
                        {
                            title: 'Price',
                            value: `${target.price}`,
                            short: true,
                        },
                        {
                            title: 'Before price',
                            value: `${options.beforePrice}`,
                            short: true,
                        },
                        {
                            title: 'Condition',
                            value: `${target.condition}`,
                            short: true,
                        },
                        {
                            title: 'Lang',
                            value: `${target.lang}`,
                            short: true,
                        },
                        {
                            title: 'Exp',
                            value: `${target.exp}`,
                            short: true,
                        },
                    ]

                }
            ],
            // "text": `:${options.icon}: ${target.name} ${target.shop} ${target.price} ${target.exp} ${target.lang} ${target.condition} ${target.link}`
        }))
        return target
    } catch(e) {
        console.log(e)
        return false
    }
}
main()
