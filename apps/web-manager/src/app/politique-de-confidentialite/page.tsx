import LegalDocumentPage, { buildLegalMetadata } from "../../components/legal-document-page";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SITE_NAME
} from "../../lib/legal/site-legal";

export const metadata = buildLegalMetadata(
  "Politique de confidentialité",
  "Comment Haraka Property collecte, utilise et protège les données personnelles des gestionnaires, propriétaires et locataires."
);

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <LegalDocumentPage
      title="Politique de confidentialité"
      description="Cette politique décrit comment nous traitons les données personnelles dans le cadre de notre plateforme de gestion locative."
    >
      <h2>1. Qui sommes-nous ?</h2>
      <p>
        {LEGAL_COMPANY_NAME} ({LEGAL_SITE_NAME}) est une plateforme logicielle de gestion immobilière et locative
        destinée aux gestionnaires, propriétaires et locataires, principalement en {LEGAL_JURISDICTION}.
      </p>
      <p>
        Pour toute question relative à la protection des données, contactez-nous à{" "}
        <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>.
      </p>

      <h2>2. Quelles données collectons-nous ?</h2>
      <p>Selon votre profil et l&apos;utilisation de la plateforme, nous pouvons traiter :</p>
      <ul>
        <li>
          <strong>Données d&apos;identification et de contact</strong> : nom, adresse e-mail, numéro de téléphone,
          numéro WhatsApp (le cas échéant), photo de profil.
        </li>
        <li>
          <strong>Données de compte</strong> : identifiant d&apos;authentification, rôle (gestionnaire, propriétaire,
          locataire), appartenance à une organisation, préférences de notification.
        </li>
        <li>
          <strong>Données locatives</strong> : informations sur les biens, unités, baux, loyers, charges, dates
          d&apos;emménagement, statut des paiements, demandes de maintenance, messages échangés sur la plateforme.
        </li>
        <li>
          <strong>Documents</strong> : contrats de bail, pièces d&apos;identité, reçus, factures, photos et autres
          fichiers téléversés dans l&apos;espace documentaire.
        </li>
        <li>
          <strong>Données de paiement</strong> : montants, références, statuts de paiement, transactions liées aux
          loyers. Les paiements mobiles sont traités via notre prestataire PawaPay ; nous ne stockons pas vos codes PIN
          ni les données complètes de carte bancaire sur nos serveurs.
        </li>
        <li>
          <strong>Données de candidature locative</strong> : informations soumises via les annonces publiques
          (coordonnées, revenus déclarés, pièces justificatives le cas échéant).
        </li>
        <li>
          <strong>Données techniques</strong> : journaux de connexion, adresse IP, type d&apos;appareil, navigateur,
          horodatages d&apos;activité et identifiants techniques nécessaires au fonctionnement du service.
        </li>
        <li>
          <strong>Communications</strong> : contenu des e-mails transactionnels envoyés via la plateforme, messages
          WhatsApp envoyés avec votre consentement (invitations, documents de bail, confirmations de paiement), et
          statuts de livraison associés.
        </li>
      </ul>

      <h2>3. Pourquoi utilisons-nous ces données ?</h2>
      <p>Nous traitons vos données pour :</p>
      <ul>
        <li>fournir et sécuriser l&apos;accès à la plateforme ;</li>
        <li>gérer les baux, les locataires, les propriétaires et les opérations locatives ;</li>
        <li>envoyer des notifications liées au service (e-mail et, avec consentement, WhatsApp) ;</li>
        <li>traiter les paiements de loyer et générer les factures ;</li>
        <li>permettre la messagerie entre gestionnaires et locataires ;</li>
        <li>publier et consulter des annonces sur le marketplace public ;</li>
        <li>assurer le support, la sécurité, la prévention de la fraude et le respect de nos obligations légales ;</li>
        <li>améliorer la fiabilité et la performance du service.</li>
      </ul>

      <h2>4. Bases légales du traitement</h2>
      <p>Selon les cas, le traitement repose sur :</p>
      <ul>
        <li>l&apos;exécution du contrat ou des mesures précontractuelles (création de compte, gestion du bail) ;</li>
        <li>votre consentement (notifications WhatsApp, certaines communications marketing si activées) ;</li>
        <li>notre intérêt légitime (sécurité, amélioration du service, prévention des abus) ;</li>
        <li>le respect d&apos;obligations légales ou réglementaires applicables.</li>
      </ul>

      <h2>5. WhatsApp et communications</h2>
      <p>
        Lorsque vous activez les notifications WhatsApp dans l&apos;application locataire, nous utilisons l&apos;API
        WhatsApp Business de Meta pour vous envoyer des messages transactionnels (invitation, documents de location,
        confirmation de paiement). Vous pouvez retirer votre consentement à tout moment depuis votre profil locataire.
        Les envois WhatsApp sont journalisés (statut, modèle utilisé, horodatage) à des fins de traçabilité et de
        support.
      </p>

      <h2>6. Partage des données avec des tiers</h2>
      <p>Nous pouvons partager certaines données avec des prestataires strictement nécessaires au service :</p>
      <ul>
        <li><strong>Supabase</strong> — authentification, base de données et stockage de fichiers ;</li>
        <li><strong>Vercel</strong> — hébergement de l&apos;application web ;</li>
        <li><strong>Resend</strong> — envoi d&apos;e-mails transactionnels ;</li>
        <li><strong>Meta (WhatsApp Business)</strong> — envoi de messages WhatsApp avec votre consentement ;</li>
        <li><strong>PawaPay</strong> — traitement des paiements mobiles ;</li>
        <li><strong>Google</strong> — connexion OAuth si vous choisissez cette option à l&apos;inscription.</li>
      </ul>
      <p>
        Ces prestataires agissent en tant que sous-traitants et ne peuvent utiliser vos données que pour fournir le
        service demandé. Nous ne vendons pas vos données personnelles.
      </p>

      <h2>7. Durée de conservation</h2>
      <p>
        Nous conservons vos données aussi longtemps que nécessaire pour fournir le service, respecter nos obligations
        légales et résoudre d&apos;éventuels litiges. Les documents locatifs et financiers peuvent être conservés pour
        la durée requise par la gestion du bail et les obligations comptables applicables. Les journaux techniques sont
        conservés pour une durée limitée, proportionnée aux besoins de sécurité.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables (contrôle d&apos;accès,
        chiffrement en transit, cloisonnement des organisations, journalisation) pour protéger vos données. Aucune
        méthode de transmission ou de stockage n&apos;est toutefois totalement infaillible.
      </p>

      <h2>9. Vos droits</h2>
      <p>Selon la réglementation applicable, vous pouvez demander :</p>
      <ul>
        <li>l&apos;accès à vos données ;</li>
        <li>la rectification de données inexactes ;</li>
        <li>l&apos;effacement de vos données dans les limites prévues par la loi ;</li>
        <li>la limitation ou l&apos;opposition à certains traitements ;</li>
        <li>le retrait de votre consentement (notamment pour WhatsApp) ;</li>
        <li>la portabilité de vos données lorsque applicable.</li>
      </ul>
      <p>
        Pour exercer vos droits ou demander la suppression de votre compte, consultez notre page{" "}
        <a href="/suppression-donnees">Suppression des données</a> ou écrivez à{" "}
        <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>.
      </p>

      <h2>10. Cookies et technologies similaires</h2>
      <p>
        La plateforme utilise des cookies et technologies de session nécessaires à l&apos;authentification, à la
        sécurité et au bon fonctionnement du service. Nous n&apos;utilisons pas de cookies publicitaires tiers sur
        l&apos;espace connecté.
      </p>

      <h2>11. Transferts internationaux</h2>
      <p>
        Certains prestataires peuvent traiter des données en dehors de la RDC. Dans ce cas, nous veillons à ce que des
        garanties appropriées soient mises en place conformément aux exigences applicables.
      </p>

      <h2>12. Modifications</h2>
      <p>
        Nous pouvons mettre à jour cette politique pour refléter l&apos;évolution du service ou des exigences légales.
        La date de dernière mise à jour figure en haut de cette page.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions générales : <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        <br />
        Données personnelles et confidentialité :{" "}
        <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
      </p>
    </LegalDocumentPage>
  );
}
