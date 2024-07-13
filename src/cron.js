import { CronJob } from 'cron'
import { bot } from './app.js'
import { getCurrentMonthWeekendDays } from './utils.js'
import { checkNotFill } from './spreadsheet.js'
import * as dotenv from 'dotenv'
dotenv.config()

export const cron = new CronJob(
    '0 20 * * *',
    (async () => {
        const getWeekendDays = getCurrentMonthWeekendDays()
        if(getWeekendDays.includes(new Date().getUTCDate())) return
        
        try {
            const notFilled = await checkNotFill()
    
            for (const iterator of notFilled) {
                try {
                    await bot.telegram.sendMessage(iterator, 'Необходимо заполнить отчёт за сегодняшний день')
                } catch (error) { }
            }
        } catch (error) {
            ctx.telegram.sendMessage(process.env.TELEGRAM_ID_SEND_ERROR, `Бот не смог отправить отчет\nКод: ${error.name}\nСообщение: ${error.message}`)
        }
    }),
    null,
    true,
    'Asia/Yekaterinburg'
)