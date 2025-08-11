# Excel Migration Engine - Technical Architecture

## Overview

The Excel Migration Engine is Candlefish's core differentiator, enabling SMBs to transform their spreadsheet-based operations into modern AI-native applications in under 5 minutes.

## Architecture Principles

1. **Speed First**: 5-minute end-to-end transformation
2. **Intelligence**: Preserve business logic, not just data
3. **Reliability**: 80%+ automatic success rate target
4. **Flexibility**: Handle any Excel complexity
5. **Scalability**: Process files from 10 rows to 1M+ rows

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Input Layer                          │
│        Excel Upload | Google Sheets | CSV Import        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Analysis Pipeline                      │
│   File Parser → Schema Detector → Formula Analyzer      │
│   → Relationship Mapper → Business Logic Extractor      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Intelligence Layer                      │
│   Pattern Recognition | Domain Models | ML Inference    │
│     Validation Rules | Data Cleaning | Enrichment       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Transformation Engine                   │
│   Schema Generation | Database Creation | API Builder   │
│      UI Generation | Workflow Extraction | Testing      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Output Layer                          │
│   Live Application | API Endpoints | Admin Dashboard    │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. File Parser

```python
class ExcelParser:
    """Multi-format Excel parser with streaming support"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.workbook = None
        self.metadata = {}
        
    async def parse(self) -> ParsedWorkbook:
        """Parse Excel file with automatic format detection"""
        file_type = detect_file_type(self.file_path)
        
        if file_type == 'xlsx':
            return await self._parse_xlsx()
        elif file_type == 'xls':
            return await self._parse_legacy()
        elif file_type == 'xlsm':
            return await self._parse_with_macros()
        elif file_type == 'csv':
            return await self._parse_csv()
            
    async def _parse_xlsx(self) -> ParsedWorkbook:
        """Modern Excel format parser"""
        wb = openpyxl.load_workbook(
            self.file_path, 
            data_only=False,  # Preserve formulas
            keep_vba=True,    # Keep macros
            read_only=False   # Full access
        )
        
        return ParsedWorkbook(
            sheets=await self._extract_sheets(wb),
            formulas=await self._extract_formulas(wb),
            named_ranges=await self._extract_named_ranges(wb),
            charts=await self._extract_charts(wb),
            pivot_tables=await self._extract_pivots(wb),
            macros=await self._extract_vba(wb)
        )
```

### 2. Schema Inference Engine

```python
class SchemaInference:
    """Intelligent schema detection from Excel data"""
    
    def infer_schema(self, sheet_data: DataFrame) -> TableSchema:
        """Detect data types, relationships, and constraints"""
        
        schema = TableSchema()
        
        for column in sheet_data.columns:
            # Detect data type
            dtype = self._infer_data_type(sheet_data[column])
            
            # Detect constraints
            constraints = self._detect_constraints(sheet_data[column])
            
            # Detect relationships
            relationships = self._detect_relationships(column, sheet_data)
            
            # Detect patterns
            patterns = self._detect_patterns(sheet_data[column])
            
            schema.add_column(
                name=self._clean_column_name(column),
                type=dtype,
                constraints=constraints,
                relationships=relationships,
                patterns=patterns
            )
            
        return schema
    
    def _infer_data_type(self, series: Series) -> DataType:
        """Smart type detection with fallback"""
        
        # Sample non-null values
        sample = series.dropna().head(1000)
        
        # Try parsing as various types
        type_scores = {
            'integer': self._score_integer(sample),
            'decimal': self._score_decimal(sample),
            'date': self._score_date(sample),
            'boolean': self._score_boolean(sample),
            'email': self._score_email(sample),
            'phone': self._score_phone(sample),
            'currency': self._score_currency(sample),
            'percentage': self._score_percentage(sample),
            'text': 1.0  # Fallback
        }
        
        return max(type_scores, key=type_scores.get)
```

### 3. Formula Translator

```python
class FormulaTranslator:
    """Convert Excel formulas to application logic"""
    
    def translate_formula(self, excel_formula: str) -> BusinessRule:
        """Parse and translate Excel formula to code"""
        
        # Parse formula into AST
        ast = self._parse_formula(excel_formula)
        
        # Identify formula type
        formula_type = self._classify_formula(ast)
        
        if formula_type == 'calculation':
            return self._translate_calculation(ast)
        elif formula_type == 'lookup':
            return self._translate_lookup(ast)
        elif formula_type == 'conditional':
            return self._translate_conditional(ast)
        elif formula_type == 'aggregation':
            return self._translate_aggregation(ast)
        
    def _parse_formula(self, formula: str) -> FormulaAST:
        """Parse Excel formula into abstract syntax tree"""
        
        # Remove leading '='
        formula = formula.lstrip('=')
        
        # Tokenize
        tokens = self._tokenize(formula)
        
        # Build AST
        parser = FormulaParser(tokens)
        return parser.parse()
        
    def _translate_calculation(self, ast: FormulaAST) -> CalculationRule:
        """Translate calculation formula to code"""
        
        return CalculationRule(
            expression=self._ast_to_python(ast),
            dependencies=self._extract_dependencies(ast),
            validation=self._generate_validation(ast)
        )
```

### 4. Business Logic Extractor

```python
class BusinessLogicExtractor:
    """Extract business rules from Excel patterns"""
    
    def extract_logic(self, workbook: ParsedWorkbook) -> BusinessLogic:
        """Identify and extract business logic"""
        
        logic = BusinessLogic()
        
        # Extract calculation rules
        for formula in workbook.formulas:
            rule = self._extract_calculation_rule(formula)
            logic.add_rule(rule)
        
        # Extract validation rules
        for validation in workbook.data_validations:
            rule = self._extract_validation_rule(validation)
            logic.add_rule(rule)
        
        # Extract workflow patterns
        workflows = self._detect_workflows(workbook)
        for workflow in workflows:
            logic.add_workflow(workflow)
        
        # Extract conditional formatting as business rules
        for cf in workbook.conditional_formats:
            rule = self._extract_conditional_rule(cf)
            logic.add_rule(rule)
        
        return logic
    
    def _detect_workflows(self, workbook: ParsedWorkbook) -> List[Workflow]:
        """Detect workflow patterns in spreadsheet"""
        
        workflows = []
        
        # Detect approval workflows (status columns)
        approval_patterns = [
            'status', 'approved', 'state', 'stage'
        ]
        
        for sheet in workbook.sheets:
            for column in sheet.columns:
                if any(p in column.lower() for p in approval_patterns):
                    workflow = self._extract_approval_workflow(sheet, column)
                    workflows.append(workflow)
        
        # Detect calculation pipelines
        calc_chains = self._trace_calculation_chains(workbook)
        for chain in calc_chains:
            workflow = self._chain_to_workflow(chain)
            workflows.append(workflow)
        
        return workflows
```

### 5. Application Generator

```python
class ApplicationGenerator:
    """Generate complete application from analyzed Excel"""
    
    async def generate_application(
        self, 
        analysis: ExcelAnalysis,
        vertical: str
    ) -> GeneratedApp:
        """Create full application from Excel analysis"""
        
        # Generate database schema
        db_schema = await self._generate_database(analysis.schema)
        
        # Generate API endpoints
        api = await self._generate_api(analysis.schema, analysis.logic)
        
        # Generate UI components
        ui = await self._generate_ui(analysis.schema, vertical)
        
        # Generate workflows
        workflows = await self._generate_workflows(analysis.workflows)
        
        # Generate tests
        tests = await self._generate_tests(analysis)
        
        # Package application
        app = await self._package_application(
            database=db_schema,
            api=api,
            ui=ui,
            workflows=workflows,
            tests=tests
        )
        
        return app
    
    async def _generate_database(self, schema: TableSchema) -> Database:
        """Generate database with migrations"""
        
        # Create Prisma schema
        prisma_schema = self._schema_to_prisma(schema)
        
        # Generate migrations
        migrations = self._generate_migrations(schema)
        
        # Create indexes
        indexes = self._optimize_indexes(schema)
        
        return Database(
            schema=prisma_schema,
            migrations=migrations,
            indexes=indexes
        )
    
    async def _generate_api(
        self, 
        schema: TableSchema, 
        logic: BusinessLogic
    ) -> API:
        """Generate REST/GraphQL API"""
        
        # Generate GraphQL schema
        graphql_schema = self._generate_graphql_schema(schema)
        
        # Generate resolvers
        resolvers = self._generate_resolvers(schema, logic)
        
        # Generate REST endpoints
        rest_endpoints = self._generate_rest_endpoints(schema)
        
        # Generate validation middleware
        validators = self._generate_validators(logic)
        
        return API(
            graphql=graphql_schema,
            resolvers=resolvers,
            rest=rest_endpoints,
            validators=validators
        )
```

## Vertical-Specific Transformations

### Paintbox (Painting Contractors)

```python
class PaintboxTransformer(VerticalTransformer):
    """Specialized transformer for painting contractor Excel files"""
    
    def transform(self, excel_data: ExcelAnalysis) -> PaintboxApp:
        # Detect estimate sheets
        estimates = self._detect_estimate_sheets(excel_data)
        
        # Extract pricing formulas
        pricing = self._extract_pricing_logic(estimates)
        
        # Identify customer data
        customers = self._extract_customer_data(excel_data)
        
        # Build job tracking workflow
        jobs = self._build_job_workflow(excel_data)
        
        return PaintboxApp(
            estimates=estimates,
            pricing=pricing,
            customers=customers,
            jobs=jobs
        )
```

### Crown (Trophy/Awards)

```python
class CrownTransformer(VerticalTransformer):
    """Specialized transformer for trophy/awards Excel files"""
    
    def transform(self, excel_data: ExcelAnalysis) -> CrownApp:
        # Detect inventory sheets
        inventory = self._detect_inventory(excel_data)
        
        # Extract SKU/variant logic
        variants = self._extract_variant_logic(excel_data)
        
        # Identify pricing matrices
        pricing = self._extract_pricing_matrix(excel_data)
        
        # Build order workflow
        orders = self._build_order_workflow(excel_data)
        
        return CrownApp(
            inventory=inventory,
            variants=variants,
            pricing=pricing,
            orders=orders
        )
```

### PromoterOS (Venues)

```python
class PromoterOSTransformer(VerticalTransformer):
    """Specialized transformer for venue/promotion Excel files"""
    
    def transform(self, excel_data: ExcelAnalysis) -> PromoterOSApp:
        # Detect settlement sheets
        settlements = self._detect_settlements(excel_data)
        
        # Extract hold/offer logic
        holds = self._extract_hold_logic(excel_data)
        
        # Identify calendar data
        calendar = self._extract_calendar(excel_data)
        
        # Build booking workflow
        bookings = self._build_booking_workflow(excel_data)
        
        return PromoterOSApp(
            settlements=settlements,
            holds=holds,
            calendar=calendar,
            bookings=bookings
        )
```

### Brewkit (Breweries)

```python
class BrewkitTransformer(VerticalTransformer):
    """Specialized transformer for brewery Excel files"""
    
    def transform(self, excel_data: ExcelAnalysis) -> BrewkitApp:
        # Detect production planning sheets
        production = self._detect_production_sheets(excel_data)
        
        # Extract recipe/formula data
        recipes = self._extract_recipes(excel_data)
        
        # Identify inventory tracking
        inventory = self._extract_inventory(excel_data)
        
        # Build batch tracking workflow
        batches = self._build_batch_workflow(excel_data)
        
        return BrewkitApp(
            production=production,
            recipes=recipes,
            inventory=inventory,
            batches=batches
        )
```

## Performance Optimization

### Caching Strategy

```python
class MigrationCache:
    """Intelligent caching for migration performance"""
    
    def __init__(self):
        self.schema_cache = {}
        self.formula_cache = {}
        self.pattern_cache = {}
        
    async def get_or_compute(
        self, 
        key: str, 
        compute_func: Callable
    ) -> Any:
        """Cache computation results"""
        
        # Check memory cache
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        # Check Redis cache
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)
        
        # Compute and cache
        result = await compute_func()
        
        # Store in both caches
        self.memory_cache[key] = result
        await redis.set(key, json.dumps(result), ex=3600)
        
        return result
```

### Parallel Processing

```python
class ParallelProcessor:
    """Process large Excel files in parallel"""
    
    async def process_large_file(self, file_path: str) -> ExcelAnalysis:
        """Process file using parallel workers"""
        
        # Split file into chunks
        chunks = await self._split_file(file_path)
        
        # Process chunks in parallel
        tasks = []
        for chunk in chunks:
            task = asyncio.create_task(self._process_chunk(chunk))
            tasks.append(task)
        
        # Await all chunks
        results = await asyncio.gather(*tasks)
        
        # Merge results
        return self._merge_results(results)
```

## Quality Assurance

### Migration Scoring

```python
class MigrationScorer:
    """Score migration quality and completeness"""
    
    def score_migration(
        self, 
        original: ExcelFile, 
        generated: Application
    ) -> MigrationScore:
        """Calculate migration success score"""
        
        scores = {
            'data_completeness': self._score_data(original, generated),
            'formula_accuracy': self._score_formulas(original, generated),
            'workflow_preservation': self._score_workflows(original, generated),
            'validation_coverage': self._score_validation(original, generated),
            'performance': self._score_performance(generated)
        }
        
        overall = sum(scores.values()) / len(scores)
        
        return MigrationScore(
            overall=overall,
            components=scores,
            recommendations=self._generate_recommendations(scores)
        )
```

### Rollback Mechanism

```python
class MigrationRollback:
    """Safe rollback for failed migrations"""
    
    async def create_checkpoint(self, app_id: str) -> str:
        """Create rollback checkpoint"""
        
        checkpoint = {
            'timestamp': datetime.now(),
            'app_id': app_id,
            'database_snapshot': await self._snapshot_database(app_id),
            'config_backup': await self._backup_config(app_id),
            'version': await self._get_version(app_id)
        }
        
        checkpoint_id = str(uuid4())
        await self._store_checkpoint(checkpoint_id, checkpoint)
        
        return checkpoint_id
    
    async def rollback(self, checkpoint_id: str) -> bool:
        """Rollback to checkpoint"""
        
        checkpoint = await self._load_checkpoint(checkpoint_id)
        
        # Restore database
        await self._restore_database(checkpoint['database_snapshot'])
        
        # Restore configuration
        await self._restore_config(checkpoint['config_backup'])
        
        # Revert version
        await self._revert_version(checkpoint['version'])
        
        return True
```

## Security & Compliance

### Data Sanitization

```python
class DataSanitizer:
    """Sanitize sensitive data during migration"""
    
    def sanitize(self, data: DataFrame) -> DataFrame:
        """Remove or mask sensitive information"""
        
        # Detect PII columns
        pii_columns = self._detect_pii(data)
        
        # Mask sensitive data
        for column in pii_columns:
            data[column] = self._mask_column(data[column])
        
        # Remove security risks
        data = self._remove_formulas_with_external_refs(data)
        data = self._remove_macros_with_file_access(data)
        
        # Validate sanitization
        assert not self._contains_sensitive_data(data)
        
        return data
```

### Audit Trail

```python
class MigrationAudit:
    """Complete audit trail for migrations"""
    
    async def log_migration(self, migration: Migration) -> None:
        """Log migration for audit"""
        
        audit_entry = {
            'id': str(uuid4()),
            'timestamp': datetime.now(),
            'user': migration.user,
            'organization': migration.organization,
            'source_file': migration.source_file,
            'file_hash': self._hash_file(migration.source_file),
            'migration_result': migration.result,
            'duration': migration.duration,
            'ip_address': migration.ip_address,
            'vertical': migration.vertical
        }
        
        await self._store_audit(audit_entry)
        await self._notify_compliance(audit_entry)
```

## Monitoring & Analytics

### Performance Metrics

```python
MIGRATION_METRICS = {
    'migration_duration': Histogram(
        'migration_duration_seconds',
        'Time to complete migration',
        buckets=[1, 5, 10, 30, 60, 300]
    ),
    'migration_success_rate': Gauge(
        'migration_success_rate',
        'Percentage of successful migrations'
    ),
    'file_size_processed': Histogram(
        'file_size_bytes',
        'Size of files processed',
        buckets=[1e3, 1e4, 1e5, 1e6, 1e7, 1e8]
    ),
    'formula_complexity': Histogram(
        'formula_complexity_score',
        'Complexity of formulas translated',
        buckets=[1, 5, 10, 25, 50, 100]
    )
}
```

### Success Tracking

```sql
-- Migration success analytics
CREATE VIEW migration_analytics AS
SELECT 
    DATE(created_at) as migration_date,
    vertical,
    COUNT(*) as total_migrations,
    AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
    AVG(duration_seconds) as avg_duration,
    AVG(file_size_mb) as avg_file_size,
    AVG(rows_processed) as avg_rows,
    AVG(formulas_translated) as avg_formulas,
    AVG(score) as avg_quality_score
FROM migrations
GROUP BY DATE(created_at), vertical;
```

## Future Enhancements

### Phase 1: Advanced Pattern Recognition
- Machine learning for formula pattern detection
- Industry-specific template library
- Automated data quality improvement

### Phase 2: AI-Powered Enhancement
- GPT-4 for business logic interpretation
- Automatic UI/UX improvements
- Intelligent data enrichment

### Phase 3: Real-time Collaboration
- Live Excel sync during migration
- Multi-user migration sessions
- Change detection and incremental updates

## Patent Claims

### Core Innovation Areas

1. **Automatic Formula Translation**
   - Method for converting Excel formulas to executable code
   - System for preserving formula dependencies
   - Technique for formula optimization

2. **Business Logic Extraction**
   - Process for identifying workflows in spreadsheets
   - Method for extracting validation rules
   - System for detecting calculation patterns

3. **Intelligent Schema Inference**
   - Algorithm for detecting data relationships
   - Method for type inference from dirty data
   - System for constraint detection

4. **Rapid Application Generation**
   - Process for 5-minute Excel to app transformation
   - Method for automatic UI generation from data
   - System for workflow extraction and implementation

---

*Patent Pending - Candlefish.ai Proprietary Technology*
*Last Updated: August 2025*
