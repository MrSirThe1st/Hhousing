import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  CITIES,
  LISTING_DESCRIPTIONS,
  LOGINABLE,
  ORG_PROFILES,
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  SP_CATEGORIES,
  TEAM_FUNCTIONS,
  VOLUME,
  MESSAGE_SNIPPETS,
  SEED_MARKER
} from "./config.mjs";
import {
  bulkInsert,
  chance,
  drcPhone,
  frenchFullName,
  monthKeysBack,
  normalizePhone,
  pick,
  pickCity,
  pickCurrency,
  propertyName,
  propertyPhotoUrls,
  randInt,
  randomPastDate,
  rentAmount,
  seedId,
  streetAddress,
  tenantPhotoUrl,
  toDateOnly,
  toTimestamptz,
  unitAmenities
} from "./lib.mjs";

function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function ensureAuthUser(supabase, client, { email, password, fullName }) {
  const existingId = await findAuthUserIdByEmailDb(client, email);
  if (existingId) {
    await supabase.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, seed: true }
    });
    return { id: existingId, email, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, seed: true, seed_marker: SEED_MARKER }
  });
  if (error) throw new Error(`Failed creating ${email}: ${error.message}`);
  return { id: data.user.id, email, created: true };
}

async function findAuthUserIdByEmailDb(client, email) {
  const result = await client.query(
    `select id::text as id from auth.users where lower(email) = lower($1) limit 1`,
    [email]
  );
  return result.rows[0]?.id ?? null;
}

export async function runSeed(client) {
  const supabase = createSupabase();
  const credentials = [];
  const started = Date.now();

  console.log("Creating loginable Supabase auth users...");
  const authUsers = {};

  const admin = await ensureAuthUser(supabase, client, {
    email: LOGINABLE.admin.email,
    password: SEED_PASSWORD,
    fullName: LOGINABLE.admin.fullName
  });
  authUsers.admin = admin;
  credentials.push({
    type: "platform_admin",
    email: admin.email,
    password: SEED_PASSWORD,
    note: "Sign in at /login → routed to /admin"
  });

  for (const op of LOGINABLE.operators) {
    const u = await ensureAuthUser(supabase, client, {
      email: op.email,
      password: SEED_PASSWORD,
      fullName: op.fullName
    });
    authUsers[op.email] = { ...u, ...op };
    credentials.push({
      type: op.role,
      email: op.email,
      password: SEED_PASSWORD,
      note: `Org ${op.orgKey} operator`
    });
  }

  const tenantAuth = [];
  for (const t of LOGINABLE.tenants) {
    const fullName = frenchFullName();
    const u = await ensureAuthUser(supabase, client, {
      email: t.email,
      password: SEED_PASSWORD,
      fullName
    });
    tenantAuth.push({ ...u, fullName, index: t.index });
    credentials.push({
      type: "tenant",
      email: t.email,
      password: SEED_PASSWORD,
      note: "Mobile tenant app"
    });
  }

  const ownerAuth = [];
  for (const o of LOGINABLE.owners) {
    const u = await ensureAuthUser(supabase, client, {
      email: o.email,
      password: SEED_PASSWORD,
      fullName: o.fullName
    });
    ownerAuth.push({ ...u, ...o });
    credentials.push({
      type: "owner",
      email: o.email,
      password: SEED_PASSWORD,
      note: "Owner portal"
    });
  }

  for (const c of credentials) {
    const id = await findAuthUserIdByEmailDb(client, c.email);
    if (!id) throw new Error(`Auth user missing in DB after create: ${c.email}`);
    c.userId = id;
    if (c.email === LOGINABLE.admin.email) authUsers.admin.id = id;
    if (authUsers[c.email]) authUsers[c.email].id = id;
  }
  for (const t of tenantAuth) {
    t.id = await findAuthUserIdByEmailDb(client, t.email);
  }
  for (const o of ownerAuth) {
    o.id = await findAuthUserIdByEmailDb(client, o.email);
  }

  console.log("Seeding organizations...");
  const orgs = ORG_PROFILES.map((profile) => {
    const city = pickCity();
    const created = randomPastDate(400, 900);
    return {
      id: seedId("org", profile.key, 2),
      name: profile.name,
      status: "active",
      platform_experience: profile.experience,
      contact_email: `contact.${profile.key}@seed.demo`,
      contact_phone: drcPhone(),
      contact_whatsapp: drcPhone(),
      address: streetAddress(cityByName(profile.city) ?? city),
      email_signature: `${profile.name}\n${SEED_MARKER}`,
      created_at: toTimestamptz(created),
      profile
    };
  });

  await bulkInsert(
    client,
    "organizations",
    [
      "id",
      "name",
      "status",
      "platform_experience",
      "contact_email",
      "contact_phone",
      "contact_whatsapp",
      "address",
      "email_signature",
      "created_at"
    ],
    orgs
  );

  // Platform admin
  await client.query(
    `insert into platform_admins (user_id, status, created_at, created_by_user_id)
     values ($1::uuid, 'active', now(), null)
     on conflict (user_id) do update set status = 'active'`,
    [authUsers.admin.id]
  );

  console.log("Seeding team functions + memberships...");
  const teamFunctions = [];
  const memberships = [];
  const memberFunctions = [];
  let mbrSeq = 1;
  let mfSeq = 1;

  for (const org of orgs) {
    for (const fn of TEAM_FUNCTIONS) {
      teamFunctions.push({
        id: `${org.id}_func_${fn.code.toLowerCase()}`,
        organization_id: org.id,
        function_code: fn.code,
        display_name: fn.display_name,
        description: fn.description,
        permissions: JSON.stringify(fn.permissions),
        created_at: org.created_at
      });
    }

    // Loginable operators for this org
    for (const op of LOGINABLE.operators.filter((o) => o.orgKey === org.profile.key)) {
      const user = authUsers[op.email];
      const mid = seedId("mbr", mbrSeq++);
      memberships.push({
        id: mid,
        organization_id: org.id,
        user_id: user.id,
        role: op.role,
        status: "active",
        can_own_properties: Boolean(op.canOwnProperties),
        created_at: org.created_at
      });
      memberFunctions.push({
        id: seedId("mf", mfSeq++),
        organization_id: org.id,
        member_id: mid,
        function_id: `${org.id}_func_admin`,
        assigned_by: user.id,
        created_at: org.created_at
      });
    }

    // DB-only landlords / PMs / staff (UUID-shaped ids, not in auth.users)
    const makeDbMember = (role, canOwn, functionCode) => {
      const mid = seedId("mbr", mbrSeq++);
      const uid = randomUUID();
      memberships.push({
        id: mid,
        organization_id: org.id,
        user_id: uid,
        role,
        status: chance(0.9) ? "active" : "inactive",
        can_own_properties: canOwn,
        created_at: toTimestamptz(randomPastDate(30, 400))
      });
      if (functionCode) {
        memberFunctions.push({
          id: seedId("mf", mfSeq++),
          organization_id: org.id,
          member_id: mid,
          function_id: `${org.id}_func_${functionCode.toLowerCase()}`,
          assigned_by: null,
          created_at: toTimestamptz(randomPastDate(10, 300))
        });
      }
    };

    for (let i = 0; i < org.profile.landlordCount; i++) {
      // skip if loginable landlord already covers one slot for org 01
      if (i === 0 && LOGINABLE.operators.some((o) => o.orgKey === org.profile.key && o.role === "landlord")) {
        continue;
      }
      makeDbMember("landlord", true, "ADMIN");
    }
    for (let i = 0; i < org.profile.pmCount; i++) {
      if (
        i < LOGINABLE.operators.filter((o) => o.orgKey === org.profile.key && o.role === "property_manager")
          .length
      ) {
        continue;
      }
      makeDbMember("property_manager", chance(0.3), pick(["LEASING_AGENT", "ADMIN", "ACCOUNTANT"]));
    }
    for (let i = 0; i < org.profile.staffCount; i++) {
      makeDbMember(
        "property_manager",
        false,
        pick(["LEASING_AGENT", "ACCOUNTANT", "ADMIN"])
      );
    }
  }

  await bulkInsert(client, "team_functions", [
    "id",
    "organization_id",
    "function_code",
    "display_name",
    "description",
    "permissions",
    "created_at"
  ], teamFunctions);

  await bulkInsert(client, "organization_memberships", [
    "id",
    "organization_id",
    "user_id",
    "role",
    "status",
    "can_own_properties",
    "created_at"
  ], memberships);

  await bulkInsert(client, "member_functions", [
    "id",
    "organization_id",
    "member_id",
    "function_id",
    "assigned_by",
    "created_at"
  ], memberFunctions);

  console.log("Seeding owners (org + client)...");
  const owners = [];
  const ownerPortalAccesses = [];
  let ownSeq = 1;
  let opaSeq = 1;

  for (const org of orgs) {
    const orgOwnerId = seedId("own", ownSeq++);
    owners.push({
      id: orgOwnerId,
      organization_id: org.id,
      name: org.name,
      full_name: org.name,
      owner_type: "organization",
      user_id: null,
      is_company: true,
      company_name: org.name,
      address: org.address,
      country: "République Démocratique du Congo",
      city: org.profile.city,
      state: org.profile.city,
      phone_number: org.contact_phone,
      created_at: org.created_at
    });
    org.orgOwnerId = orgOwnerId;

    // Client owners for managed properties
    const clientCount = randInt(4, 8);
    org.clientOwners = [];
    for (let i = 0; i < clientCount; i++) {
      const isCompany = chance(0.35);
      const fullName = frenchFullName();
      const id = seedId("own", ownSeq++);
      const owner = {
        id,
        organization_id: org.id,
        name: isCompany ? `${fullName} Holdings ${i + 1}` : `${fullName} (${i + 1})`,
        full_name: fullName,
        owner_type: "client",
        user_id: null,
        is_company: isCompany,
        company_name: isCompany ? `${fullName.split(" ").slice(-1)[0]} SARL` : null,
        address: streetAddress(pickCity()),
        country: "République Démocratique du Congo",
        city: org.profile.city,
        state: org.profile.city,
        phone_number: drcPhone(),
        created_at: toTimestamptz(randomPastDate(60, 500))
      };
      owners.push(owner);
      org.clientOwners.push(owner);
    }
  }

  // Link loginable owners to a client owner + portal access
  for (const oa of ownerAuth) {
    const org = orgs.find((o) => o.profile.key === oa.orgKey) ?? orgs[0];
    const client = org.clientOwners[0];
    client.user_id = oa.id;
    client.full_name = oa.fullName;
    client.name = oa.fullName;
    ownerPortalAccesses.push({
      id: seedId("opa", opaSeq++),
      owner_id: client.id,
      organization_id: org.id,
      user_id: oa.id,
      email: oa.email,
      status: "active",
      invited_by_user_id: authUsers[LOGINABLE.operators.find((o) => o.orgKey === org.profile.key)?.email]?.id ?? null,
      created_at: toTimestamptz(randomPastDate(20, 200))
    });
  }

  await bulkInsert(client, "owners", [
    "id",
    "organization_id",
    "name",
    "full_name",
    "owner_type",
    "user_id",
    "is_company",
    "company_name",
    "address",
    "country",
    "city",
    "state",
    "phone_number",
    "created_at"
  ], owners);

  if (ownerPortalAccesses.length) {
    await bulkInsert(client, "owner_portal_accesses", [
      "id",
      "owner_id",
      "organization_id",
      "user_id",
      "email",
      "status",
      "invited_by_user_id",
      "created_at"
    ], ownerPortalAccesses);
  }

  console.log("Seeding properties + units...");
  const properties = [];
  const units = [];
  let prpSeq = 1;
  let untSeq = 1;

  // Distribute property counts (floor of 2 keeps tiny orgs usable without bloating)
  const propertyCounts = ORG_PROFILES.map((p) =>
    Math.max(2, Math.round(VOLUME.properties * p.propertyShare))
  );
  // Adjust to exact-ish total
  while (propertyCounts.reduce((a, b) => a + b, 0) > VOLUME.properties) {
    propertyCounts[propertyCounts.indexOf(Math.max(...propertyCounts))] -= 1;
  }
  while (propertyCounts.reduce((a, b) => a + b, 0) < VOLUME.properties) {
    propertyCounts[0] += 1;
  }

  const unitsPerOrgTarget = ORG_PROFILES.map((p) =>
    Math.round(VOLUME.unitsTarget * p.propertyShare)
  );

  for (let oi = 0; oi < orgs.length; oi++) {
    const org = orgs[oi];
    const propCount = propertyCounts[oi];
    const unitBudget = unitsPerOrgTarget[oi];
    let unitsPlaced = 0;

    for (let pi = 0; pi < propCount; pi++) {
      const cityMeta = cityByName(org.profile.city) ?? pickCity();
      const isMulti = chance(0.78);
      const managed = chance(0.42);
      const clientOwner = managed ? pick(org.clientOwners) : null;
      const created = randomPastDate(40, 700);
      const propId = seedId("prp", prpSeq++);

      // Remaining units: last property absorbs remainder
      let unitCount;
      if (!isMulti) {
        unitCount = 1;
      } else if (pi === propCount - 1) {
        unitCount = Math.max(2, unitBudget - unitsPlaced);
      } else {
        const remainingProps = propCount - pi;
        const remainingUnits = Math.max(2, unitBudget - unitsPlaced);
        const avg = remainingUnits / remainingProps;
        unitCount = Math.max(2, Math.round(avg * (0.5 + Math.random())));
        unitCount = Math.min(unitCount, 80);
      }

      properties.push({
        id: propId,
        organization_id: org.id,
        name: propertyName(cityMeta, prpSeq),
        address: streetAddress(cityMeta),
        city: cityMeta.name,
        country_code: "CD",
        status: chance(0.94) ? "active" : "archived",
        management_context: managed ? "managed" : "owned",
        owner_id: managed ? clientOwner.id : org.orgOwnerId,
        owner_name: managed ? clientOwner.name : org.name,
        property_type: isMulti ? "multi_unit" : "single_unit",
        year_built: randInt(1985, 2024),
        photo_urls: propertyPhotoUrls(propId),
        created_at: toTimestamptz(created),
        _unitCount: unitCount,
        _org: org
      });

      const currency = pickCurrency();
      for (let u = 1; u <= unitCount; u++) {
        const rent = rentAmount(currency);
        const deposit = Number((rent * pick([1, 1, 2, 2, 3])).toFixed(2));
        const statusRoll = Math.random();
        let status = "vacant";
        if (statusRoll < VOLUME.occupancyRate) status = "occupied";
        else if (statusRoll < VOLUME.occupancyRate + 0.05) status = "inactive";

        units.push({
          id: seedId("unt", untSeq++, 6),
          organization_id: org.id,
          property_id: propId,
          unit_number: isMulti ? String(u).padStart(2, "0") : "1",
          monthly_rent_amount: rent,
          deposit_amount: deposit,
          currency_code: currency,
          status,
          bedroom_count: pick([0, 1, 1, 2, 2, 2, 3, 3, 4]),
          bathroom_count: pick([1, 1, 1.5, 2, 2]),
          size_sqm: randInt(28, 220),
          amenities: unitAmenities(),
          features: [],
          created_at: toTimestamptz(new Date(created.getTime() + u * 3600_000)),
          _propertyId: propId,
          _orgId: org.id
        });
      }
      unitsPlaced += unitCount;
    }
  }

  await bulkInsert(
    client,
    "properties",
    [
      "id",
      "organization_id",
      "name",
      "address",
      "city",
      "country_code",
      "status",
      "management_context",
      "owner_id",
      "owner_name",
      "property_type",
      "year_built",
      "photo_urls",
      "created_at"
    ],
    properties.map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      name: p.name,
      address: p.address,
      city: p.city,
      country_code: p.country_code,
      status: p.status,
      management_context: p.management_context,
      owner_id: p.owner_id,
      owner_name: p.owner_name,
      property_type: p.property_type,
      year_built: p.year_built,
      photo_urls: p.photo_urls,
      created_at: p.created_at
    }))
  );

  // pg array: pass JS arrays
  await bulkInsert(
    client,
    "units",
    [
      "id",
      "organization_id",
      "property_id",
      "unit_number",
      "monthly_rent_amount",
      "deposit_amount",
      "currency_code",
      "status",
      "bedroom_count",
      "bathroom_count",
      "size_sqm",
      "amenities",
      "features",
      "created_at"
    ],
    units.map((u) => ({
      ...u,
      amenities: u.amenities,
      features: u.features
    })),
    { batchSize: 500 }
  );

  console.log(`  properties=${properties.length} units=${units.length}`);

  console.log("Seeding tenants + leases + payments...");
  const tenants = [];
  const leases = [];
  const payments = [];
  const chargeTemplates = [];
  let tenSeq = 1;
  let leaseSeq = 1;
  let paySeq = 1;
  let tmplSeq = 1;

  const occupiedUnits = units.filter((u) => u.status === "occupied");
  const vacantForPending = units.filter((u) => u.status === "vacant").slice(0, 80);

  // Ensure loginable tenants get active leases on first org's occupied units
  const loginableLeaseUnits = occupiedUnits.slice(0, tenantAuth.length);
  const remainingOccupied = occupiedUnits.slice(tenantAuth.length);

  const assignTenantLease = ({
    unit,
    fullName,
    email,
    phone,
    authUserId,
    status,
    createdOffsetDays
  }) => {
    const orgId = unit.organization_id;
    const tenantId = seedId("ten", tenSeq++, 6);
    const created = randomPastDate(createdOffsetDays ?? 60, createdOffsetDays ? createdOffsetDays + 200 : 500);
    const phoneVal = phone ?? drcPhone();

    tenants.push({
      id: tenantId,
      organization_id: orgId,
      auth_user_id: authUserId ?? null,
      full_name: fullName,
      email: email ?? `locataire.${tenSeq}@seed.demo`,
      phone: phoneVal,
      whatsapp_number: phoneVal,
      whatsapp_opt_in: true,
      phone_normalized: normalizePhone(phoneVal),
      date_of_birth: toDateOnly(randomPastDate(8000, 20000)),
      photo_url: tenantPhotoUrl(tenantId),
      employment_status: pick(["salarié", "indépendant", "fonctionnaire", "commerçant", null]),
      job_title: chance(0.7) ? pick(["Comptable", "Ingénieur", "Commerçant", "Enseignant", "Chauffeur", "Infirmier"]) : null,
      monthly_income: chance(0.6) ? rentAmount(unit.currency_code) * randInt(3, 8) : null,
      number_of_occupants: randInt(1, 6),
      account_status: "active",
      created_at: toTimestamptz(created)
    });

    if (status === "none") return;

    const leaseId = seedId("lease", leaseSeq++, 6);
    const start = randomPastDate(status === "pending" ? 5 : 30, status === "pending" ? 45 : 400);
    const termType = chance(0.7) ? "fixed" : "month_to_month";
    const fixedMonths = termType === "fixed" ? pick([6, 12, 12, 12, 24]) : null;
    const endDate =
      termType === "fixed"
        ? toDateOnly(new Date(start.getTime() + fixedMonths * 30 * 86400000))
        : null;
    const dueDay = Math.min(28, start.getUTCDate());
    const signed =
      status === "active"
        ? toDateOnly(new Date(start.getTime() - randInt(0, 10) * 86400000))
        : null;

    leases.push({
      id: leaseId,
      organization_id: orgId,
      unit_id: unit.id,
      tenant_id: tenantId,
      start_date: toDateOnly(start),
      end_date: endDate,
      monthly_rent_amount: unit.monthly_rent_amount,
      currency_code: unit.currency_code,
      status,
      term_type: termType,
      fixed_term_months: fixedMonths,
      auto_renew_to_monthly: termType === "fixed" ? chance(0.4) : false,
      payment_frequency: "monthly",
      payment_start_date: toDateOnly(start),
      due_day_of_month: dueDay,
      deposit_amount: unit.deposit_amount,
      signed_at: signed,
      signing_method: signed ? pick(["physical", "scanned", "email_confirmation"]) : null,
      activated_at: status === "active" ? toTimestamptz(start) : null,
      move_in_mode: chance(0.15) ? "existing_tenant" : "standard",
      deposit_settled_externally: false,
      created_at: toTimestamptz(created)
    });

    if (status === "active") {
      const tmplId = seedId("lct", tmplSeq++, 6);
      chargeTemplates.push({
        id: tmplId,
        organization_id: orgId,
        lease_id: leaseId,
        label: "Loyer mensuel",
        charge_type: "rent",
        amount: unit.monthly_rent_amount,
        currency_code: unit.currency_code,
        frequency: "monthly",
        start_date: toDateOnly(start),
        end_date: endDate,
        created_at: toTimestamptz(created)
      });

      // Deposit charge
      const depPayId = seedId("pay", paySeq++, 7);
      payments.push({
        id: depPayId,
        organization_id: orgId,
        lease_id: leaseId,
        tenant_id: tenantId,
        amount: unit.deposit_amount,
        currency_code: unit.currency_code,
        due_date: toDateOnly(start),
        paid_date: toDateOnly(start),
        status: "paid",
        note: "Caution",
        payment_kind: "deposit",
        billing_frequency: "one_time",
        charge_period: null,
        source_lease_charge_template_id: null,
        is_initial_charge: true,
        created_at: toTimestamptz(start)
      });

      // Rent history — more months for older leases / "active" tenants
      const ageMonths = Math.min(
        VOLUME.paymentHistoryMonths,
        Math.max(1, Math.floor((Date.now() - start.getTime()) / (30 * 86400000)))
      );
      const months = monthKeysBack(ageMonths);
      // Power users (loginable) get fuller history
      const isPower = Boolean(authUserId);
      const monthsToUse = isPower ? months : months.slice(-randInt(3, months.length));

      for (const period of monthsToUse) {
        const [y, m] = period.split("-").map(Number);
        const due = new Date(Date.UTC(y, m - 1, Math.min(dueDay, 28)));
        const isFuture = due.getTime() > Date.now();
        const isCurrent = period === months[months.length - 1];
        let payStatus = "paid";
        let paidDate = toDateOnly(new Date(due.getTime() + randInt(0, 5) * 86400000));
        if (isFuture) {
          payStatus = "pending";
          paidDate = null;
        } else if (isCurrent && chance(0.18)) {
          payStatus = chance(0.5) ? "pending" : "overdue";
          paidDate = null;
        } else if (chance(0.06)) {
          payStatus = "overdue";
          paidDate = null;
        } else if (chance(0.02)) {
          payStatus = "cancelled";
          paidDate = null;
        }

        payments.push({
          id: seedId("pay", paySeq++, 7),
          organization_id: orgId,
          lease_id: leaseId,
          tenant_id: tenantId,
          amount: unit.monthly_rent_amount,
          currency_code: unit.currency_code,
          due_date: toDateOnly(due),
          paid_date: paidDate,
          status: payStatus,
          note: null,
          payment_kind: "rent",
          billing_frequency: "monthly",
          charge_period: period,
          source_lease_charge_template_id: tmplId,
          is_initial_charge: false,
          created_at: toTimestamptz(due)
        });
      }
    }
  };

  for (let i = 0; i < tenantAuth.length; i++) {
    const ta = tenantAuth[i];
    const unit = loginableLeaseUnits[i] ?? remainingOccupied[i];
    if (!unit) break;
    unit.status = "occupied";
    assignTenantLease({
      unit,
      fullName: ta.fullName,
      email: ta.email,
      authUserId: ta.id,
      status: "active",
      createdOffsetDays: 90
    });
  }

  for (const unit of remainingOccupied) {
    assignTenantLease({
      unit,
      fullName: frenchFullName(),
      status: "active"
    });
  }

  // Some pending leases on vacant units + extra ended history tenants without occupying
  for (const unit of vacantForPending) {
    if (!chance(0.35)) continue;
    assignTenantLease({
      unit,
      fullName: frenchFullName(),
      status: "pending"
    });
  }

  // Extra historical tenants (ended leases) without stealing occupied units
  const endedCount = Math.min(12, Math.floor(VOLUME.tenantsTarget * 0.08));
  for (let i = 0; i < endedCount; i++) {
    const unit = pick(units);
    const tenantId = seedId("ten", tenSeq++, 6);
    const phoneVal = drcPhone();
    const created = randomPastDate(400, 900);
    tenants.push({
      id: tenantId,
      organization_id: unit.organization_id,
      auth_user_id: null,
      full_name: frenchFullName(),
      email: `ancien.${tenSeq}@seed.demo`,
      phone: phoneVal,
      whatsapp_number: phoneVal,
      whatsapp_opt_in: false,
      phone_normalized: normalizePhone(phoneVal),
      date_of_birth: toDateOnly(randomPastDate(9000, 20000)),
      photo_url: chance(0.7) ? tenantPhotoUrl(tenantId) : null,
      employment_status: null,
      job_title: null,
      monthly_income: null,
      number_of_occupants: randInt(1, 4),
      account_status: "active",
      created_at: toTimestamptz(created)
    });
    const start = randomPastDate(500, 800);
    const end = randomPastDate(60, 400);
    leases.push({
      id: seedId("lease", leaseSeq++, 6),
      organization_id: unit.organization_id,
      unit_id: unit.id,
      tenant_id: tenantId,
      start_date: toDateOnly(start),
      end_date: toDateOnly(end),
      monthly_rent_amount: unit.monthly_rent_amount,
      currency_code: unit.currency_code,
      status: "ended",
      term_type: "fixed",
      fixed_term_months: 12,
      auto_renew_to_monthly: false,
      payment_frequency: "monthly",
      payment_start_date: toDateOnly(start),
      due_day_of_month: Math.min(28, start.getUTCDate()),
      deposit_amount: unit.deposit_amount,
      signed_at: toDateOnly(start),
      signing_method: "physical",
      activated_at: toTimestamptz(start),
      move_in_mode: "standard",
      deposit_settled_externally: true,
      created_at: toTimestamptz(created)
    });
  }

  // Fill remaining tenant count with unassigned prospects
  while (tenants.length < VOLUME.tenantsTarget) {
    const org = pick(orgs);
    const phoneVal = drcPhone();
    const tenantId = seedId("ten", tenSeq++, 6);
    tenants.push({
      id: tenantId,
      organization_id: org.id,
      auth_user_id: null,
      full_name: frenchFullName(),
      email: `prospect.${tenSeq}@seed.demo`,
      phone: phoneVal,
      whatsapp_number: phoneVal,
      whatsapp_opt_in: chance(0.7),
      phone_normalized: normalizePhone(phoneVal),
      date_of_birth: null,
      photo_url: chance(0.55) ? tenantPhotoUrl(tenantId) : null,
      employment_status: pick(["salarié", "indépendant", null]),
      job_title: null,
      monthly_income: null,
      number_of_occupants: null,
      account_status: "active",
      created_at: toTimestamptz(randomPastDate(10, 300))
    });
  }

  await bulkInsert(
    client,
    "tenants",
    [
      "id",
      "organization_id",
      "auth_user_id",
      "full_name",
      "email",
      "phone",
      "whatsapp_number",
      "whatsapp_opt_in",
      "phone_normalized",
      "date_of_birth",
      "photo_url",
      "employment_status",
      "job_title",
      "monthly_income",
      "number_of_occupants",
      "account_status",
      "created_at"
    ],
    tenants,
    { batchSize: 500 }
  );

  // Tenant memberships for loginable tenants
  const tenantMemberships = [];
  for (const ta of tenantAuth) {
    const tenant = tenants.find((t) => t.auth_user_id === ta.id);
    if (!tenant) continue;
    tenantMemberships.push({
      id: seedId("mbr", mbrSeq++),
      organization_id: tenant.organization_id,
      user_id: ta.id,
      role: "tenant",
      status: "active",
      can_own_properties: false,
      created_at: tenant.created_at
    });
  }
  if (tenantMemberships.length) {
    await bulkInsert(client, "organization_memberships", [
      "id",
      "organization_id",
      "user_id",
      "role",
      "status",
      "can_own_properties",
      "created_at"
    ], tenantMemberships);
  }

  await bulkInsert(
    client,
    "leases",
    [
      "id",
      "organization_id",
      "unit_id",
      "tenant_id",
      "start_date",
      "end_date",
      "monthly_rent_amount",
      "currency_code",
      "status",
      "term_type",
      "fixed_term_months",
      "auto_renew_to_monthly",
      "payment_frequency",
      "payment_start_date",
      "due_day_of_month",
      "deposit_amount",
      "signed_at",
      "signing_method",
      "activated_at",
      "move_in_mode",
      "deposit_settled_externally",
      "created_at"
    ],
    leases,
    { batchSize: 400 }
  );

  await bulkInsert(
    client,
    "lease_charge_templates",
    [
      "id",
      "organization_id",
      "lease_id",
      "label",
      "charge_type",
      "amount",
      "currency_code",
      "frequency",
      "start_date",
      "end_date",
      "created_at"
    ],
    chargeTemplates,
    { batchSize: 400 }
  );

  console.log(`  inserting ${payments.length} payments...`);
  await bulkInsert(
    client,
    "payments",
    [
      "id",
      "organization_id",
      "lease_id",
      "tenant_id",
      "amount",
      "currency_code",
      "due_date",
      "paid_date",
      "status",
      "note",
      "payment_kind",
      "billing_frequency",
      "charge_period",
      "source_lease_charge_template_id",
      "is_initial_charge",
      "created_at"
    ],
    payments,
    { batchSize: 500 }
  );

  console.log("Seeding listings (published + draft) for vacant units...");
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const orgCreatorByOrgId = new Map();
  for (const org of orgs) {
    const loginable = LOGINABLE.operators.find((o) => o.orgKey === org.profile.key);
    const fromLoginable = loginable ? authUsers[loginable.email]?.id : null;
    const fromMembership = memberships.find(
      (m) => m.organization_id === org.id && m.status === "active"
    )?.user_id;
    orgCreatorByOrgId.set(org.id, fromLoginable ?? fromMembership ?? authUsers.admin.id);
  }

  const listableUnits = units.filter((u) => {
    if (u.status !== "vacant") return false;
    const prop = propertyById.get(u.property_id);
    return prop && prop.status === "active";
  });

  const listings = [];
  const listingApplications = [];
  let lstSeq = 1;
  let appSeq = 1;

  for (const unit of listableUnits) {
    const publish = chance(VOLUME.listingPublishRate);
    const draft = !publish && chance(VOLUME.listingDraftRate);
    if (!publish && !draft) continue;

    const prop = propertyById.get(unit.property_id);
    const created = randomPastDate(3, 90);
    const status = publish ? "published" : "draft";
    const photos = Array.isArray(prop.photo_urls) ? prop.photo_urls : [];
    const cover = photos[0] ?? null;
    const gallery = photos.slice(1);
    const creatorId = orgCreatorByOrgId.get(unit.organization_id) ?? authUsers.admin.id;
    const listingId = seedId("lst", lstSeq++);

    listings.push({
      id: listingId,
      organization_id: unit.organization_id,
      property_id: unit.property_id,
      unit_id: unit.id,
      status,
      marketing_description: pick(LISTING_DESCRIPTIONS),
      cover_image_url: cover,
      gallery_image_urls: gallery,
      youtube_url: null,
      instagram_url: null,
      contact_email: chance(0.7)
        ? LOGINABLE.operators.find((o) => authUsers[o.email]?.id === creatorId)?.email ??
          `contact+${prop.city.toLowerCase()}@${SEED_EMAIL_DOMAIN}`
        : null,
      contact_phone: chance(0.85) ? drcPhone() : null,
      is_featured: status === "published" && chance(VOLUME.featuredListingRate),
      show_address: chance(0.35),
      show_rent: true,
      show_deposit: chance(0.85),
      show_amenities: true,
      show_features: true,
      show_bedrooms: true,
      show_bathrooms: true,
      show_size_sqm: true,
      show_posted_by: chance(0.4),
      published_at: status === "published" ? toTimestamptz(created) : null,
      created_by_user_id: creatorId,
      updated_by_user_id: creatorId,
      created_at: toTimestamptz(created),
      updated_at: toTimestamptz(created)
    });

    if (status === "published" && chance(VOLUME.listingApplicationChance)) {
      const appCount = randInt(1, 3);
      for (let a = 0; a < appCount; a++) {
        const appCreated = new Date(created.getTime() + randInt(1, 20) * 86400000);
        const appStatus = pick([
          "submitted",
          "submitted",
          "under_review",
          "approved",
          "rejected",
          "needs_more_info"
        ]);
        listingApplications.push({
          id: seedId("lap", appSeq++),
          listing_id: listingId,
          organization_id: unit.organization_id,
          full_name: frenchFullName(),
          email: `applicant${appSeq}@example.com`,
          phone: normalizePhone(drcPhone()),
          date_of_birth: null,
          employment_status: pick(["salarié", "indépendant", "fonctionnaire", null]),
          job_title: chance(0.6) ? pick(["Comptable", "Ingénieur", "Commerçant", "Enseignant"]) : null,
          employment_info: chance(0.4) ? "Profil candidat seed demo." : null,
          monthly_income: chance(0.55) ? rentAmount(unit.currency_code) * randInt(3, 7) : null,
          number_of_occupants: pick([1, 1, 2, 2, 3, 4]),
          notes: chance(0.3) ? "Intéressé(e) par une visite rapide." : null,
          status: appStatus,
          screening_notes:
            appStatus === "under_review" || appStatus === "approved" || appStatus === "rejected"
              ? "Notes de screening seed."
              : null,
          requested_info_message:
            appStatus === "needs_more_info" ? "Merci de fournir une fiche de paie récente." : null,
          reviewed_by_user_id:
            appStatus === "submitted" ? null : creatorId,
          reviewed_at:
            appStatus === "submitted"
              ? null
              : toTimestamptz(new Date(appCreated.getTime() + randInt(1, 5) * 86400000)),
          converted_tenant_id: null,
          created_at: toTimestamptz(appCreated),
          updated_at: toTimestamptz(appCreated)
        });
      }
    }
  }

  await bulkInsert(
    client,
    "listings",
    [
      "id",
      "organization_id",
      "property_id",
      "unit_id",
      "status",
      "marketing_description",
      "cover_image_url",
      "gallery_image_urls",
      "youtube_url",
      "instagram_url",
      "contact_email",
      "contact_phone",
      "is_featured",
      "show_address",
      "show_rent",
      "show_deposit",
      "show_amenities",
      "show_features",
      "show_bedrooms",
      "show_bathrooms",
      "show_size_sqm",
      "show_posted_by",
      "published_at",
      "created_by_user_id",
      "updated_by_user_id",
      "created_at",
      "updated_at"
    ],
    listings,
    { batchSize: 300 }
  );

  await bulkInsert(
    client,
    "listing_applications",
    [
      "id",
      "listing_id",
      "organization_id",
      "full_name",
      "email",
      "phone",
      "date_of_birth",
      "employment_status",
      "job_title",
      "employment_info",
      "monthly_income",
      "number_of_occupants",
      "notes",
      "status",
      "screening_notes",
      "requested_info_message",
      "reviewed_by_user_id",
      "reviewed_at",
      "converted_tenant_id",
      "created_at",
      "updated_at"
    ],
    listingApplications,
    { batchSize: 300 }
  );

  console.log(
    `  listings=${listings.length} (published=${listings.filter((l) => l.status === "published").length}) applications=${listingApplications.length}`
  );

  console.log("Seeding messaging, documents, expenses, prestataires...");

  const activeLeases = leases.filter((l) => l.status === "active");

  // Conversations + messages
  const conversations = [];
  const messages = [];
  let convSeq = 1;
  let msgSeq = 1;
  const convLeases = activeLeases.filter(() => chance(VOLUME.conversationRate));
  // Always include loginable tenants
  for (const ta of tenantAuth) {
    const lease = leases.find(
      (l) => l.status === "active" && tenants.find((t) => t.id === l.tenant_id)?.auth_user_id === ta.id
    );
    if (lease && !convLeases.includes(lease)) convLeases.push(lease);
  }

  const managerUserId =
    authUsers[LOGINABLE.operators[0].email]?.id ?? authUsers.admin.id;

  for (const lease of convLeases) {
    const id = seedId("conv", convSeq++, 6);
    const created = randomPastDate(5, 120);
    conversations.push({
      id,
      organization_id: lease.organization_id,
      tenant_id: lease.tenant_id,
      unit_id: lease.unit_id,
      lease_id: lease.id,
      manager_last_read_at: toTimestamptz(created),
      updated_at: toTimestamptz(created),
      created_at: toTimestamptz(created)
    });
    const msgCount = randInt(VOLUME.messagesPerConversation[0], VOLUME.messagesPerConversation[1]);
    const tenant = tenants.find((t) => t.id === lease.tenant_id);
    for (let m = 0; m < msgCount; m++) {
      const side = m % 2 === 0 ? "tenant" : "manager";
      const at = new Date(created.getTime() + m * randInt(1, 36) * 3600_000);
      messages.push({
        id: seedId("msg", msgSeq++, 7),
        organization_id: lease.organization_id,
        conversation_id: id,
        sender_side: side,
        sender_user_id: side === "tenant" ? tenant?.auth_user_id ?? null : managerUserId,
        body: pick(MESSAGE_SNIPPETS),
        created_at: toTimestamptz(at)
      });
    }
  }

  await bulkInsert(
    client,
    "conversations",
    [
      "id",
      "organization_id",
      "tenant_id",
      "unit_id",
      "lease_id",
      "manager_last_read_at",
      "updated_at",
      "created_at"
    ],
    conversations,
    { batchSize: 400 }
  );
  await bulkInsert(
    client,
    "messages",
    [
      "id",
      "organization_id",
      "conversation_id",
      "sender_side",
      "sender_user_id",
      "body",
      "created_at"
    ],
    messages,
    { batchSize: 500 }
  );

  // Documents (metadata only — placeholder URLs)
  const documents = [];
  let docSeq = 1;
  for (const lease of activeLeases) {
    if (!chance(VOLUME.documentsPerActiveLeaseChance)) continue;
    documents.push({
      id: seedId("doc", docSeq++, 6),
      organization_id: lease.organization_id,
      file_name: `bail_${lease.id}.pdf`,
      file_url: `https://seed.demo/files/bail_${lease.id}.pdf`,
      file_size: randInt(80_000, 900_000),
      mime_type: "application/pdf",
      document_type: "lease_agreement",
      attachment_type: "lease",
      attachment_id: lease.id,
      uploaded_by: managerUserId,
      created_at: lease.created_at
    });
    if (chance(0.3)) {
      documents.push({
        id: seedId("doc", docSeq++, 6),
        organization_id: lease.organization_id,
        file_name: `recu_${lease.id}.pdf`,
        file_url: `https://seed.demo/files/recu_${lease.id}.pdf`,
        file_size: randInt(20_000, 120_000),
        mime_type: "application/pdf",
        document_type: "receipt",
        attachment_type: "lease",
        attachment_id: lease.id,
        uploaded_by: managerUserId,
        created_at: toTimestamptz(randomPastDate(5, 90))
      });
    }
  }
  await bulkInsert(
    client,
    "documents",
    [
      "id",
      "organization_id",
      "file_name",
      "file_url",
      "file_size",
      "mime_type",
      "document_type",
      "attachment_type",
      "attachment_id",
      "uploaded_by",
      "created_at"
    ],
    documents,
    { batchSize: 400 }
  );

  // Expenses
  const expenses = [];
  let expSeq = 1;
  const expenseCategories = [
    "maintenance",
    "utilities",
    "taxes",
    "insurance",
    "supplies",
    "payroll",
    "cleaning",
    "security",
    "legal",
    "admin",
    "other"
  ];
  for (const org of orgs) {
    const orgProps = properties.filter((p) => p.organization_id === org.id);
    for (let i = 0; i < VOLUME.expensesPerOrg; i++) {
      const prop = pick(orgProps);
      const currency = pickCurrency();
      expenses.push({
        id: seedId("exp", expSeq++, 5),
        organization_id: org.id,
        property_id: prop.id,
        unit_id: null,
        title: pick([
          "Entretien groupe électrogène",
          "Facture REGIDESO",
          "Salaire gardien",
          "Réparation plomberie",
          "Fournitures bureau",
          "Assurance immeuble",
          "Nettoyage parties communes"
        ]),
        category: pick(expenseCategories),
        amount: currency === "USD" ? randInt(20, 2500) : randInt(50000, 4000000),
        currency_code: currency,
        expense_date: toDateOnly(randomPastDate(1, 365)),
        note: chance(0.2) ? "Dépense seed demo" : null,
        vendor_name: chance(0.5) ? pick(["REGIDESO", "SNEL", "TechPro RDC", "CleanService"]) : null,
        payee_name: chance(0.4) ? frenchFullName() : null,
        created_at: toTimestamptz(randomPastDate(1, 365))
      });
    }
  }
  await bulkInsert(
    client,
    "expenses",
    [
      "id",
      "organization_id",
      "property_id",
      "unit_id",
      "title",
      "category",
      "amount",
      "currency_code",
      "expense_date",
      "note",
      "vendor_name",
      "payee_name",
      "created_at"
    ],
    expenses
  );

  // Prestataires (mix of platform-wide + org-scoped)
  const providers = [];
  const assignments = [];
  let spSeq = 1;
  for (let i = 0; i < VOLUME.prestataires; i++) {
    const city = pickCity();
    const orgScoped = chance(0.55);
    const org = orgScoped ? pick(orgs) : null;
    const id = seedId("sp", spSeq++, 4);
    providers.push({
      id,
      organization_id: org?.id ?? null,
      category_id: pick(SP_CATEGORIES),
      name: pick([
        `${frenchFullName()} Services`,
        `Pro ${pick(["Plomberie", "Électricité", "Sécurité", "Peinture"])} ${city.name}`,
        `${pick(["Bâtiment", "Tech", "Habitat"])} ${frenchFullName().split(" ").pop()}`
      ]),
      phone: drcPhone(),
      whatsapp_phone: drcPhone(),
      description: "Prestataire seed demo — données fictives.",
      city: city.name,
      quartier: pick(city.quartiers),
      status: chance(0.9) ? "active" : "suspended",
      is_verified: chance(0.4),
      created_by_organization_id: org?.id ?? orgs[0].id,
      created_at: toTimestamptz(randomPastDate(20, 400)),
      updated_at: toTimestamptz(randomPastDate(1, 60))
    });
  }
  await bulkInsert(
    client,
    "service_providers",
    [
      "id",
      "organization_id",
      "category_id",
      "name",
      "phone",
      "whatsapp_phone",
      "description",
      "city",
      "quartier",
      "status",
      "is_verified",
      "created_by_organization_id",
      "created_at",
      "updated_at"
    ],
    providers
  );

  for (const prop of properties.filter((p) => p.status === "active")) {
    if (!chance(0.4)) continue;
    const candidates = providers.filter(
      (sp) =>
        sp.status === "active" &&
        (sp.organization_id === null || sp.organization_id === prop.organization_id)
    );
    if (!candidates.length) continue;
    const chosen = [...candidates].sort(() => Math.random() - 0.5).slice(0, randInt(1, 3));
    for (const sp of chosen) {
      assignments.push({
        property_id: prop.id,
        service_provider_id: sp.id,
        organization_id: prop.organization_id,
        created_at: prop.created_at
      });
    }
  }
  // Dedupe PK
  const seenAssign = new Set();
  const uniqueAssignments = assignments.filter((a) => {
    const key = `${a.property_id}:${a.service_provider_id}`;
    if (seenAssign.has(key)) return false;
    seenAssign.add(key);
    return true;
  });
  await bulkInsert(
    client,
    "property_service_providers",
    ["property_id", "service_provider_id", "organization_id", "created_at"],
    uniqueAssignments,
    { batchSize: 400 }
  );

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const summary = {
    organizations: orgs.length,
    memberships: memberships.length + tenantMemberships.length,
    owners: owners.length,
    properties: properties.length,
    units: units.length,
    tenants: tenants.length,
    leases: leases.length,
    payments: payments.length,
    listings: listings.length,
    listingApplications: listingApplications.length,
    conversations: conversations.length,
    messages: messages.length,
    documents: documents.length,
    expenses: expenses.length,
    prestataires: providers.length,
    elapsedSec: elapsed
  };

  return { credentials, summary };
}

function cityByName(name) {
  return CITIES.find((c) => c.name === name) ?? null;
}
