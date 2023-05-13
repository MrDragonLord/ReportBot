export const daysInMonth = () => {
    const date = new Date()
    return new Date(date.getUTCMonth() + 1, date.getUTCFullYear(), 0).getDate()
}