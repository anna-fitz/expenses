import { doc, getDoc, writeBatch } from "firebase/firestore";
import { slug } from "@/domain/stores.js";
import { db } from "./firebase";
import type { Person } from "./types";

// Starting data, written once when the database is empty.
const SEED_BILLS: [string, string, number, string, number][] = [
  ["electricity", "Electricity", 64555, "Utilities", 1], ["internet", "Internet", 8000, "Utilities", 2],
  ["gas-bill", "Gas bill", 1700, "Utilities", 3], ["water", "Water", 28000, "Utilities", 4],
  ["pool-service", "Pool service", 12000, "Pool & yard", 5], ["gardener", "Gardener", 10000, "Pool & yard", 6]
];
const SEED_STORES: [string, string, number][] = [
  ["Amazon", "Home & household", 61], ["Target", "Home & household", 49], ["Ralphs", "Groceries", 38],
  ["Costco", "Groceries", 20], ["Sprouts", "Groceries", 12], ["Chewy", "Pets", 12], ["Home Depot", "Home & household", 11],
  ["Fuel", "Car & fuel", 10], ["H Mart", "Groceries", 9], ["DoorDash", "Dining & takeout", 6], ["Chipotle", "Dining & takeout", 6],
  ["Total Wine", "Drinks & smoke shop", 4], ["Paris Baguette", "Dining & takeout", 4], ["Trader Joe's", "Groceries", 4],
  ["Aldi", "Groceries", 3], ["Petsmart", "Pets", 3], ["Dog training", "Pets", 3], ["Electricity", "Utilities", 3],
  ["Internet", "Utilities", 3], ["Gas bill", "Utilities", 3], ["Water", "Utilities", 2], ["Pool service", "Pool & yard", 3],
  ["Gardener", "Pool & yard", 2]
];

// `billPayer` is member b, which reproduces the live app's default bill payer.
export async function seedIfEmpty(by: Person, billPayer: Person) {
  try {
    const flag = await getDoc(doc(db, "config", "seed"));
    if (flag.exists()) return;
    const b = writeBatch(db);
    SEED_BILLS.forEach(([id, name, cents, category, order]) => b.set(doc(db, "bills", id), { name, usualCents: cents, category, order, payer: billPayer, active: true }));
    SEED_STORES.forEach(([name, category, count]) => b.set(doc(db, "merchants", slug(name)), { name, category, count }, { merge: true }));
    b.set(doc(db, "config", "seed"), { at: Date.now(), by });
    await b.commit();
  } catch (e) { console.warn("Seed skipped", e); }
}
