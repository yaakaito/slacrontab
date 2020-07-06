type Data = {
    id: string,
    name: string,
    url: string,
    stock: number,
}

export default async(slack: { post: (args: any) => void }, db: FirebaseFirestore.Firestore) => {
    const targets = [
//         'channel-oko',
        // 'hareruya-heath'
//         'hareruya-wrenn'
        'single-start-grim'
// >>>>>>> add dragon start
    ]
    const collection = db.collection('alert-stocks')
    return Promise.all(targets.map(async(target) => {
        console.info(`[alert-stocks] checking ${target}`)
        const f = require(`./parsers/${target}`) as () => Promise<Data>
        const { id, name, url, stock } = await f()
        console.log(stock)
        const ref = collection.doc(id)
        const before = (await ref.get()).data() as Data | undefined
        if (!before || (before && before.stock > stock)) {
            await slack.post({
                channel: '#tracker',
                username: 'stock alert',
                icon_emoji: 'alert_shamiko',
                text: `<@yaakaito> ${name}の在庫が減ったよ！(${before?.stock ?? 0} → ${stock})\n${url}`
            })
            ref.set({
                id,
                name,
                url,
                stock
            })
        }
    }))

}
