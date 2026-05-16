

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
  try {
    const idempotencyKey = req.headers.get("idempotency-key");

    if (idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({                
        where: { key: idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(existing.response, { status: 200 });
      }
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Reservation is already ${reservation.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    if (new Date() > reservation.expiresAt) {
      await prisma.$transaction([
        prisma.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: { reservedUnits: { decrement: reservation.quantity } },
        }),
        prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: "RELEASED" },
        }),
      ]);

      return NextResponse.json(
        { error: "Reservation has expired" },
        { status: 410 }
      );
    }

    const [, confirmed] = await prisma.$transaction([
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      }),
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      }),
    ]);

    const response = { id: confirmed.id, status: confirmed.status };

    if (idempotencyKey) {
      await prisma.idempotencyKey.create({
        data: { key: idempotencyKey, response },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
