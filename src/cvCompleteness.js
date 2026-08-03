const CHECKLIST = [
  { key: 'avatar_url', label: 'Снимка на профила', weight: 15 },
  { key: 'fname', label: 'Име', weight: 5 },
  { key: 'lname', label: 'Фамилия', weight: 5 },
  { key: 'phone', label: 'Телефон', weight: 5 },
  { key: 'current_city', label: 'Настоящ град', weight: 5 },
  { key: 'description', label: 'Описание / За мен', weight: 10 },
  { key: 'target_salary', label: 'Желана заплата', weight: 10 },
  { key: 'target_sector', label: 'Желани сектори', weight: 10, isArray: true },
  { key: 'target_cities', label: 'Желани градове', weight: 10, isArray: true },
  { key: 'target_level', label: 'Ниво', weight: 5, isArray: true },
  { key: 'target_duration', label: 'Заетост', weight: 5, isArray: true },
  { key: 'work_experience', label: 'Трудов опит', weight: 10, isArray: true },
  { key: 'education', label: 'Образование', weight: 5, isArray: true },
]

export function calculateCvCompleteness(cv) {
  let earned = 0
  const missing = []

  CHECKLIST.forEach((item) => {
    const value = cv[item.key]
    const isFilled = item.isArray ? (value && value.length > 0) : Boolean(value)

    if (isFilled) {
      earned += item.weight
    } else {
      missing.push(item.label)
    }
  })

  return { percent: Math.round(earned), missing }
}