import axios from 'axios'
import cheerio from 'cheerio'

module.exports = async(url: string = 'https://www.hareruyamtg.com/ja/products/detail/73766?lang=EN') => {
    const response = await axios.get<string>(url)
    const $ = cheerio.load(response.data)
    const stock = parseInt($('#priceTable-EN > div > div:nth-child(2) > div:nth-child(3)').text(), 10)
    return {
        id: 'hareruya-wrenn-foil',
        name: 'Wrenn(Foil)',
        url,
        stock,
    }
}
