import { Telegraf, Markup, Scenes, session, Composer  } from 'telegraf'
import * as dotenv from 'dotenv'
import {rop, days } from './keyboarts.js'
import { editCell, generateOtchet, getCellStaff, staffs } from './spreadsheet.js'
import { readFileSync } from 'fs'

dotenv.config()

export const bot = new Telegraf(process.env.TELEGRAM_BOT_KEY)

bot.use(async (ctx, next) => {
    let access = readFileSync('./access.txt', 'utf-8').split("\n")
    if(access.includes(ctx.from.id.toString())) return await next() 
    return await ctx.reply('У вас нет доступа')
})

const otchetHandler = new Composer()

otchetHandler.action(/^rop:(.*)$/, async ctx => {
    ctx.scene.state.day = ctx.match[1]
    return await ctx.editMessageText('Выберите РОП', rop)
})

otchetHandler.action(/^getStaff:(.*)$/, async ctx => {
    const tableID = ctx.match[1]
    ctx.scene.state.tableID = tableID

    return await ctx.editMessageText('Выберите риэлтора', Markup.inlineKeyboard(await staffs(tableID)))
})


otchetHandler.action(/^editStaff:(.*):(.*)$/, async ctx => {
    const staff = ctx.match[1]
    const cell = ctx.match[2]
    const cellStaff = await getCellStaff(cell, ctx.scene.state.day, ctx.scene.state.tableID)
    if(!cellStaff) {
        await ctx.editMessageText(await generateOtchet(ctx.scene.state.tableID, ctx.scene.state.day, cell))
        return ctx.scene.leave()
    }

    await ctx.editMessageText(`У ${staff} не заполнены такие поля:`, Markup.inlineKeyboard(cellStaff))
    return ctx.scene.enter('otchetInput', ctx.scene.state)
})

const inputInfoHandler = new Composer()

inputInfoHandler.action(/.*/, async ctx => {
    const argumentValues = ctx.callbackQuery.data.split('|')
    ctx.scene.state.callback = argumentValues

    if(ctx.updateType === 'callback_query') return await ctx.editMessageText(`Введите ${argumentValues[0]}`)
    return await ctx.reply(`Введите ${argumentValues[0]}`)
})

inputInfoHandler.on('text', async (ctx) => {
    const argumentValues = ctx.scene.state.callback
    if (ctx.message.text.match(/^-?\d+$/)) {
        await editCell(argumentValues[1], ctx.message.text, ctx.scene.state.day, ctx.scene.state.tableID)
     
        return ctx.scene.enter('otchetInput', ctx.scene.state)
    }
    await ctx.reply('Ошибка ввода!')
    return ctx.scene.enter('otchetInput', ctx.scene.state)
})


const otchetScene = new Scenes.WizardScene('otchet', async ctx => {
    await ctx.reply('Выберите дату заполнения информации', days)
    return ctx.wizard.next()
}, otchetHandler)

const otchetInputScene = new Scenes.WizardScene('otchetInput', async ctx => {
    if(ctx.updateType === 'callback_query') return ctx.wizard.next()

    const argumentValues = ctx.scene.state.callback
    const cellStaff = await getCellStaff(argumentValues[3], ctx.scene.state.day, ctx.scene.state.tableID)
    if(!cellStaff) {
        await ctx.reply(await generateOtchet(ctx.scene.state.tableID, ctx.scene.state.day, argumentValues[3]))
        return ctx.scene.leave()
    }

    await ctx.reply(`У ${argumentValues[2]} не заполнены такие поля:`, Markup.inlineKeyboard(cellStaff))
    
    return ctx.wizard.next()
}, inputInfoHandler)


const stage = new Scenes.Stage([otchetScene, otchetInputScene], {
	ttl: 600,
})

bot.use(session(), stage.middleware())

bot.command('otchet', async ctx => ctx.scene.enter('otchet'))

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));