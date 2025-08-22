import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

interface ExcelItem {
  Room: string;
  Item: string;
  'Sell/Keep/Unsure': string;
  Price: number;
  'Invoice Ref': string;
  'Price (Designer Invoice)': number;
  Floor: string;
  Category: string;
  'Fixture (Exclude)?': string;
  Source: string;
  Notes: string;
  'Invoice Status': string;
}

interface PlantItem {
  Room: string;
  'Plant/Planter': string;
  Qty: number;
  'Unit Price': number;
  'Line Total': number;
  'Indoor/Outdoor': string;
  Category: string;
  Placement: string;
}

async function importExcelData() {
  try {
    console.log('📊 Starting Excel data import...');

    // Read the Excel file
    const filePath = path.join(process.cwd(), '../../5470_S_Highline_Circle/5470_furnishings_inventory.xlsx');
    const workbook = XLSX.readFile(filePath);

    // Import Rooms
    console.log('📍 Importing rooms...');
    const roomsSet = new Set<string>();
    const inventorySheet = workbook.Sheets['Inventory (All Items)'];
    const inventoryData: ExcelItem[] = XLSX.utils.sheet_to_json(inventorySheet);

    inventoryData.forEach(item => {
      if (item.Room) roomsSet.add(item.Room);
    });

    const roomMap = new Map<string, string>();
    for (const roomName of roomsSet) {
      const room = await prisma.room.upsert({
        where: { name: roomName },
        update: {},
        create: {
          name: roomName,
          floor: 1, // Default floor, can be updated based on Floor column
        }
      });
      roomMap.set(roomName, room.id);
      console.log(`  ✅ Room: ${roomName}`);
    }

    // Import Categories
    console.log('📂 Importing categories...');
    const categoriesSet = new Set<string>();
    inventoryData.forEach(item => {
      if (item.Category) categoriesSet.add(item.Category);
    });

    const categoryMap = new Map<string, string>();
    const categoryIcons: Record<string, string> = {
      'Furniture': 'Sofa',
      'Electronics': 'Monitor',
      'Art / Decor': 'Palette',
      'Lighting': 'Lightbulb',
      'Rug / Carpet': 'Square',
      'Plant (Indoor)': 'Flower',
      'Planter (Indoor)': 'TreePine',
      'Outdoor Planter/Plant': 'Trees',
      'Other': 'Package',
    };

    for (const categoryName of categoriesSet) {
      const category = await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: {
          name: categoryName,
          icon: categoryIcons[categoryName] || 'Package',
        }
      });
      categoryMap.set(categoryName, category.id);
      console.log(`  ✅ Category: ${categoryName}`);
    }

    // Import Items
    console.log('📦 Importing inventory items...');
    let itemCount = 0;

    for (const row of inventoryData) {
      if (!row.Room || !row.Item || !row.Category) continue;

      const status = row['Sell/Keep/Unsure']?.toLowerCase() as 'SELL' | 'KEEP' | 'UNSURE' | undefined;
      const validStatus = ['SELL', 'KEEP', 'UNSURE'].includes(status?.toUpperCase() || '')
        ? status?.toUpperCase() as 'SELL' | 'KEEP' | 'UNSURE'
        : 'UNSURE';

      const item = await prisma.item.create({
        data: {
          name: row.Item,
          roomId: roomMap.get(row.Room)!,
          categoryId: categoryMap.get(row.Category)!,
          status: validStatus,
          askingPrice: row.Price || null,
          designerInvoicePrice: row['Price (Designer Invoice)'] || null,
          isFixture: row['Fixture (Exclude)?'] === 'Y' || row['Fixture (Exclude)?'] === 'Yes',
          source: row.Source || null,
          notes: row.Notes || null,
        }
      });

      itemCount++;
      if (itemCount % 10 === 0) {
        console.log(`  📦 Imported ${itemCount} items...`);
      }
    }

    console.log(`✅ Imported ${itemCount} inventory items`);

    // Import Plants (Bloom & Flourish)
    console.log('🌱 Importing plants...');
    const plantsSheet = workbook.Sheets['Bloom & Flourish'];
    if (plantsSheet) {
      const plantsData: PlantItem[] = XLSX.utils.sheet_to_json(plantsSheet);
      let plantCount = 0;

      for (const row of plantsData) {
        if (!row['Plant/Planter']) continue;

        await prisma.plant.create({
          data: {
            name: row['Plant/Planter'],
            quantity: row.Qty || 1,
            unitPrice: row['Unit Price'] || 0,
            lineTotal: row['Line Total'] || 0,
            location: row['Indoor/Outdoor'] === 'Outdoor' ? 'OUTDOOR' : 'INDOOR',
            category: row.Category || null,
            placement: row.Placement || null,
            roomName: row.Room || null,
          }
        });

        plantCount++;
      }

      console.log(`✅ Imported ${plantCount} plants`);
    }

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@5470highline.com' },
      update: {},
      create: {
        email: 'admin@5470highline.com',
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: 'temporary', // Will be replaced with proper auth
      }
    });

    console.log('✅ Default admin user created');

    // Create sample buyers
    console.log('👥 Creating sample buyers...');
    const sampleBuyers = [
      { name: 'John Smith', email: 'john@example.com', phone: '555-0101' },
      { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0102' },
      { name: 'Real Estate Agent', email: 'agent@realty.com', phone: '555-0103' },
    ];

    for (const buyerData of sampleBuyers) {
      await prisma.buyer.create({
        data: buyerData
      });
    }

    console.log('✅ Sample buyers created');

    console.log('\n🎉 Excel data import completed successfully!');
    console.log(`
    Summary:
    - Rooms: ${roomsSet.size}
    - Categories: ${categoriesSet.size}
    - Items: ${itemCount}
    - Plants: ${plantsData?.length || 0}
    - Users: 1
    - Buyers: ${sampleBuyers.length}
    `);

  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importExcelData()
  .catch(console.error)
  .finally(() => process.exit());
