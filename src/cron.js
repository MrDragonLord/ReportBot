import { CronJob } from 'cron'
import { bot } from './app';


export default new CronJob(
    '0 20 * * *',
    (()=> {
        
    }),
    null,
    true,
    'Asia/Yekaterinburg'
);