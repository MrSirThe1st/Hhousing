import LegalDocumentPage, { buildLegalMetadata } from "../../components/legal-document-page";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SITE_NAME
} from "../../lib/legal/site-legal";

export const metadata = buildLegalMetadata(
  "Conditions d'utilisation",
  "Conditions générales d'utilisation de la plateforme Haraka Property pour la gestion locative."
);

export default function TermsOfServicePage(): React.ReactElement {
  return (
    <LegalDocumentPage
      title="Conditions d'utilisation"
      description="En utilisant Haraka Property, vous acceptez les présentes conditions. Veuillez les lire attentivement."
    >
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l&apos;accès et l&apos;utilisation de {LEGAL_SITE_NAME}, plateforme en ligne
        de gestion immobilière et locative opérée par {LEGAL_COMPANY_NAME}, accessible via le site web et
        l&apos;application mobile locataire, principalement destinée aux utilisateurs en {LEGAL_JURISDICTION}.
      </p>

      <h2>2. Description du service</h2>
      <p>Haraka Property permet notamment de :</p>
      <ul>
        <li>gérer des portefeuilles de biens, unités et baux ;</li>
        <li>suivre les locataires, les paiements, les factures et la maintenance ;</li>
        <li>échanger des messages et documents entre gestionnaires et locataires ;</li>
        <li>envoyer des notifications par e-mail et, avec consentement, par WhatsApp ;</li>
        <li>traiter des paiements mobiles via un prestataire tiers (PawaPay) ;</li>
        <li>publier et consulter des annonces sur un marketplace public ;</li>
        <li>donner accès à un portail propriétaire et à une application mobile locataire.</li>
      </ul>
      <p>
        Le service est fourni en l&apos;état. Nous pouvons faire évoluer les fonctionnalités, l&apos;interface ou les
        intégrations tierces pour améliorer ou sécuriser la plateforme.
      </p>

      <h2>3. Comptes et éligibilité</h2>
      <ul>
        <li>Vous devez fournir des informations exactes lors de la création de votre compte.</li>
        <li>
          Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre
          compte.
        </li>
        <li>
          Les gestionnaires et propriétaires sont responsables des données qu&apos;ils saisissent concernant leurs
          locataires et doivent disposer d&apos;une base légale pour ce traitement.
        </li>
        <li>
          L&apos;accès locataire peut être activé par invitation de l&apos;organisation gestionnaire ou propriétaire
          concernée.
        </li>
      </ul>

      <h2>4. Utilisation acceptable</h2>
      <p>Il est interdit de :</p>
      <ul>
        <li>utiliser la plateforme à des fins illégales, frauduleuses ou trompeuses ;</li>
        <li>tenter d&apos;accéder sans autorisation à des données d&apos;autres organisations ou utilisateurs ;</li>
        <li>perturber le fonctionnement du service (attaques, scraping abusif, surcharge intentionnelle) ;</li>
        <li>téléverser des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers ;</li>
        <li>contourner les mesures de sécurité ou d&apos;authentification.</li>
      </ul>
      <p>
        Nous nous réservons le droit de suspendre ou résilier un compte en cas de violation grave ou répétée des
        présentes conditions.
      </p>

      <h2>5. Données et confidentialité</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre{" "}
        <a href="/politique-de-confidentialite">Politique de confidentialité</a>. En utilisant le service, vous
        reconnaissez en avoir pris connaissance.
      </p>
      <p>
        Les organisations utilisant Haraka Property agissent en qualité de responsables de traitement pour les données
        de leurs locataires et clients. {LEGAL_COMPANY_NAME} agit principalement en tant que sous-traitant technique
        pour l&apos;hébergement et l&apos;exploitation de la plateforme.
      </p>

      <h2>6. Communications</h2>
      <p>
        La plateforme peut envoyer des e-mails transactionnels nécessaires au service (invitations, documents, factures,
        alertes). Les messages WhatsApp ne sont envoyés aux locataires qu&apos;avec leur consentement explicite,
        modifiable depuis l&apos;application mobile.
      </p>

      <h2>7. Paiements</h2>
      <p>
        Les paiements mobiles sont traités par PawaPay ou d&apos;autres prestataires intégrés. {LEGAL_COMPANY_NAME} n&apos;est
        pas une institution financière. Les délais, frais éventuels et conditions des opérateurs mobiles
        s&apos;appliquent selon les règles du prestataire de paiement.
      </p>

      <h2>8. Propriété intellectuelle</h2>
      <p>
        La plateforme, sa marque, son code, son design et sa documentation restent la propriété de {LEGAL_COMPANY_NAME}
        ou de ses concédants. Vous conservez la propriété des contenus et documents que vous téléversez. Vous nous
        accordez une licence limitée pour héberger et traiter ces contenus uniquement afin de fournir le service.
      </p>

      <h2>9. Disponibilité et support</h2>
      <p>
        Nous visons une haute disponibilité mais ne garantissons pas un fonctionnement ininterrompu. Des maintenances,
        mises à jour ou incidents chez nos prestataires peuvent entraîner des interruptions temporaires. Le support est
        fourni dans la mesure du possible via <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>10. Limitation de responsabilité</h2>
      <p>
        Dans les limites autorisées par la loi applicable, {LEGAL_COMPANY_NAME} ne saurait être tenue responsable des
        dommages indirects, pertes de profits, pertes de données résultant d&apos;une mauvaise utilisation du service
        ou de décisions prises sur la base d&apos;informations affichées dans la plateforme. Les gestionnaires restent
        responsables de leurs obligations légales envers les locataires et propriétaires.
      </p>

      <h2>11. Résiliation</h2>
      <p>
        Vous pouvez cesser d&apos;utiliser le service à tout moment. Nous pouvons suspendre ou clôturer un compte en cas
        de violation des présentes conditions ou pour des raisons de sécurité. La suppression des données personnelles
        est traitée selon notre page <a href="/suppression-donnees">Suppression des données</a>.
      </p>

      <h2>12. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit de la {LEGAL_JURISDICTION}, sous réserve des dispositions
        impératives applicables. En cas de litige, les parties s&apos;efforceront de trouver une solution amiable avant
        toute action judiciaire.
      </p>

      <h2>13. Modifications</h2>
      <p>
        Nous pouvons modifier ces conditions. En cas de changement substantiel, nous informerons les utilisateurs par
        des moyens raisonnables (notification sur la plateforme ou par e-mail). La poursuite de l&apos;utilisation après
        mise à jour vaut acceptation des nouvelles conditions.
      </p>

      <h2>14. Contact</h2>
      <p>
        {LEGAL_COMPANY_NAME}
        <br />
        E-mail : <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        <br />
        Confidentialité : <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
      </p>
    </LegalDocumentPage>
  );
}
