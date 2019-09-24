import program from 'commander'
import axios from 'axios'

program.option('--slack [type]', 'slack incoming hook key')
program.parse(process.argv)

const main = async() => {
    try {
        await axios.post(`https://hooks.slack.com/services/${program.slack}`, JSON.stringify({
            "text": "hi."
        }))
    } catch(e) {
        console.error(e)
    }
}
main()
