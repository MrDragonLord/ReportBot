export const getCurrentMonthWeekendDays = () => {
  const weekends = []
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getUTCMonth()
  const daysMonth = daysInMonth()

  for (let day = 1; day <= daysMonth; day++) {
    const date = new Date(year, month, day)
    const currentDay = date.getDay()
    if (date.getUTCMonth() === month && (currentDay === 1 || currentDay === 0)) {
      weekends.push(date.getUTCDate())
    }
  }

  return weekends
}

export const daysInMonth = () => {
  const date = new Date()
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), 0).getDate()
}
