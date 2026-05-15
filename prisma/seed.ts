import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    
  console.log("Seeding database...");

  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
  });

  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, NCR" },
  });

  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Hub", location: "Bangalore, Karnataka" },
  });

  console.log("✔ Warehouses created");

  // Create products
  const shoe = await prisma.product.create({
    data: {
      name: "Nike Air Max 90",
      description: "Classic sneaker with Air cushioning",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    },
  });

  const tshirt = await prisma.product.create({
    data: {
      name: "Oversized Cotton Tee",
      description: "100% cotton, dropped shoulders",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    },
  });

  const watch = await prisma.product.create({
    data: {
      name: "Casio G-Shock GA-2100",
      description: "Carbon core guard structure",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    },
  });

  console.log("✔ Products created");

  // Create stock — each product in each warehouse
  await prisma.stock.createMany({
    data: [
      // Nike Air Max
      { productId: shoe.id, warehouseId: mumbai.id, totalUnits: 10 },
      { productId: shoe.id, warehouseId: delhi.id, totalUnits: 5 },
      { productId: shoe.id, warehouseId: bangalore.id, totalUnits: 1 }, // only 1 unit — good for testing race condition

      // Oversized Tee
      { productId: tshirt.id, warehouseId: mumbai.id, totalUnits: 50 },
      { productId: tshirt.id, warehouseId: delhi.id, totalUnits: 20 },
      { productId: tshirt.id, warehouseId: bangalore.id, totalUnits: 8 },

      // G-Shock
      { productId: watch.id, warehouseId: mumbai.id, totalUnits: 3 },
      { productId: watch.id, warehouseId: delhi.id, totalUnits: 0 }, // out of stock — good for testing 409
      { productId: watch.id, warehouseId: bangalore.id, totalUnits: 7 },
    ],
  });

  console.log("✔ Stock created");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });