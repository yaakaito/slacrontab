import axios from 'axios'
import cheerio from 'cheerio'

module.exports = async(url: string = 'https://store.channelfireball.com/catalog/magic_singles-throne_of_eldraine/oko_thief_of_crowns__foil/969644') => {
    const response = await axios.get<string>(url)
    const $ = cheerio.load(response.data)
    const stock = parseInt($('.qty-count').text(), 10)
    return {
        id: 'channel-oko-foil',
        name: 'Oko(Foil)',
        url,
        stock,
    }
}
