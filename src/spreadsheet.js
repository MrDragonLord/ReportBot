import { GoogleSpreadsheet } from 'google-spreadsheet'
import { readFile } from 'fs/promises'
import { Markup } from 'telegraf'
import * as dotenv from 'dotenv'
import { bot } from './app.js'
dotenv.config()

const json = JSON.parse(await readFile(new URL(`../${process.env.EMAIL_INFO_FILE}`, import.meta.url)))
const ropTable = new GoogleSpreadsheet(process.env.ROP_TABLE_ID)
await ropTable.useServiceAccountAuth(json)

await ropTable.loadInfo()
const sheetRop = ropTable.sheetsByIndex[0]


await sheetRop.loadCells('A1:B21')

const cache = {}

const loadSheet = async (tableID, day) => {
    const cacheKey = `${tableID}_${day}`
    const lastModified = await getLastModified(tableID, day)

    if (cache[cacheKey] && cache[cacheKey].lastModified === lastModified) {
        return cache[cacheKey].sheet
    }

    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[day-1]
    await sheet.loadCells('A1:J22')

    cache[cacheKey] = {
        sheet: sheet,
        lastModified: lastModified,
    }

    return sheet
}

const getLastModified = async (tableID, day) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[day-1]
    await sheet.loadCells('A22')
    const lastModifiedCell = sheet.getCellByA1('A22')
    return lastModifiedCell.value
}

export const rops = async () => {
    try {
        const users = []
        for (let index = 2; index < 20; index++) {
            const ropName = sheetRop.getCellByA1(`A${index}`)
            const ropTableID = sheetRop.getCellByA1(`B${index}`)

            ropName.value !== null && users.push([Markup.button.callback(ropName.value, `getStaff:${ropTableID.value}`)])
        }
        users.push([Markup.button.callback('Вернуться', 'days')])
        
        return [users, true]
    } catch (error) {
        bot.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Произошла ошибка\nКод: ${error.name}\nСообщение: ${error.message}`)
        return [[Markup.button.callback('Произошла ошибка', 'error')], false]
    }
}


export const staffs = async (tableID, day) => {
    try {
        const sheet = await loadSheet(tableID, day)

        const users = []
        for (let index = 2; index < 20; index++) {
            const cell = sheet.getCellByA1(`A${index}`)
            cell.value !== null && users.push([Markup.button.callback(cell.value, `editStaff:${cell.value}:${cell.rowIndex}`)])
        }
        users.push([Markup.button.callback('Вернуться', `rop:${day}`)])

        return [users, true]
    } catch (error) {
        bot.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Произошла ошибка\nКод: ${error.name}\nСообщение: ${error.message}`)
        return [[Markup.button.callback('Произошла ошибка', 'error')], false]
    }
}


export const getCellStaff = async (cell, day, tableID) => {
    try {
        const sheet = await loadSheet(tableID, day)

        const nullCells = []
        for (let index = 1; index < 10; index++) {
            const col = sheet.getCell(cell, index)
            const nullCellName = sheet.getCell(0, index)
            const user = sheet.getCell(cell, 0)

            if (col.value == null) {
                nullCells.push([Markup.button.callback(nullCellName.value, `${nullCellName.value}|${col.a1Column}${col.a1Row}|${user.value}|${cell}|int`)])
                continue
            }
            const checkAdress = ['Презентации', 'Договоры', 'Сделки', 'Задатки'].includes(nullCellName.value)

            if (checkAdress && col.value >= 1 && col.note == null) {
                nullCells.unshift([Markup.button.callback('Адрес ' + nullCellName.note, `${nullCellName.value}|${col.a1Column}${col.a1Row}|${user.value}|${cell}|string`)])
            }
        }
        if (nullCells.length !== 0) {
            nullCells.push([Markup.button.callback('Вернуться', `getStaff:${tableID}`)])
            return [nullCells, true]
        }
        return [false, true]
    } catch (error) {
        bot.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Произошла ошибка\nКод: ${error.name}\nСообщение: ${error.message}`)
        return [[Markup.button.callback('Произошла ошибка', 'error')], false]
    }
}

export const editCell = async (cell, value, day, tableID, type = 'int') => {
    try {
        const table = new GoogleSpreadsheet(tableID)
        await table.useServiceAccountAuth(json)
        await table.loadInfo()
        const sheet = table.sheetsByIndex[day - 1]
        await sheet.loadCells('A1:J22')

        const col = sheet.getCellByA1(cell)
        type === 'string' && (col.note = value)
        type === 'int' && (col.value = +value)
        const lastModifyCell = sheet.getCellByA1('A22')
        lastModifyCell.value = new Date().getTime()


        await sheet.saveUpdatedCells()
    } catch (error) {
        bot.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Произошла ошибка\nКод: ${error.status}\nСообщение: ${error.message}`)
        return false
    }
}

export const generateOtchet = async (tableID, day, row) => {
    try {
        const table = new GoogleSpreadsheet(tableID)
        await table.useServiceAccountAuth(json)
        await table.loadInfo()
        const sheet = table.sheetsByIndex[day - 1]
        await sheet.loadCells('A1:J22')

        const fields = []

        for (let index = 1; index < 10; index++) {
            const col = sheet.getCell(row, index)
            const nullCellName = sheet.getCell(0, index)

            fields.push(`${index}. ${nullCellName.value}: ${col.value}`)
        }

        const user = sheet.getCell(row, 0)
        return `${user.value}:\n${fields.join("\n")}`
    } catch (error) {
        bot.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Произошла ошибка\nКод: ${error.name}\nСообщение: ${error.message}`)
        return false
    }
}

export const checkNotFill = async () => {
    let notFill = []
    const rops = []
    for (let index = 2; index < 20; index++) {
        const ropTableID = sheetRop.getCellByA1(`B${index}`)

        ropTableID.value !== null && rops.push(ropTableID.value)
    }

    for (const iterator of rops) {
        const notFilledStaff = await checkFillStaff(iterator)

        notFill = [...notFill, ...notFilledStaff]
    }

    return notFill
}

const checkFillStaff = async (tableID) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const day = new Date().getUTCDate()
    const sheet = table.sheetsByIndex[day - 1]

    if (sheet.tabColor && sheet.tabColor.red === 1) return []

    await sheet.loadCells('A1:J22')

    const nullCells = []
    for (let index = 2; index < 20; index++) {
        const col = sheet.getCellByA1(`A${index}`)
        if (col.value !== null) {
            const fillStatus = checkFill(sheet, col.rowIndex)
            fillStatus && nullCells.push(col.note)
        }
    }
    return nullCells
}

const checkFill = (sheet, cell) => {
    const nullCells = []
    for (let index = 1; index < 10; index++) {
        const nullCellName = sheet.getCell(0, index)
        const col = sheet.getCell(cell, index)

        if (col.value == null) {
            nullCells.push(nullCellName.value)
            continue
        }
        const checkAdress = ['Презентации', 'Договоры', 'Сделки', 'Задатки'].includes(nullCellName.value)

        if (checkAdress && col.value >= 1 && col.note == null) {
            nullCells.push(nullCellName.value)
        }
    }

    return nullCells.length > 0 ? true : false
}