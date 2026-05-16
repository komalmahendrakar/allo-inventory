"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { confirmReservation, releaseReservation } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      // Always calculate from server timestamp — never count down from a local variable
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(diff);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const isExpired = remaining === 0;

  return { minutes, seconds, isExpired };
}

export default function ReservationPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { minutes, seconds, isExpired } = useCountdown(
    reservation?.expiresAt ?? new Date().toISOString()
  );

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then((r) => r.json())
      .then(setReservation)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleConfirm() {
    setActing(true);
    setError(null);
    try {
      await confirmReservation(id);
      setReservation((r) => r && { ...r, status: "CONFIRMED" });
    } catch (err: any) {
      if (err.status === 410) {
        setError("Your reservation expired before payment could complete.");
        setReservation((r) => r && { ...r, status: "RELEASED" });
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    setActing(true);
    setError(null);
    try {
      await releaseReservation(id);
      setReservation((r) => r && { ...r, status: "RELEASED" });
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <p className="text-muted-foreground">Loading reservation...</p>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <p className="text-red-500">Reservation not found.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Back to products
        </Button>
      </main>
    );
  }

  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{reservation.productName}</CardTitle>
            <Badge
              variant={
                isConfirmed
                  ? "default"
                  : reservation.status === "RELEASED"
                  ? "destructive"
                  : "secondary"
              }
            >
              {reservation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="text-sm text-muted-foreground grid gap-1">
            <p>Warehouse: {reservation.warehouseName}</p>
            <p>Quantity: {reservation.quantity}</p>
          </div>

          {isPending && (
            <div
              className={`p-4 rounded-lg text-center ${
                isExpired
                  ? "bg-red-50 border border-red-200"
                  : "bg-amber-50 border border-amber-200"
              }`}
            >
              {isExpired ? (
                <p className="text-red-600 font-medium">Reservation expired</p>
              ) : (
                <>
                  <p className="text-amber-700 text-sm mb-1">
                    Reserved for you
                  </p>
                  <p className="text-2xl font-mono font-bold text-amber-800">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </p>
                </>
              )}
            </div>
          )}

          {isConfirmed && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 font-medium">
                Purchase confirmed! Thank you.
              </p>
            </div>
          )}

          {reservation.status === "RELEASED" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-600 font-medium">
                This reservation has been released.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isPending && !isExpired && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={acting}
              >
                {acting ? "Processing..." : "Confirm purchase"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={acting}
              >
                Cancel
              </Button>
            </div>
          )}

          {(reservation.status === "RELEASED" || isExpired) && (
            <Button onClick={() => router.push("/")}>Back to products</Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}