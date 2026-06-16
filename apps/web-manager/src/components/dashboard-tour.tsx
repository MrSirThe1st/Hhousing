"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import "driver.js/dist/driver.css";

export default function DashboardTour(): null {
  const router = useRouter();
  const pathname = usePathname();
  
  // Track redirection flag to prevent progress wipeout on page change
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    let activeDriver: any = null;
    isRedirectingRef.current = false;

    // Dynamically load driver.js client-side
    import("driver.js").then(({ driver }) => {
      const hasCompletedTour = localStorage.getItem("hhousing.tour.completed");
      const savedStep = localStorage.getItem("hhousing.tour.step");

      const navigateStep = (targetStep: number, url: string) => {
        isRedirectingRef.current = true;
        localStorage.setItem("hhousing.tour.step", String(targetStep));
        if (activeDriver) {
          activeDriver.destroy();
        }
        router.push(url);
      };

      const steps = [
        // Step 0: Welcome Popover (on /dashboard)
        {
          popover: {
            title: "Bienvenue sur Haraka Property !",
            description: "Ce guide interactif complet vous aidera à prendre en main toute la plateforme. Nous allons visiter ensemble les différentes sections.",
            side: "left" as const,
            align: "start" as const
          }
        },
        // Step 1: Dashboard Tabs (on /dashboard)
        {
          element: "#dashboard-tabs",
          popover: {
            title: "Vues du Tableau de Bord",
            description: "Basculez entre la vue d'ensemble des indicateurs, vos tâches opérationnelles et le calendrier.",
            side: "bottom" as const,
            align: "start" as const
          }
        },
        // Step 2: Financial overview (on /dashboard)
        {
          element: "#financial-overview",
          popover: {
            title: "Pilotage Financier",
            description: "Suivez en temps réel le total des loyers encaissés, vos charges/dépenses d'exploitation, votre solde net et les encours en retard.",
            side: "bottom" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(3, "/dashboard/properties");
          }
        },
        // Step 3: Portfolio List (on /dashboard/properties)
        {
          element: "#properties-container",
          popover: {
            title: "Gestion du Portfolio (Biens)",
            description: "Ici, gérez votre parc immobilier. Vous pouvez ajouter des biens complexes (immeubles) ou des unités locatives simples.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(4, "/dashboard/tenants");
          },
          onPrevClick: () => {
            navigateStep(2, "/dashboard");
          }
        },
        // Step 4: Tenants List (on /dashboard/tenants)
        {
          element: "#tenants-container",
          popover: {
            title: "Suivi des Locataires",
            description: "Gérez vos locataires actifs, visualisez leurs fiches d'information et gérez leurs invitations d'accès.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(5, "/dashboard/leases");
          },
          onPrevClick: () => {
            navigateStep(3, "/dashboard/properties");
          }
        },
        // Step 5: Leases List (on /dashboard/leases)
        {
          element: "#leases-container",
          popover: {
            title: "Gestion des Contrats de Bail",
            description: "Rédigez les baux, suivez les renouvellements, les révisions de loyer et les échéances de vos contrats.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(6, "/dashboard/payments");
          },
          onPrevClick: () => {
            navigateStep(4, "/dashboard/tenants");
          }
        },
        // Step 6: Payments & Invoices (on /dashboard/payments)
        {
          element: "#payments-container",
          popover: {
            title: "Loyers & Facturation",
            description: "Suivez la collecte de vos loyers, enregistrez les paiements et relancez les retards de facturation.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(7, "/dashboard/maintenance");
          },
          onPrevClick: () => {
            navigateStep(5, "/dashboard/leases");
          }
        },
        // Step 7: Maintenance Issues (on /dashboard/maintenance)
        {
          element: "#maintenance-container",
          popover: {
            title: "Tickets de Maintenance",
            description: "Suivez les réclamations de vos locataires, planifiez les interventions de réparation et gérez vos prestataires.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(8, "/dashboard/team");
          },
          onPrevClick: () => {
            navigateStep(6, "/dashboard/payments");
          }
        },
        // Step 8: Team members (on /dashboard/team)
        {
          element: "#team-container",
          popover: {
            title: "Gestion d'Équipe",
            description: "Invitez des collaborateurs, configurez les permissions d'accès et déléguez des tâches d'exploitation.",
            side: "top" as const,
            align: "start" as const
          },
          onNextClick: () => {
            navigateStep(9, "/dashboard");
          },
          onPrevClick: () => {
            navigateStep(7, "/dashboard/maintenance");
          }
        },
        // Step 9: Final Relaunch Step (on /dashboard)
        {
          element: "#start-tour-button",
          popover: {
            title: "Visite Terminée !",
            description: "Félicitations, vous avez complété la visite guidée ! Pour revoir ce guide à tout moment, cliquez simplement ici.",
            side: "bottom" as const,
            align: "end" as const
          },
          onPrevClick: () => {
            navigateStep(8, "/dashboard/team");
          }
        }
      ];

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
        
        // Ensure steps match target pathname to avoid highlighting wrong page elements
        const isTargetMatch = 
          (stepIndex <= 2 && pathname === "/dashboard") ||
          (stepIndex === 3 && pathname === "/dashboard/properties") ||
          (stepIndex === 4 && pathname === "/dashboard/tenants") ||
          (stepIndex === 5 && pathname === "/dashboard/leases") ||
          (stepIndex === 6 && pathname === "/dashboard/payments") ||
          (stepIndex === 7 && pathname === "/dashboard/maintenance") ||
          (stepIndex === 8 && pathname === "/dashboard/team") ||
          (stepIndex === 9 && pathname === "/dashboard");

        if (isTargetMatch) {
          const targetSelector = steps[stepIndex]?.element;
          
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
      } else if (!hasCompletedTour && pathname === "/dashboard") {
        // Auto-start for first-time operators
        const timer = setTimeout(() => {
          startTour(0);
        }, 800);
        return () => clearTimeout(timer);
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
  }, [pathname, router]);

  return null;
}
