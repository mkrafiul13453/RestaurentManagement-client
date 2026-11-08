const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(minor) {
  if (!Number.isSafeInteger(minor)) return "—";
  return usdFormatter.format(minor / 100);
}

export function parseDollarAmount(amount) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;

  const [whole, fraction = ""] = amount.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
