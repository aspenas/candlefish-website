import ical from 'ical-generator';

const calendar = ical({
  domain: 'candlefish.ai',
  method: 'REQUEST',
  prodId: {
    company: 'Candlefish.ai',
    product: 'Meeting Scheduler'
  },
  name: 'Candlefish Meeting'
});

const event = calendar.createEvent({
  uid: '12345@candlefish.ai',
  start: new Date('2025-08-29T15:00:00-06:00'),
  end: new Date('2025-08-29T16:00:00-06:00'),
  summary: 'Test Meeting',
  organizer: 'Patrick Smith <patrick@candlefish.ai>',
  attendees: [{
    email: 'test@example.com',
    rsvp: true
  }]
});

const icsContent = calendar.toString();
console.log("Generated ICS Content:");
console.log(icsContent);

// Check for ORGANIZER field
if (icsContent.includes('ORGANIZER')) {
  console.log("\n✅ ORGANIZER field present");
} else {
  console.log("\n❌ ORGANIZER field missing");
}
