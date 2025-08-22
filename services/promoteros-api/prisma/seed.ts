import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Candlefish Venue Ops',
      slug: 'candlefish-venues',
    },
  });
  console.log('✅ Created organization:', org.name);

  // Create demo venue
  const venue = await prisma.venue.create({
    data: {
      organizationId: org.id,
      name: 'Harbor Room',
      slug: 'harbor-room',
      timezone: 'America/Denver',
      address: '1234 Music Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      capacity: 2500,
    },
  });
  console.log('✅ Created venue:', venue.name);

  // Create demo users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@candlefish.ai',
      name: 'Admin User',
      emailVerified: new Date(),
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@candlefish.ai',
      name: 'Venue Manager',
      emailVerified: new Date(),
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@candlefish.ai',
      name: 'Event Staff',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Created users');

  // Create memberships
  await prisma.membership.createMany({
    data: [
      {
        userId: adminUser.id,
        organizationId: org.id,
        role: 'OWNER',
      },
      {
        userId: managerUser.id,
        organizationId: org.id,
        role: 'MANAGER',
      },
      {
        userId: staffUser.id,
        organizationId: org.id,
        role: 'STAFF',
      },
    ],
  });
  console.log('✅ Created memberships');

  // Create task templates
  const taskTemplates = await prisma.taskTemplate.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'Confirm artist contract',
        description: 'Ensure contract is signed and returned',
        defaultDueDays: 30,
        order: 1,
      },
      {
        organizationId: org.id,
        title: 'Submit tech rider',
        description: 'Get technical requirements from artist',
        defaultDueDays: 21,
        order: 2,
      },
      {
        organizationId: org.id,
        title: 'Book security staff',
        description: 'Confirm security team for event',
        defaultDueDays: 14,
        order: 3,
      },
      {
        organizationId: org.id,
        title: 'Order bar inventory',
        description: 'Ensure adequate bar stock',
        defaultDueDays: 7,
        order: 4,
      },
      {
        organizationId: org.id,
        title: 'Sound check schedule',
        description: 'Coordinate sound check times',
        defaultDueDays: 1,
        order: 5,
      },
    ],
  });
  console.log('✅ Created task templates');

  // Create sample event requests
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const twoMonths = new Date(now.getFullYear(), now.getMonth() + 2, 20);

  const request1 = await prisma.eventRequest.create({
    data: {
      organizationId: org.id,
      venueId: venue.id,
      requesterName: 'John Promoter',
      requesterEmail: 'john@musicpromotions.com',
      requesterPhone: '555-0100',
      requesterCompany: 'Music Promotions LLC',
      artistName: 'The Electric Dreams',
      title: 'Electric Dreams Summer Tour',
      description: 'Indie rock band on their summer tour',
      dateStart: nextMonth,
      dateEnd: nextMonth,
      expectedAttendance: 1800,
      budgetMin: 15000,
      budgetMax: 25000,
      splitNotes: '80/20 after expenses',
      techNeeds: 'Full PA, lighting rig, 2 engineers',
      status: 'APPROVED',
    },
  });

  const request2 = await prisma.eventRequest.create({
    data: {
      organizationId: org.id,
      venueId: venue.id,
      requesterName: 'Sarah Events',
      requesterEmail: 'sarah@concertco.com',
      requesterPhone: '555-0200',
      requesterCompany: 'Concert Co',
      artistName: 'Jazz Collective',
      title: 'Late Night Jazz Sessions',
      description: 'Monthly jazz showcase',
      dateStart: twoMonths,
      dateEnd: twoMonths,
      expectedAttendance: 800,
      budgetMin: 5000,
      budgetMax: 8000,
      splitNotes: 'Flat fee plus bar percentage',
      techNeeds: 'House PA, minimal lighting',
      status: 'REVIEW',
    },
  });
  console.log('✅ Created event requests');

  // Create an approved event from request1
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      venueId: venue.id,
      eventRequestId: request1.id,
      title: request1.title,
      description: request1.description,
      date: nextMonth,
      doorsAt: new Date(nextMonth.setHours(19, 0, 0, 0)),
      showAt: new Date(nextMonth.setHours(20, 0, 0, 0)),
      endAt: new Date(nextMonth.setHours(23, 0, 0, 0)),
      status: 'CONFIRMED',
    },
  });

  // Create tasks for the event
  await prisma.eventTask.createMany({
    data: [
      {
        eventId: event.id,
        title: 'Confirm artist contract',
        assigneeUserId: managerUser.id,
        dueAt: new Date(nextMonth.getTime() - 30 * 24 * 60 * 60 * 1000),
        order: 1,
        done: true,
        completedAt: new Date(),
      },
      {
        eventId: event.id,
        title: 'Submit tech rider',
        assigneeUserId: staffUser.id,
        dueAt: new Date(nextMonth.getTime() - 21 * 24 * 60 * 60 * 1000),
        order: 2,
        done: true,
        completedAt: new Date(),
      },
      {
        eventId: event.id,
        title: 'Book security staff',
        assigneeUserId: managerUser.id,
        dueAt: new Date(nextMonth.getTime() - 14 * 24 * 60 * 60 * 1000),
        order: 3,
        done: false,
      },
      {
        eventId: event.id,
        title: 'Order bar inventory',
        dueAt: new Date(nextMonth.getTime() - 7 * 24 * 60 * 60 * 1000),
        order: 4,
        done: false,
      },
    ],
  });
  console.log('✅ Created event and tasks');

  // Create deal terms
  await prisma.dealTerm.create({
    data: {
      eventId: event.id,
      type: 'SPLIT',
      splitPercent: 80,
      notes: '80/20 split after venue expenses',
    },
  });

  // Create decision logs
  await prisma.decisionLog.createMany({
    data: [
      {
        eventRequestId: request1.id,
        userId: managerUser.id,
        action: 'REVIEWED',
        note: 'Good fit for venue, strong local following',
      },
      {
        eventRequestId: request1.id,
        userId: adminUser.id,
        action: 'APPROVED',
        note: 'Approved with standard terms',
      },
      {
        eventRequestId: request2.id,
        userId: managerUser.id,
        action: 'REVIEWED',
        note: 'Checking availability for requested date',
      },
    ],
  });
  console.log('✅ Created decision logs');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: org.id,
        actorUserId: adminUser.id,
        action: 'CREATE',
        entityType: 'Organization',
        entityId: org.id,
        meta: { name: org.name },
      },
      {
        organizationId: org.id,
        actorUserId: adminUser.id,
        action: 'CREATE',
        entityType: 'Venue',
        entityId: venue.id,
        meta: { name: venue.name },
      },
      {
        organizationId: org.id,
        actorUserId: adminUser.id,
        action: 'APPROVE',
        entityType: 'EventRequest',
        entityId: request1.id,
        meta: { title: request1.title },
      },
    ],
  });
  console.log('✅ Created audit logs');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
