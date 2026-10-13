/** Message shown when a sale asks for more than the available stock. */
export function stockExceededMessage(name: string, stock: number) {
  const available = Math.max(0, Math.floor(Number(stock) || 0));
  return available <= 0
    ? `${name} is out of stock`
    : `Only ${available} left of ${name}`;
}
