"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { confirmReservation, releaseReservation } from "@/lib/api";

type Reservation = {
  id: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
};

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    function tick() {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { minutes, seconds, isExpired: remaining === 0 };
}

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = use(params);

  const { minutes, seconds, isExpired } = useCountdown(
    reservation?.expiresAt ?? new Date(Date.now() + 600000).toISOString()
  );

  useEffect(() => {
    fetch(`/api/reservations/${resolvedParams.id}`)
      .then((r) => r.json())
      .then(setReservation)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  async function handleConfirm() {
    setActing(true); setError(null);
    try {
      await confirmReservation(resolvedParams.id);
      setReservation((r) => r && { ...r, status: "CONFIRMED" });
    } catch (err: any) {
      if (err.status === 410) {
        setError("Your reservation expired before payment completed.");
        setReservation((r) => r && { ...r, status: "RELEASED" });
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally { setActing(false); }
  }

  async function handleCancel() {
    setActing(true); setError(null);
    try {
      await releaseReservation(resolvedParams.id);
      setReservation((r) => r && { ...r, status: "RELEASED" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setActing(false); }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f0f0f", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease both; }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(232,213,176,0.3); }
          70%  { box-shadow: 0 0 0 12px rgba(232,213,176,0); }
          100% { box-shadow: 0 0 0 0 rgba(232,213,176,0); }
        }
        .timer-pulse { animation: pulse-ring 2s infinite; }
        .btn-primary {
          flex: 1; padding: 14px;
          background: #e8d5b0; color: #0f0f0f;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-primary:hover:not(:disabled) { background: #f0e0c0; transform: scale(1.02); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost {
          flex: 1; padding: 14px;
          background: transparent; color: #888;
          border: 1px solid #2a2a2a; border-radius: 10px;
          font-size: 15px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-ghost:hover:not(:disabled) { border-color: #555; color: #ccc; }
        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid #2a2a2a", padding: "0 32px", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0f0f0f",
      }}>
        <span
          onClick={() => router.push("/")}
          style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#e8d5b0", cursor: "pointer" }}
        >
          allo
        </span>
        <span style={{ fontSize: "12px", color: "#555", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Checkout
        </span>
      </nav>

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>
        {loading && (
          <div style={{ background: "#1a1a1a", borderRadius: "16px", height: "320px",
            background: "linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        )}

        {!loading && !reservation && (
          <div style={{ textAlign: "center", color: "#666", paddingTop: "80px" }}>
            <p style={{ fontSize: "16px", marginBottom: "24px" }}>Reservation not found.</p>
            <button className="btn-primary" style={{ maxWidth: "200px" }} onClick={() => router.push("/")}>
              Back to shop
            </button>
          </div>
        )}

        {!loading && reservation && (
          <div className="fade-up">
            {/* Product info card */}
            <div style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: "16px", padding: "28px", marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    Reserving
                  </p>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#f5f0e8", lineHeight: 1.2 }}>
                    {reservation.productName}
                  </h1>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  background: reservation.status === "CONFIRMED" ? "#102a15" : reservation.status === "RELEASED" ? "#2a1515" : "#1a1a10",
                  color: reservation.status === "CONFIRMED" ? "#4ade80" : reservation.status === "RELEASED" ? "#f87171" : "#fbbf24",
                }}>
                  {reservation.status}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Warehouse", value: reservation.warehouseName },
                  { label: "Quantity", value: `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#111", borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "11px", color: "#555", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ fontSize: "14px", color: "#d0ccc4", fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer / status card */}
            {reservation.status === "PENDING" && (
              <div style={{
                background: isExpired ? "#2a1515" : "#141410",
                border: `1px solid ${isExpired ? "#5a2020" : "#3a3020"}`,
                borderRadius: "16px", padding: "28px",
                textAlign: "center", marginBottom: "16px",
              }}
                className={!isExpired ? "timer-pulse" : ""}
              >
                {isExpired ? (
                  <>
                    <p style={{ fontSize: "28px", marginBottom: "6px" }}>⏰</p>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#f87171" }}>Reservation expired</p>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>This hold has been released.</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                      Held for you
                    </p>
                    <p style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "52px", color: "#e8d5b0", lineHeight: 1,
                      letterSpacing: "-0.02em", marginBottom: "6px",
                    }}>
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </p>
                    <p style={{ fontSize: "12px", color: "#666" }}>minutes remaining</p>
                  </>
                )}
              </div>
            )}

            {reservation.status === "CONFIRMED" && (
              <div style={{
                background: "#102a15", border: "1px solid #1a4a25",
                borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "16px",
              }}>
                <p style={{ fontSize: "28px", marginBottom: "6px" }}>✓</p>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#4ade80" }}>Purchase confirmed!</p>
                <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Your order has been placed successfully.</p>
              </div>
            )}

            {reservation.status === "RELEASED" && !error && (
              <div style={{
                background: "#2a1515", border: "1px solid #5a2020",
                borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "16px",
              }}>
                <p style={{ fontSize: "13px", color: "#f87171" }}>This reservation has been released.</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: "#2a1515", border: "1px solid #5a2020",
                borderRadius: "10px", padding: "14px 18px",
                color: "#f87171", fontSize: "14px", marginBottom: "16px",
                display: "flex", gap: "8px", alignItems: "center",
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* Action buttons */}
            {reservation.status === "PENDING" && !isExpired && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-primary" onClick={handleConfirm} disabled={acting}>
                  {acting ? "Processing…" : "Confirm purchase"}
                </button>
                <button className="btn-ghost" onClick={handleCancel} disabled={acting}>
                  Cancel
                </button>
              </div>
            )}

            {(reservation.status === "RELEASED" || isExpired) && (
              <button className="btn-primary" onClick={() => router.push("/")} style={{ width: "100%" }}>
                Back to shop
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}