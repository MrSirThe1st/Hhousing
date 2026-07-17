"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { DashboardAccess } from "../lib/dashboard-access";
import "driver.js/dist/driver.css";

interface DashboardTourProps {
  access: DashboardAccess;
}

interface TourStepDef {
  element?: string;
  url: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

const ALL_STEPS: TourStepDef[] = [
  // Dashboard
  {
    url: "/dashboard",
    title: "Bienvenue sur Haraka Property !",
    description: "Ce guide interactif complet vous aidera à prendre en main toute la plateforme. Nous allons visiter ensemble les différentes sections.",
    side: "left",
    align: "start"
  },
  {
    element: "#dashboard-tabs",
    url: "/dashboard",
    title: "Vues du Tableau de Bord",
    description: "Basculez entre la vue d'ensemble des indicateurs, vos tâches opérationnelles et le calendrier.",
    side: "bottom",
    align: "start"
  },
  {
    element: "#financial-overview",
    url: "/dashboard",
    title: "Argent du mois",
    description: "Suivez les loyers reçus, vos dépenses, le reste après charges et les loyers en retard.",
    side: "bottom",
    align: "start"
  },
  // Operations
  {
    element: "#properties-container",
    url: "/dashboard/properties",
    title: "Mes biens",
    description: "Ici, gérez vos maisons et immeubles. Ajoutez un bien complet ou un logement à louer.",
    side: "top",
    align: "start"
  },
  {
    element: "#clients-container",
    url: "/dashboard/clients",
    title: "Propriétaires",
    description: "Gérez vos clients propriétaires, rattachez leurs biens, et suivez l'occupation de chaque client.",
    side: "top",
    align: "start"
  },
  {
    element: "#listings-container",
    url: "/dashboard/listings",
    title: "Annonces & candidatures",
    description: "Publiez vos annonces de location, recevez les dossiers en ligne et suivez les candidatures.",
    side: "top",
    align: "start"
  },
  {
    element: "#tenants-container",
    url: "/dashboard/tenants",
    title: "Suivi des locataires",
    description: "Gérez vos locataires actifs, visualisez leurs fiches et gérez leurs invitations d'accès.",
    side: "top",
    align: "start"
  },
  {
    element: "#leases-container",
    url: "/dashboard/leases",
    title: "Contrats de location",
    description: "Créez les contrats, suivez les renouvellements, les révisions de loyer et les échéances.",
    side: "top",
    align: "start"
  },
  {
    element: "#move-outs-container",
    url: "/dashboard/move-outs",
    title: "Fin de location",
    description: "Suivez les sorties, les états des lieux et le solde de tout compte des locataires.",
    side: "top",
    align: "start"
  },
  // Finances
  {
    element: "#revenues-container",
    url: "/dashboard/revenues",
    title: "Suivi des revenus",
    description: "Visualisez les encaissements, les garanties en réserve et l'évolution de vos entrées d'argent.",
    side: "top",
    align: "start"
  },
  {
    element: "#expenses-container",
    url: "/dashboard/expenses",
    title: "Journal des dépenses",
    description: "Saisissez et catégorisez les charges de vos biens pour un suivi clair.",
    side: "top",
    align: "start"
  },
  {
    element: "#reports-container",
    url: "/dashboard/reports",
    title: "Rapports financiers",
    description: "Générez des synthèses d'activité, analysez le résultat par bien et exportez vos données en PDF ou CSV.",
    side: "top",
    align: "start"
  },
  {
    element: "#payments-container",
    url: "/dashboard/payments",
    title: "Loyers & facturation",
    description: "Suivez la collecte de vos loyers, enregistrez les paiements et relancez les retards.",
    side: "top",
    align: "start"
  },
  {
    element: "#invoices-container",
    url: "/dashboard/invoices",
    title: "Gestion des factures",
    description: "Émettez des appels de loyers, suivez le statut des factures et gérez les soldes.",
    side: "top",
    align: "start"
  },
  // Services
  {
    element: "#maintenance-container",
    url: "/dashboard/maintenance",
    title: "Réparations",
    description: "Suivez les signalements de vos locataires, planifiez les interventions et gérez vos prestataires.",
    side: "top",
    align: "start"
  },
  {
    element: "#documents-container",
    url: "/dashboard/documents",
    title: "Mes documents",
    description: "Stockez et partagez les documents officiels, contrats signés, pièces d'identité et attestations.",
    side: "top",
    align: "start"
  },
  // Organisation
  {
    element: "#team-container",
    url: "/dashboard/team",
    title: "Gestion d'équipe",
    description: "Invitez des collaborateurs, configurez les permissions et déléguez des tâches.",
    side: "top",
    align: "start"
  },
  {
    element: "#audit-container",
    url: "/dashboard/audit",
    title: "Journal d'audit",
    description: "Pour la conformité et la sécurité, suivez l'historique des actions effectuées par votre équipe.",
    side: "top",
    align: "start"
  },
  // Final relaunch button step
  {
    element: "#start-tour-button",
    url: "/dashboard",
    title: "Visite Terminée !",
    description: "Félicitations, vous avez complété la visite guidée ! Pour revoir ce guide à tout moment, cliquez simplement ici.",
    side: "bottom",
    align: "end"
  }
];

function getSectionName(url: string): string {
  switch (url) {
    case "/dashboard":
      return "Vue d'ensemble";
    case "/dashboard/properties":
      return "Mes biens";
    case "/dashboard/clients":
      return "Propriétaires";
    case "/dashboard/listings":
      return "Annonces";
    case "/dashboard/tenants":
      return "Locataires";
    case "/dashboard/leases":
      return "Contrats";
    case "/dashboard/move-outs":
      return "Fin de location";
    case "/dashboard/revenues":
      return "Revenus";
    case "/dashboard/expenses":
      return "Dépenses";
    case "/dashboard/reports":
      return "Rapports";
    case "/dashboard/payments":
      return "Paiements";
    case "/dashboard/invoices":
      return "Factures";
    case "/dashboard/maintenance":
      return "Réparations";
    case "/dashboard/documents":
      return "Documents";
    case "/dashboard/team":
      return "Équipe";
    case "/dashboard/audit":
      return "Audit";
    default:
      return "Suivant";
  }
}

export default function DashboardTour({ access }: DashboardTourProps): null {
  const router = useRouter();
  const pathname = usePathname();
  
  // Track redirection flag to prevent progress wipeout on page change
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    let activeDriver: any = null;
    isRedirectingRef.current = false;

    // Dynamically load driver.js client-side
    import("driver.js").then(({ driver }) => {
      const savedStep = localStorage.getItem("hhousing.tour.step");

      const navigateStep = (targetStep: number, url: string) => {
        isRedirectingRef.current = true;
        localStorage.setItem("hhousing.tour.step", String(targetStep));
        if (activeDriver) {
          activeDriver.destroy();
        }
        router.push(url);
      };

      // Filter steps dynamically based on section access
      const filteredStepDefs = ALL_STEPS.filter((step) => {
        if (step.url === "/dashboard") {
          return access.dashboard;
        }
        if (
          step.url === "/dashboard/properties" ||
          step.url === "/dashboard/clients" ||
          step.url === "/dashboard/listings" ||
          step.url === "/dashboard/tenants" ||
          step.url === "/dashboard/leases" ||
          step.url === "/dashboard/move-outs"
        ) {
          return access.operations;
        }
        if (
          step.url === "/dashboard/revenues" ||
          step.url === "/dashboard/expenses" ||
          step.url === "/dashboard/reports" ||
          step.url === "/dashboard/payments" ||
          step.url === "/dashboard/invoices"
        ) {
          return access.finances;
        }
        if (step.url === "/dashboard/maintenance" || step.url === "/dashboard/documents") {
          return access.services;
        }
        if (step.url === "/dashboard/team") {
          return access.organization;
        }
        if (step.url === "/dashboard/audit") {
          return access.audit;
        }
        return true;
      });

      // Map step definitions to driver.js format
      const steps = filteredStepDefs.map((def, index) => {
        const stepObj: any = {};
        if (def.element) {
          stepObj.element = def.element;
        }

        const popoverObj: any = {
          title: def.title,
          description: def.description,
          side: def.side,
          align: def.align,
          onHighlightStarted: () => {
            // Adjust Next button label if it transitions across pages
            const nextStep = filteredStepDefs[index + 1];
            const nextBtn = document.querySelector(".driver-popover-next-btn") as HTMLElement | null;
            if (nextBtn && nextStep) {
              if (nextStep.url !== def.url) {
                const nextSectionName = getSectionName(nextStep.url);
                nextBtn.innerHTML = `Section suivante (${nextSectionName}) &rarr;`;
              } else {
                nextBtn.innerHTML = "Suivant &rarr;";
              }
            }

            // Adjust Prev button label if it transitions across pages
            const prevStep = filteredStepDefs[index - 1];
            const prevBtn = document.querySelector(".driver-popover-prev-btn") as HTMLElement | null;
            if (prevBtn && prevStep) {
              if (prevStep.url !== def.url) {
                const prevSectionName = getSectionName(prevStep.url);
                prevBtn.innerHTML = `&larr; Retour (${prevSectionName})`;
              } else {
                prevBtn.innerHTML = "&larr; Précédent";
              }
            }
          }
        };

        const nextStep = filteredStepDefs[index + 1];
        const prevStep = filteredStepDefs[index - 1];

        if (nextStep) {
          popoverObj.onNextClick = (element: any, step: any, options: any) => {
            if (nextStep.url !== def.url) {
              navigateStep(index + 1, nextStep.url);
            } else {
              options.driver.moveNext();
            }
          };
        }

        if (prevStep) {
          popoverObj.onPrevClick = (element: any, step: any, options: any) => {
            if (prevStep.url !== def.url) {
              navigateStep(index - 1, prevStep.url);
            } else {
              options.driver.movePrevious();
            }
          };
        }

        stepObj.popover = popoverObj;
        return stepObj;
      });

      const startTour = (startIndex = 0) => {
        if (activeDriver) {
          activeDriver.destroy();
        }

        activeDriver = driver({
          showProgress: true,
          nextBtnText: "Suivant",
          prevBtnText: "Précédent",
          doneBtnText: "Terminer",
          steps: steps,
          onDestroyed: () => {
            if (!isRedirectingRef.current) {
              localStorage.removeItem("hhousing.tour.step");
              localStorage.setItem("hhousing.tour.completed", "true");
            }
          }
        });

        activeDriver.drive(startIndex);
      };

      // Check if we should resume tour on this page load
      if (savedStep !== null) {
        const stepIndex = parseInt(savedStep, 10);
        const targetStep = filteredStepDefs[stepIndex];

        if (targetStep && pathname === targetStep.url) {
          const targetSelector = targetStep.element;
          
          if (!targetSelector || document.querySelector(targetSelector)) {
            startTour(stepIndex);
          } else {
            // Element might not be immediately available due to routing latency
            const timer = setTimeout(() => {
              if (!targetSelector || document.querySelector(targetSelector)) {
                startTour(stepIndex);
              }
            }, 300);
            return () => clearTimeout(timer);
          }
        }
      }

      // Handle manual trigger click from navigation button
      const triggerBtn = document.getElementById("start-tour-button");
      const handleManualTrigger = () => {
        if (pathname === "/dashboard") {
          startTour(0);
        } else {
          localStorage.setItem("hhousing.tour.step", "0");
          router.push("/dashboard");
        }
      };

      if (triggerBtn) {
        triggerBtn.addEventListener("click", handleManualTrigger);
      }

      return () => {
        if (triggerBtn) {
          triggerBtn.removeEventListener("click", handleManualTrigger);
        }
      };
    }).catch(err => {
      console.error("Failed to load driver.js client side:", err);
    });

    return () => {
      if (activeDriver) {
        isRedirectingRef.current = true;
        activeDriver.destroy();
      }
    };
  }, [pathname, router, access]);

  return null;
}
