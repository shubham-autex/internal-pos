export type UpiAccount = {
  id: string;
  name: string;
};

function cleanAccount(id: unknown, name: unknown): UpiAccount | null {
  const upiId = String(id ?? "").trim();
  const upiName = String(name ?? "").trim();
  if (!upiId) return null;
  return { id: upiId, name: upiName || upiId };
}

/** Parse configured UPI payees. Supports JSON list or legacy single id/name. */
export function getUpiAccounts(): UpiAccount[] {
  const rawList = process.env.NEXT_PUBLIC_UPI_ACCOUNTS?.trim();
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList) as unknown;
      if (Array.isArray(parsed)) {
        const accounts = parsed
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const item = row as Record<string, unknown>;
            return cleanAccount(item.id ?? item.pa, item.name ?? item.pn);
          })
          .filter((row): row is UpiAccount => Boolean(row));
        if (accounts.length > 0) return accounts;
      }
    } catch {
      // Fall through to legacy single-account env vars.
    }
  }

  const single = cleanAccount(
    process.env.NEXT_PUBLIC_UPI_ID,
    process.env.NEXT_PUBLIC_UPI_NAME,
  );
  return single ? [single] : [{ id: "yourstall@upi", name: "Mela Stall" }];
}
