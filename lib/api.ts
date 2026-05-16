const BASE = "";

export async function getProducts() {
  const res = await fetch(`${BASE}/api/products`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function createReservation(data: {
  productId: string;
  warehouseId: string;
  quantity: number;
}) {
  const res = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, ...json };
  return json;
}

export async function confirmReservation(id: string) {
  const res = await fetch(`/api/reservations/${id}/confirm`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, ...json };
  return json;
}

export async function releaseReservation(id: string) {
  const res = await fetch(`/api/reservations/${id}/release`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, ...json };
  return json;
}