import { GoogleSpreadsheet } from 'google-spreadsheet'
import { readFile } from 'fs/promises'
import { Markup } from 'telegraf'
import * as dotenv from 'dotenv'
dotenv.config()

const json = JSON.parse(await readFile(new URL(`../${process.env.EMAIL_INFO_FILE}`, import.meta.url)))
const ropTable = new GoogleSpreadsheet(process.env.ROP_TABLE_ID)
await ropTable.useServiceAccountAuth(json)

await ropTable.loadInfo()
const sheet = ropTable.sheetsByIndex[0]
await sheet.loadCells('A1:B21')

export const rops = async () => {
    const users = []
    for (let index = 2; index < 20; index++) {
        const ropName = sheet.getCellByA1(`A${index}`)
        const ropTableID = sheet.getCellByA1(`B${index}`)

        ropName.value !== null && users.push([Markup.button.callback(ropName.value, `getStaff:${ropTableID.value}`)]) 
    }
    return users
}


export const staffs = async (tableID,) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[0]
    await sheet.loadCells('A1:J21')

    const users = []
    for (let index = 2; index < 20; index++) {
        const cell = sheet.getCellByA1(`A${index}`)
        cell.value !== null && users.push([Markup.button.callback(cell.value, `editStaff:${cell.value}:${cell.rowIndex}`)]) 
    }
    return users
}


export const getCellStaff = async (cell, day, tableID) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[day-1]
    await sheet.loadCells('A1:J21')

    const nullCells = []
    for (let index = 1; index < 10; index++) {
        const col = sheet.getCell(cell, index)
        if(col.value === null) {
            const nullCellName = sheet.getCell(0, index)
            const user = sheet.getCell(cell, 0)
            nullCells.push([Markup.button.callback(nullCellName.value, `${nullCellName.value}|${col.a1Column}${col.a1Row}|${user.value}|${cell}`)]) 
        }
    }
    if(nullCells.length !== 0) return nullCells
    return false
}

export const editCell = async (cell, value, day, tableID) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[day-1]
    await sheet.loadCells('A1:J21')

    const col = sheet.getCellByA1(cell)
    col.value = value
    await col.save()
}

export const generateOtchet = async (tableID, day, row) => {
    const table = new GoogleSpreadsheet(tableID)
    await table.useServiceAccountAuth(json)
    await table.loadInfo()
    const sheet = table.sheetsByIndex[day-1]
    await sheet.loadCells('A1:J21')

    const fields = []

    for (let index = 1; index < 10; index++) {
        const col = sheet.getCell(row, index)
        const nullCellName = sheet.getCell(0, index)

        fields.push(`${index}. ${nullCellName.value}: ${col.value}`)
    }

    const user = sheet.getCell(row, 0)
    return `${user.value}:\n${fields.join("\n")}`
}