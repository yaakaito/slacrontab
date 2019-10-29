import axios from 'axios'
import cheerio from 'cheerio'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
// @ts-ignore
import sum from 'hash-sum'

export default async(slack: { post: (args: any) => void }, db: FirebaseFirestore.Firestore) => {
    const configDir = path.resolve(__dirname, './config')
    const files = fs.readdirSync(configDir)
    const configs = files.map(file => yaml.safeLoad(fs.readFileSync(path.resolve(configDir, file), 'utf8')))
    configs.forEach((config, index) => {
        config.tracks.forEach(async(config: { url: string }) => {
            const data = await parse(config)
            console.info(`checking ${files[index]} / ${data.name}`)
            const hash = getHash(data.url)
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
                await notify(slack, data, {
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
                await notify(slack, data, {
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
                await notify(slack, data, {
                    icon: 'arrow_heading_up',
                    beforePrice: beforeData.price,
                    color: '#18A558'
                })
                return
            }

        })
    })
}

const getHash = (name: string) => sum(name)

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
        url: config.url
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

const notify = async(slack: { post: (args: any) => void }, target: ReturnType<typeof parse> extends Promise<infer T> ? T : never, options: {
    icon: string,
    beforePrice: number,
    color: string
}) => {
    try {
        await slack.post({
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
                    ],
                    actions: [
                        {
                            type: 'button',
                            text: target.shop,
                            url: target.link,
                        },
                        {
                            type: 'button',
                            text: 'View whisper',
                            url: target.url,

                        }
                    ]

                }
            ],
        })
        return target
    } catch(e) {
        console.log(e)
        return false
    }
}
