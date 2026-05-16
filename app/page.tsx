"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProducts, createReservation } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stock = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  availableUnits: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  stock: Stock[];
};

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    setError(null);
    try {
      const reservation = await createReservation({
        productId,
        warehouseId,
        quantity: 1,
      });
      router.push(`/reservation/${reservation.id}`);
    } catch (err: any) {
      if (err.status === 409) {
        setError("Sorry, this item just went out of stock.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setReserving(null);
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Loading products...</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Allo Store</h1>
      <p className="text-muted-foreground mb-8">
        Items are reserved for 10 minutes at checkout.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="flex flex-row gap-4 items-start">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div>
                <CardTitle>{product.name}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {product.description}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {product.stock.map((s) => (
                  <div
                    key={s.warehouseId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{s.warehouseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.warehouseLocation}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          s.availableUnits === 0
                            ? "destructive"
                            : s.availableUnits <= 3
                            ? "secondary"
                            : "default"
                        }
                      >
                        {s.availableUnits === 0
                          ? "Out of stock"
                          : `${s.availableUnits} left`}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={
                          s.availableUnits === 0 ||
                          reserving === `${product.id}-${s.warehouseId}`
                        }
                        onClick={() =>
                          handleReserve(product.id, s.warehouseId)
                        }
                      >
                        {reserving === `${product.id}-${s.warehouseId}`
                          ? "Reserving..."
                          : "Reserve"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}