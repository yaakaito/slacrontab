import axios from 'axios'
import cheerio from 'cheerio'

module.exports = async(url: string = 'https://www.singlestar.jp/product/181099') => {
    const response = await axios.get<string>(url)
    const $ = cheerio.load(response.data)
    const stock = parseInt($('#purchase_qty option:last-child').val(), 10)
    return {
        id: 'single-start-grim',
        name: 'Grim Tutor(Foil showcase)',
        url,
        stock,
    }
}
