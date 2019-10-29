import program from 'commander'
import axios from 'axios'
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
        const db = admin.firestore();
        const slack = {
            post: async(args: any) => {
                await axios.post(`https://hooks.slack.com/services/${program.slack}`, JSON.stringify(args))
            }
        }
        const job = require('../jobs/track-whisper').default as Function
        job(slack, db)
    } catch (e) {
        console.error(e)
        return process.exit(2)
    }
}
main()
