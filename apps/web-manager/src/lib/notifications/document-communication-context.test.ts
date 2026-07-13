import { describe, expect, it } from "vitest";
import {
  resolveDocumentCommunicationPropertyLabel,
  resolveDocumentCommunicationTenant
} from "./document-communication-context";

describe("resolveDocumentCommunicationPropertyLabel", () => {
  it("builds a property label from the selected lease", () => {
    expect(resolveDocumentCommunicationPropertyLabel({
      lease: {
        id: "lease-1",
        tenantId: "tenant-1",
        tenantFullName: "Jean Dupont",
        tenantEmail: "jean@example.com",
        unitId: "unit-1",
        startDate: "2026-04-01",
        endDate: null,
        monthlyRentAmount: 500,
        currencyCode: "CDF",
        status: "active"
      },
      properties: [
        {
          property: {
            id: "property-1",
            organizationId: "org-1",
            name: "Résidence Les Palmiers",
            address: "1 Avenue Test",
            city: "Kinshasa",
            countryCode: "CD",
            managementContext: "managed",
            propertyType: "multi_unit",
            yearBuilt: null,
            photoUrls: [],
            clientId: null,
            clientName: null,
            status: "active",
            createdAtIso: "2026-01-01T00:00:00.000Z"
          },
          units: [
            {
              id: "unit-1",
              propertyId: "property-1",
              unitNumber: "12B",
              monthlyRentAmount: 500,
              depositAmount: 100,
              currencyCode: "CDF",
              status: "occupied",
              bedroomCount: null,
              bathroomCount: null,
              sizeSqm: null,
              amenities: [],
              features: [],
              createdAtIso: "2026-01-01T00:00:00.000Z"
            }
          ]
        }
      ]
    })).toBe("Résidence Les Palmiers - unité 12B");
  });
});

describe("resolveDocumentCommunicationTenant", () => {
  it("prefers the tenant record when available", () => {
    expect(resolveDocumentCommunicationTenant({
      tenant: {
        id: "tenant-1",
        organizationId: "org-1",
        authUserId: null,
        fullName: "Jean Dupont",
        email: "jean@example.com",
        phone: "+243700000000",
        whatsappNumber: "+243700000001",
        whatsappOptIn: true,
        dateOfBirth: null,
        photoUrl: null,
        employmentStatus: null,
        jobTitle: null,
        monthlyIncome: null,
        numberOfOccupants: null,
        createdAtIso: "2026-01-01T00:00:00.000Z"
      },
      lease: null,
      recipientEmail: "jean@example.com"
    })).toEqual({
      tenantId: "tenant-1",
      tenantFullName: "Jean Dupont",
      tenantPhone: "+243700000000",
      tenantWhatsappNumber: "+243700000001",
      tenantWhatsappOptIn: true
    });
  });
});
