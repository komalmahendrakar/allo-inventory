import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const expired = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0 });
    }

    await prisma.$transaction(
      expired.map((r) =>
        prisma.stock.update({
          where: {
            productId_warehouseId: {
              productId: r.productId,
              warehouseId: r.warehouseId,
            },
          },
          data: { reservedUnits: { decrement: r.quantity } },
        })
      )
    );

    await prisma.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: "RELEASED" },
    });

    console.log(`Cron: released ${expired.length} expired reservations`);

    return NextResponse.json({ released: expired.length });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Failed to release expired reservations" },
      { status: 500 }
    );
  }
}
