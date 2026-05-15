import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/schemas";

const RESERVATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;
    const idempotencyKey = req.headers.get("idempotency-key");

    // Idempotency check — return cached response if key was seen before
    if (idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(existing.response, { status: 200 });
      }
    }

    const updated = await prisma.$executeRaw`
      UPDATE "Stock"
      SET "reservedUnits" = "reservedUnits" + ${quantity}
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `;

    if (updated === 0) {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      );
    }

    const reservation = await prisma.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: "PENDING",
        expiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    const response = {
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };

    if (idempotencyKey) {
      await prisma.idempotencyKey.create({
        data: { key: idempotencyKey, response },
      });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Reserve error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
