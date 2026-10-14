import type {Tables} from '../types/database'
import type {Profile} from '../App'
export function toProfile(row:Tables<'profiles'>):Profile{const values=typeof row.preferences==='object'&&row.preferences&&!Array.isArray(row.preferences)?row.preferences:{};return{...row,preferences:{read_receipts:values.read_receipts!==false,last_seen:values.last_seen!==false,notifications:values.notifications!==false,notification_preview:values.notification_preview!==false}}}
