import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id:id },
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

    return NextResponse.json({ id: reservation.id, status: "RELEASED" });
  } catch (error) {
    console.error("Release error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}