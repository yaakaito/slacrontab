import axios from 'axios'
import cheerio from 'cheerio'

module.exports = async(url: string = 'https://www.dragonstartcg.com/240041332-1') => {
    const response = await axios.get<string>(url)
    const $ = cheerio.load(response.data)
    const stock = parseInt($('.product-specification-table > tbody > tr.odd > td:nth-child(3)').text(), 10)
    return {
        id: 'dragon-start-ouat-foil',
        name: 'OuaT(Foil)',
        url,
        stock,
    }
}
