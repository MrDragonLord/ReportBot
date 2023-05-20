import { Telegraf, Markup, Scenes, session, Composer  } from 'telegraf'
import * as dotenv from 'dotenv'
import {rop, days } from './keyboarts.js'
//import cron from './cron.js'
import { editCell, generateOtchet, getCellStaff, staffs } from './spreadsheet.js'

dotenv.config()

//cron

export const bot = new Telegraf(process.env.TELEGRAM_BOT_KEY)

const otchetScene = new Scenes.BaseScene('otchet')

otchetScene.enter(async ctx => {
    return await ctx.reply('Выберите дату заполнения информации', days)
})

otchetScene.action('days', async ctx => {
    return await ctx.editMessageText('Выберите дату заполнения информации', days)
})

otchetScene.action(/^rop:(.*)$/, async ctx => {
    ctx.scene.state.day = ctx.match[1]
    return await ctx.editMessageText('Выберите РОП', rop)
})

otchetScene.action(/^getStaff:(.*)$/, async ctx => {
    const tableID = ctx.match[1]
    ctx.scene.state.tableID = tableID
    const staff = await staffs(tableID, ctx.scene.state.day)
    
    return await ctx.editMessageText('Выберите риэлтора', Markup.inlineKeyboard(staff))
})


otchetScene.action(/^editStaff:(.*):(.*)$/, async ctx => {
    const staff = ctx.match[1]
    const cell = ctx.match[2]
    const cellStaff = await getCellStaff(cell, ctx.scene.state.day, ctx.scene.state.tableID)
    if(!cellStaff) {
        await ctx.editMessageText(await generateOtchet(ctx.scene.state.tableID, ctx.scene.state.day, cell))
        return ctx.scene.leave()
    }

    return await ctx.editMessageText(`У ${staff} не заполнены такие поля:`, Markup.inlineKeyboard(cellStaff))
})

otchetScene.action(/.*/, async ctx => {
    const argumentValues = ctx.callbackQuery.data.split('|')
    ctx.scene.state.callback = argumentValues
    ctx.scene.state.input = true

    const textCheck = argumentValues[4] === 'string' ? `Введите Адрес ${argumentValues[0]}` : `Введите ${argumentValues[0]}`

    return await ctx[ctx.updateType === 'callback_query' ? 'editMessageText' : 'reply'](textCheck)
})

otchetScene.on('text', async (ctx) => {
    if (ctx.scene.state.input) {
        const argumentValues = ctx.scene.state.callback
        const isInt = argumentValues[4] === 'int' && ctx.message.text.match(/^-?\d+$/)
        const isString = argumentValues[4] === 'string'
    
        if (isInt || isString) {
            return await editedCell(ctx, argumentValues)
        }
    
        const cellStaff = await getCellStaff(argumentValues[3], ctx.scene.state.day, ctx.scene.state.tableID)
        
        if (!cellStaff) {
            const otchet = await generateOtchet(ctx.scene.state.tableID, ctx.scene.state.day, argumentValues[3])
            const [, reply] = await Promise.all([
              ctx.reply('Отчет успешно сдан!'),
              ctx.reply(otchet),
            ])
            return ctx.scene.leave()
        }
    
        const [, reply] = await Promise.all([
          ctx.reply('Ошибка ввода!'),
          ctx.reply(`У ${argumentValues[2]} не заполнены такие поля:`, Markup.inlineKeyboard(cellStaff)),
        ])
        ctx.scene.state.input = false
        return reply
    }
})

const editedCell = async (ctx, argumentValues) => {
    ctx.scene.state.input = false
    await editCell(argumentValues[1], ctx.message.text, ctx.scene.state.day, ctx.scene.state.tableID, argumentValues[4])
    const cellStaff = await getCellStaff(argumentValues[3], ctx.scene.state.day, ctx.scene.state.tableID)
    const otchet = await generateOtchet(ctx.scene.state.tableID, ctx.scene.state.day, argumentValues[3])

    if(cellStaff) return await ctx.reply(`У ${argumentValues[2]} не заполнены такие поля:`, Markup.inlineKeyboard(cellStaff))

    return await Promise.all([
      ctx.telegram.sendMessage(ctx.message.chat.id, 'Отчет успешно сдан!'),
      ctx.telegram.sendMessage(ctx.message.chat.id, otchet)
    ]).then(() => ctx.scene.leave())
}


const stage = new Scenes.Stage([otchetScene], {
	ttl: 600,
})

bot.use(session(), stage.middleware())

bot.command('otchet', ctx => ctx.scene.enter('otchet'))
bot.hears('Ежедневный отчет', ctx => ctx.scene.enter('otchet'))

bot.command('start', async ctx => {
    return await ctx.reply('Добро пожаловать!', Markup
    .keyboard(['Ежедневный отчет'])
    .resize()
  )
})


bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));