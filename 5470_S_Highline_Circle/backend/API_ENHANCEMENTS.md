# Backend API Enhancements

## Enhanced GetItems and FilterItems Endpoints

### New Sorting Support

Both `/api/items` and `/api/filter-items` endpoints now support:

**Query Parameters:**
- `sort_by`: Column to sort by (default: "name")
  - Valid options: `name`, `category`, `room`, `price`, `purchase_date`, `decision`, `created_at`
- `sort_order`: Sort direction (default: "asc")
  - Valid options: `asc`, `desc`

**Example API Calls:**
```
GET /api/items?sort_by=price&sort_order=desc
GET /api/items?sort_by=purchase_date&sort_order=asc
GET /api/filter-items?categories=Furniture&sort_by=room&sort_order=asc
```

### New Filter Support

Both endpoints now support additional filters:

**Date Range Filtering:**
- `date_from`: Filter items purchased from this date (YYYY-MM-DD format)
- `date_to`: Filter items purchased up to this date (YYYY-MM-DD format)

**Image Filtering:**
- `has_images`: Filter by image presence
  - `true`: Only items with images
  - `false`: Only items without images

**Source Filtering:**
- `sources`: Comma-separated list of sources to filter by
  - Example: `Invoice,Visual,Estimate`

**Example API Calls:**
```
GET /api/items?date_from=2024-01-01&date_to=2024-12-31
GET /api/items?has_images=true&sources=Invoice,Visual
GET /api/filter-items?date_from=2024-06-01&has_images=true&sort_by=price&sort_order=desc
```

### Enhanced Response Format

Both endpoints now return additional fields:
- `purchase_date`: Item purchase date (YYYY-MM-DD format, if available)
- `created_at`: Item creation timestamp (ISO 8601 format)
- `has_images`: Boolean indicating if item has associated images
- `image_count`: Number of associated images

### Performance Optimizations

- **Server-side filtering**: All filtering is performed at the database level
- **SQL injection protection**: All user inputs are properly parameterized
- **Efficient sorting**: Proper ORDER BY clauses with secondary sorting for consistency
- **Image count optimization**: Single query with subquery for image counting

### Implementation Details

**SQL Security:**
- All user inputs are validated and escaped
- Parameterized queries prevent SQL injection
- Sort column validation against allowlist

**Error Handling:**
- Invalid sort columns default to "name"
- Invalid sort orders default to "asc"
- Malformed filter values are safely ignored

**Database Performance:**
- Leverages existing indexes on category, decision, room_id
- Single query with JOINs instead of multiple queries
- Image count calculated via efficient subquery

### Backward Compatibility

All existing API functionality remains unchanged. New parameters are optional with sensible defaults.

## Testing the Implementation

The enhanced API supports complex queries like:

```
GET /api/items?sort_by=price&sort_order=desc&has_images=true&sources=Invoice&date_from=2024-01-01
```

This would return:
- Items with images
- From "Invoice" source only  
- Purchased since January 1, 2024
- Sorted by price (highest first)
- Including image count and purchase date fields
