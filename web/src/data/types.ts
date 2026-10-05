export type Person = string;
export type People = { me: Person; them: Person; a: Person; b: Person; names: Record<Person, string> };
export type Theme = "system" | "light" | "dark";
export type Expense = {
  id: string; amountCents: number; payer: Person; merchant: string; category: string; date: string; split: "half" | "full";
  note?: string; covers?: string; billId?: string | null; settled: boolean; settlementId?: string | null; createdAt?: number; createdBy?: Person; oneOff?: boolean;
};
export type Settlement = { id: string; date: string; createdAt: number; from: Person | null; to: Person | null; amountCents: number; count: number; method?: string; [k: string]: unknown };
export type Merchant = { name: string; category?: string; count?: number; hidden?: boolean; mergedInto?: string | null };
export type Bill = { id: string; name: string; usualCents: number; category: string; payer: Person; order: number; active?: boolean };
export type Profile = { emoji?: string | null; color?: string; theme?: Theme; venmo?: string | null; updatedAt?: number; onboarded?: boolean };
export type Settings = { nudgeDays: number; nudgeCents: number; buckets?: Partial<Record<string, "need" | "want">> };
