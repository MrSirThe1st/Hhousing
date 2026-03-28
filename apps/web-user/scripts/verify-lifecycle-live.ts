import {
  createPostgresListingIntentRepositoryFromConnectionString
} from "@hhousing/data-access";
import type { AuthSession } from "@hhousing/api-contracts";
import { getListingIntents } from "../src/api/listings/intents/get.js";
import { updateListingIntentStatus } from "../src/api/listings/intents/update-status.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const repository = createPostgresListingIntentRepositoryFromConnectionString(connectionString);

  const ownerSession: AuthSession = {
    userId: "usr_live_owner_1",
    role: "owner"
  };

  const managerSession: AuthSession = {
    userId: "usr_live_manager_1",
    role: "manager"
  };

  const listingId = `lst_live_${Date.now()}`;

  const created = await repository.create({
    id: listingId,
    title: "Live lifecycle verification",
    purpose: "rent",
    priceUsd: 1800,
    location: "Dubai Marina",
    status: "draft",
    createdByUserId: ownerSession.userId
  });

  assert(created.status === "draft", "Listing must start as draft");

  const submitResult = await updateListingIntentStatus(
    {
      id: listingId,
      session: ownerSession,
      status: "submitted"
    },
    { repository }
  );

  assert(submitResult.status === 200, "Owner submit should return 200");
  assert(submitResult.body.success, "Owner submit should succeed");

  const reviewResult = await getListingIntents(
    {
      session: managerSession,
      scope: "review",
      status: "submitted",
      page: 1,
      pageSize: 20,
      sort: "latest"
    },
    { repository }
  );

  assert(reviewResult.status === 200, "Review queue read should return 200");
  assert(reviewResult.body.success, "Review queue read should succeed");

  const inReviewQueue = reviewResult.body.success
    ? reviewResult.body.data.items.some((item) => item.id === listingId)
    : false;
  assert(inReviewQueue, "Submitted listing must appear in review queue");

  const approveResult = await updateListingIntentStatus(
    {
      id: listingId,
      session: managerSession,
      status: "approved"
    },
    { repository }
  );

  assert(approveResult.status === 200, "Manager approve should return 200");
  assert(approveResult.body.success, "Manager approve should succeed");

  const reviewAfterApprove = await getListingIntents(
    {
      session: managerSession,
      scope: "review",
      status: "submitted",
      page: 1,
      pageSize: 20,
      sort: "latest"
    },
    { repository }
  );

  assert(reviewAfterApprove.status === 200, "Review read after approve should return 200");
  assert(reviewAfterApprove.body.success, "Review read after approve should succeed");

  const stillInSubmittedQueue = reviewAfterApprove.body.success
    ? reviewAfterApprove.body.data.items.some((item) => item.id === listingId)
    : true;
  assert(!stillInSubmittedQueue, "Approved listing must leave submitted review queue");

  const invalidBackTransition = await updateListingIntentStatus(
    {
      id: listingId,
      session: managerSession,
      status: "rejected"
    },
    { repository }
  );

  assert(
    invalidBackTransition.status === 422,
    "Approved -> rejected should fail transition validation"
  );

  process.stdout.write(
    `Live lifecycle verification passed for ${listingId}. Keep or clean this fixture manually if needed.\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Live lifecycle verification failed: ${message}\n`);
  process.exitCode = 1;
});
