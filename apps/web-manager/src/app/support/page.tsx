import Link from "next/link";
import LegalDocumentPage, { buildLegalMetadata } from "../../components/legal-document-page";
import { LEGAL_COMPANY_NAME, LEGAL_CONTACT_EMAIL, LEGAL_SITE_NAME } from "../../lib/legal/site-legal";

export const metadata = buildLegalMetadata(
  "Support",
  `Contacter le support ${LEGAL_SITE_NAME} pour l'application locataire et la plateforme de gestion.`
);

export default function SupportPage(): React.ReactElement {
  return (
    <LegalDocumentPage
      title="Support"
      description={`Besoin d'aide avec ${LEGAL_SITE_NAME} ? Contactez notre équipe. Nous répondons généralement sous 1 à 2 jours ouvrés.`}
    >
      <h2>1. Contacter le support</h2>
      <p>
        Pour toute question sur l&apos;application locataire, votre compte, ou l&apos;accès à la plateforme, écrivez-nous
        à :
      </p>
      <p>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(`Support — ${LEGAL_SITE_NAME}`)}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      </p>

      <h2>2. Que préciser dans votre message</h2>
      <ul>
        <li>votre nom complet ;</li>
        <li>l&apos;adresse e-mail ou le numéro de téléphone lié à votre compte ;</li>
        <li>le nom de votre organisation / bailleur si vous êtes locataire ;</li>
        <li>une description claire du problème (captures d&apos;écran utiles si possible).</li>
      </ul>

      <h2>3. Locataires</h2>
      <p>
        Les demandes liées à votre bail, au loyer ou à la maintenance doivent aussi être adressées à votre bailleur via
        l&apos;application lorsque c&apos;est possible. Le support {LEGAL_SITE_NAME} peut vous aider pour les problèmes
        techniques de compte et d&apos;accès.
      </p>

      <h2>4. Données personnelles</h2>
      <p>
        Pour une demande d&apos;accès, de rectification ou de suppression de données, consultez{" "}
        <Link href="/suppression-donnees">Suppression des données</Link> ou notre{" "}
        <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>5. Éditeur</h2>
      <p>
        {LEGAL_COMPANY_NAME} — {LEGAL_SITE_NAME}
        <br />
        République Démocratique du Congo
      </p>
    </LegalDocumentPage>
  );
}
