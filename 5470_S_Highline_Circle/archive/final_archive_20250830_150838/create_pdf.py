#!/usr/bin/env python3
"""
Create PDF from buyer sheet data
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Create PDF
pdf_file = "buyer_sheet_for_jon.pdf"
doc = SimpleDocTemplate(pdf_file, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)

# Container for the 'Flowable' objects
elements = []

# Define styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#1a1a1a'),
    spaceAfter=30,
    alignment=TA_CENTER
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=16,
    textColor=colors.HexColor('#2c3e50'),
    spaceAfter=12,
    spaceBefore=20,
    leftIndent=0
)

subheading_style = ParagraphStyle(
    'CustomSubHeading',
    parent=styles['Heading3'],
    fontSize=13,
    textColor=colors.HexColor('#34495e'),
    spaceAfter=8,
    spaceBefore=12,
    leftIndent=10
)

normal_style = ParagraphStyle(
    'CustomNormal',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.HexColor('#2c3e50'),
    leftIndent=20,
    spaceAfter=4
)

# Title
elements.append(Paragraph("5470 S Highline Circle", title_style))
elements.append(Paragraph("Furnishings & Installations", styles['Heading2']))
elements.append(Spacer(1, 20))
elements.append(Paragraph("<b>Total Value: $275,000</b>", styles['Heading2']))
elements.append(Spacer(1, 30))

# Main Level
elements.append(Paragraph("MAIN LEVEL", heading_style))

elements.append(Paragraph("Living Room", subheading_style))
living_items = [
    "• Custom Blue Velvet Sofas (2) - Holly Downs",
    "• Custom Area Rug (22'4\" × 15'2\") - Holly Downs",
    "• Red Chairs (2) - Holly Downs",
    "• Black Library Hutch with Mirrored Doors",
    "• Samsung 65\" Neo QLED 8K TV (2023)",
    "• Custom Green Velvet Chaise Lounge - Holly Downs",
    "• Coffee Table (Black) - Holly Downs",
    "• 2 Round Urns with Kentia Palms - Bloom & Flourish",
    "• Custom Pillows (7) - Holly Downs",
    "• Knoll Side Tables (2)"
]
for item in living_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Dining Room", subheading_style))
dining_items = [
    "• Custom Grey Oak Dining Table - Holly Downs",
    "• Dining Chairs (6, cane back) - Holly Downs",
    "• Red Buffet Cabinet - Holly Downs",
    "• Circular Art Mirror - Restoration Hardware"
]
for item in dining_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Entry", subheading_style))
entry_items = [
    "• Custom Carpet for Front Stairs (Grey Chevron) - Holly Downs",
    "• Ming Aralia Tree in Planter - Bloom & Flourish",
    "• Lady Palm in Planter - Bloom & Flourish"
]
for item in entry_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Kitchen", subheading_style))
elements.append(Paragraph("• Ficus Tree in Large Planter - Bloom & Flourish", normal_style))

elements.append(Paragraph("Hearth Room", subheading_style))
elements.append(Paragraph("• RH Maxwell U-Chaise Sectional (Performance Velvet, Graphite)", normal_style))

elements.append(Paragraph("Bar Area", subheading_style))
elements.append(Paragraph("• Green Bar Stools (6) - Holly Downs", normal_style))

elements.append(Paragraph("Main Level Hallway", subheading_style))
elements.append(Paragraph("• 3 Navy Blue Planters with Plants - Bloom & Flourish", normal_style))

# Lower Level
elements.append(Spacer(1, 20))
elements.append(Paragraph("LOWER LEVEL", heading_style))

elements.append(Paragraph("Rec Room", subheading_style))
rec_items = [
    "• Malibu Pool Table with Ping Pong Top",
    "• Lovesac Sactionals Modular Sofa",
    "• FLOR Carpet Tiles"
]
for item in rec_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Exercise Room", subheading_style))
exercise_items = [
    "• Tonal System",
    "• Ethan Allen King Bed Frame",
    "• King Mattress",
    "• Ethan Allen Dressers (2)"
]
for item in exercise_items:
    elements.append(Paragraph(item, normal_style))

# Add page break before Upper Level
elements.append(PageBreak())

# Upper Level
elements.append(Paragraph("UPPER LEVEL", heading_style))

elements.append(Paragraph("Primary Bedroom", subheading_style))
primary_items = [
    "• Samsung 65\" Neo QLED 8K TV (2023)",
    "• Upholstered Lounge Chairs (Pair)",
    "• Fiddle Leaf Fig in Terra Cotta Planter - Bloom & Flourish"
]
for item in primary_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Primary Bedroom Entry", subheading_style))
elements.append(Paragraph("• Blue Console - Holly Downs", normal_style))

elements.append(Paragraph("Primary Bath", subheading_style))
elements.append(Paragraph("• Corn Plant (Dracaena) in Decorative Pot - Bloom & Flourish", normal_style))

elements.append(Paragraph("Upstairs Office", subheading_style))
office_items = [
    "• Barcelona Daybed - Design Within Reach/Knoll",
    "• Eames Lounge Chair + Ottoman - Design Within Reach",
    "• Samsung 65\" Neo QLED 8K TV (2023)",
    "• DWR Swivel Lounge Chairs (Pair)",
    "• Nelson Platform Bench - Design Within Reach",
    "• Metallic Cube Side Tables (2)",
    "• Tri Arm Floor Lamp - Design Within Reach",
    "• DWR Round Café Table",
    "• Snake Plant & Chinese Evergreen - Bloom & Flourish"
]
for item in office_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Upper Bedroom A", subheading_style))
bedroom_a_items = [
    "• Custom Floating Wood Shelves with Hanging Rod",
    "• Queen Bed Frame and Mattress",
    "• Samsung 55\" TV",
    "• Area Rug"
]
for item in bedroom_a_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Upper Bedroom B", subheading_style))
bedroom_b_items = [
    "• Oak Bed Frame and Queen Mattress",
    "• 2 Corn Plants with Pots - Bloom & Flourish",
    "• Samsung 55\" TV",
    "• 2 Area Rugs",
    "• 2 Bedside Tables",
    "• Desk",
    "• Lounge Chair",
    "• Wall-Mounted Shelves"
]
for item in bedroom_b_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Upper Terrace", subheading_style))
terrace_items = [
    "• Samsung 75\" The Terrace Outdoor TV",
    "• Arhaus Outdoor Dining Set (Table, 2 Benches, 2 Armchairs)",
    "• Outdoor Planters (Pair) - Bronze Metallic"
]
for item in terrace_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Additional Upper Level", subheading_style))
additional_items = [
    "• Blue Runner (Hallway) - Holly Downs",
    "• Vestaboard Smart Display (East Staircase)"
]
for item in additional_items:
    elements.append(Paragraph(item, normal_style))

# Outdoor
elements.append(Spacer(1, 20))
elements.append(Paragraph("OUTDOOR AREAS", heading_style))

elements.append(Paragraph("Outdoor Nook Patio", subheading_style))
outdoor_items = [
    "• Wicker Chaise Lounges (2) with Red Umbrella",
    "• Black Metal Bistro Set (Table + 4 Chairs) with Red Umbrella",
    "• White Adirondack Chairs (2) with Side Table"
]
for item in outdoor_items:
    elements.append(Paragraph(item, normal_style))

# Plants & Landscaping
elements.append(Spacer(1, 20))
elements.append(Paragraph("PLANTS & LANDSCAPING", heading_style))

elements.append(Paragraph("B Gardening Professional Installations", subheading_style))
gardening_items = [
    "• Permanent Faux Boxwood Installations",
    "• Container Collection - 13 Main Planters",
    "• Window Box Planters",
    "• Fireplace Area Planters",
    "• Irrigation System for Planters",
    "• Annual Plant Rotations (current)"
]
for item in gardening_items:
    elements.append(Paragraph(item, normal_style))

elements.append(Paragraph("Bloom & Flourish Interior/Exterior Plants", subheading_style))
bloom_items = [
    "• Complete plant installation throughout property",
    "• All interior plants in decorative containers",
    "• Maintenance and seasonal rotations included through closing"
]
for item in bloom_items:
    elements.append(Paragraph(item, normal_style))

# Footer
elements.append(Spacer(1, 30))
elements.append(Paragraph("<i>All items in excellent condition. Professional installation and design by Holly Downs Design, Bloom & Flourish, and B Gardening.</i>", styles['Italic']))

# Build PDF
doc.build(elements)
print(f"PDF created successfully: {pdf_file}")