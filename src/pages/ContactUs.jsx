import { LegalPage } from './LegalPage'
import { useDocumentTitle } from '../useDocumentTitle'

export function ContactUs() {
  useDocumentTitle('Контакти')
  return (
    <LegalPage title="Контакти">
      <p>Имате въпрос или проблем? Пишете ни:</p>
      <p><strong>Имейл:</strong> support@jobnet.bg</p>
      <p><strong>Адрес:</strong> [Адрес на компанията]</p>
    </LegalPage>
  )
}