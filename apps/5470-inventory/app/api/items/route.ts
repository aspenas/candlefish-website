import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const room = searchParams.get('room');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (room && room !== 'all') {
      where.room = { name: room };
    }

    if (category && category !== 'all') {
      where.category = { name: category };
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        room: true,
        category: true,
        photos: true,
        buyerSelections: {
          include: {
            buyer: true,
          }
        },
        invoices: {
          include: {
            invoice: true,
          }
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const item = await prisma.item.create({
      data: {
        name: body.name,
        description: body.description,
        roomId: body.roomId,
        categoryId: body.categoryId,
        status: body.status || 'UNSURE',
        askingPrice: body.askingPrice,
        designerInvoicePrice: body.designerInvoicePrice,
        originalPrice: body.originalPrice,
        currentValue: body.currentValue,
        quantity: body.quantity || 1,
        isFixture: body.isFixture || false,
        source: body.source,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        condition: body.condition || 'GOOD',
        notes: body.notes,
      },
      include: {
        room: true,
        category: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
