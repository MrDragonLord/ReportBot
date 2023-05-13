import { Markup } from 'telegraf'
import { daysInMonth } from './utils.js'
import { rops } from './spreadsheet.js'

const listDays = []

for (let index = 1; index < daysInMonth() + 1; index++) {
    listDays.push(Markup.button.callback(index, `rop:${index}`))
}

export const days = Markup.inlineKeyboard(listDays.reduce((memo, value, index) => {
    if (index % 5 === 0 && index !== 0) memo.push([])
    memo[memo.length - 1].push(value)
    return memo
  }, [[]]))

export const rop = Markup.inlineKeyboard(await rops())