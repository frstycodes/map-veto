import { query, mutation } from "./_generated/server";
// Query function to get the current counter value
export const getCounter = query(async ({ db }) => {
  const counterDoc = await db.query("counter").first();
  return counterDoc?.value ?? 0;
});

// Mutation function to increment the counter
export const incrementCounter = mutation(async ({ db }) => {
  const counterDoc = await db.query("counter").first();

  if (counterDoc) {
    await db.patch(counterDoc._id, { value: counterDoc.value + 1 });
    return counterDoc.value + 1;
  } else {
    await db.insert("counter", { value: 1 });
    return 1;
  }
});

// Mutation function to reset the counter
export const resetCounter = mutation(async ({ db }) => {
  const counterDoc = await db.query("counter").first();

  if (counterDoc) {
    await db.patch(counterDoc._id, { value: 0 });
  } else {
    await db.insert("counter", { value: 0 });
  }

  return 0;
});
