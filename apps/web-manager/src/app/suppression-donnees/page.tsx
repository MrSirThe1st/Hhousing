import Link from "next/link";
import LegalDocumentPage, { buildLegalMetadata } from "../../components/legal-document-page";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SITE_NAME
} from "../../lib/legal/site-legal";

export const metadata = buildLegalMetadata(
  "Suppression des données",
  "Comment demander la suppression de vos données personnelles sur Haraka Property."
);

export default function DataDeletionPage(): React.ReactElement {
  return (
    <LegalDocumentPage
      title="Suppression des données"
      description="Vous pouvez demander l'accès, la rectification ou la suppression de vos données personnelles conformément à notre politique de confidentialité."
    >
      <h2>1. Votre droit à l&apos;effacement</h2>
      <p>
        Conformément à la réglementation applicable en matière de protection des données, vous pouvez demander la
        suppression de vos données personnelles traitées par {LEGAL_SITE_NAME}, dans les limites prévues par la loi
        (notamment lorsque les données ne sont plus nécessaires, lorsque vous retirez votre consentement, ou lorsque
        le traitement est illicite).
      </p>

      <h2>2. Qui peut faire une demande ?</h2>
      <ul>
        <li>
          <strong>Locataires</strong> disposant d&apos;un compte ou ayant reçu des communications via la plateforme.
        </li>
        <li>
          <strong>Gestionnaires et membres d&apos;équipe</strong> disposant d&apos;un compte utilisateur.
        </li>
        <li>
          <strong>Propriétaires</strong> ayant accès au portail propriétaire.
        </li>
        <li>
          <strong>Candidats locataires</strong> ayant soumis une candidature via une annonce publique.
        </li>
      </ul>
      <p>
        Si vos données ont été saisies par une organisation gestionnaire (par exemple votre bailleur), nous pouvons
        vous orienter vers cette organisation lorsque elle agit en tant que responsable de traitement principal.
      </p>

      <h2>3. Comment envoyer une demande</h2>
      <p>Envoyez un e-mail à notre adresse dédiée :</p>
      <p>
        <a
          href={`mailto:${LEGAL_PRIVACY_EMAIL}?subject=${encodeURIComponent("Demande de suppression de données — Haraka Property")}&body=${encodeURIComponent("Bonjour,\n\nJe souhaite demander la suppression de mes données personnelles sur Haraka Property.\n\nNom complet :\nAdresse e-mail du compte :\nNuméro de téléphone (si applicable) :\nOrganisation / bailleur concerné (si connu) :\n\nMerci.")}`}
          className="inline-flex items-center rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0050d0]"
        >
          Envoyer une demande par e-mail
        </a>
      </p>
      <p className="text-sm text-slate-600">
        Adresse : <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
      </p>
      <p>Pour traiter votre demande rapidement, merci d&apos;indiquer :</p>
      <ul>
        <li>votre nom complet ;</li>
        <li>l&apos;adresse e-mail associée à votre compte (ou celle utilisée pour recevoir nos communications) ;</li>
        <li>votre numéro de téléphone si vous avez activé WhatsApp ;</li>
        <li>le nom de l&apos;organisation gestionnaire ou du bailleur, si connu ;</li>
        <li>la nature précise de votre demande (suppression complète, rectification, export, retrait du consentement WhatsApp).</li>
      </ul>

      <h2>4. Délai de réponse</h2>
      <p>
        Nous accusons réception de votre demande dans un délai raisonnable et y répondons généralement sous 30 jours,
        sauf complexité particulière ou obligation légale de conservation plus longue.
      </p>

      <h2>5. Données que nous pouvons conserver</h2>
      <p>
        Certaines données peuvent être conservées après votre demande lorsque la loi l&apos;exige ou le permet, par
        exemple :
      </p>
      <ul>
        <li>documents comptables et factures liés à des paiements déjà effectués ;</li>
        <li>journaux de sécurité et d&apos;audit nécessaires à la prévention de la fraude ;</li>
        <li>données anonymisées ou agrégées ne permettant plus de vous identifier.</li>
      </ul>

      <h2>6. Suppression depuis l&apos;application locataire</h2>
      <p>
        Si vous êtes locataire, vous pouvez également désactiver les notifications WhatsApp depuis votre profil dans
        l&apos;application mobile. Cela retire votre consentement pour les futurs messages WhatsApp sans supprimer
        automatiquement l&apos;historique des baux gérés par votre organisation.
      </p>

      <h2>7. Comptes gestionnaires et organisations</h2>
      <p>
        La suppression d&apos;un compte gestionnaire ou d&apos;une organisation peut affecter l&apos;accès aux baux,
        documents et historiques associés. Contactez-nous pour coordonner la clôture du compte et la sortie des données
        locataires dont vous étiez responsable.
      </p>

      <h2>8. Autres contacts</h2>
      <p>
        Questions générales : <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        <br />
        Politique de confidentialité : <Link href="/politique-de-confidentialite">/politique-de-confidentialite</Link>
        <br />
        Conditions d&apos;utilisation : <Link href="/conditions-utilisation">/conditions-utilisation</Link>
      </p>

      <p className="text-sm text-slate-500">
        {LEGAL_COMPANY_NAME} — {LEGAL_SITE_NAME}
      </p>
    </LegalDocumentPage>
  );
}
