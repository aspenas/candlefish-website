#!/usr/bin/env ts-node

import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'
import matter from 'gray-matter'

// Define the frontmatter schema
const ProjectStatusSchema = z.enum(['IDEATION', 'ACTIVE', 'CALIBRATING', 'OPERATIONAL', 'PAUSED'])
const ComplexitySchema = z.enum(['L', 'M', 'H'])
const ImpactSchema = z.enum(['Low', 'Medium', 'High'])

const ArchitectureNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(['source', 'service', 'database', 'ui', 'machine', 'integration']),
  label: z.string()
})

const ArchitectureLinkSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional()
})

const ChangelogEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  entry: z.string().min(1)
})

const MilestoneSchema = z.object({
  name: z.string().min(1),
  eta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ETA must be in YYYY-MM-DD format')
})

const WorkshopProjectSchema = z.object({
  // Required fields
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  status: ProjectStatusSchema,
  domain: z.array(z.string()).min(1),
  complexity: ComplexitySchema,
  impact: ImpactSchema,
  owner: z.string().min(1),
  safe_public: z.boolean(),
  client_name_masked: z.string().min(1),
  updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  // Data fields
  metrics: z.record(z.union([z.string(), z.number()])),
  stack: z.array(z.string()),
  links: z.object({
    repo: z.string().optional(),
    design: z.string().optional(),
    doc: z.string().optional()
  }),
  architecture: z.object({
    nodes: z.array(ArchitectureNodeSchema),
    links: z.array(ArchitectureLinkSchema)
  }),
  changelog: z.array(ChangelogEntrySchema),
  
  // Optional fields
  next_milestone: MilestoneSchema.optional()
})

const WORKSHOP_CONTENT_DIR = path.join(process.cwd(), 'workshop', 'content')

interface ValidationError {
  file: string
  field: string
  message: string
}

function validateWorkshopContent(): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  
  // Check if content directory exists
  if (!fs.existsSync(WORKSHOP_CONTENT_DIR)) {
    console.log(`Creating workshop content directory at ${WORKSHOP_CONTENT_DIR}`)
    fs.mkdirSync(WORKSHOP_CONTENT_DIR, { recursive: true })
    return { valid: true, errors: [] }
  }
  
  // Get all MDX files
  const files = fs.readdirSync(WORKSHOP_CONTENT_DIR)
    .filter(file => file.endsWith('.mdx'))
  
  if (files.length === 0) {
    console.log('No workshop content files found')
    return { valid: true, errors: [] }
  }
  
  // Validate each file
  files.forEach(file => {
    const filePath = path.join(WORKSHOP_CONTENT_DIR, file)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    
    try {
      const { data } = matter(fileContent)
      
      // Validate frontmatter against schema
      const result = WorkshopProjectSchema.safeParse(data)
      
      if (!result.success) {
        result.error.errors.forEach(error => {
          errors.push({
            file,
            field: error.path.join('.'),
            message: error.message
          })
        })
      }
      
      // Additional validation rules
      
      // Check slug matches filename
      const expectedSlug = file.replace('.mdx', '')
      if (data.slug !== expectedSlug) {
        errors.push({
          file,
          field: 'slug',
          message: `Slug "${data.slug}" doesn't match filename "${expectedSlug}"`
        })
      }
      
      // Check architecture node references
      if (data.architecture) {
        const nodeIds = new Set(data.architecture.nodes.map((n: any) => n.id))
        
        data.architecture.links.forEach((link: any) => {
          if (!nodeIds.has(link.source)) {
            errors.push({
              file,
              field: 'architecture.links',
              message: `Link source "${link.source}" not found in nodes`
            })
          }
          if (!nodeIds.has(link.target)) {
            errors.push({
              file,
              field: 'architecture.links',
              message: `Link target "${link.target}" not found in nodes`
            })
          }
        })
      }
      
      // Check dates are not in the future
      const today = new Date().toISOString().split('T')[0]
      if (data.updated_at > today) {
        errors.push({
          file,
          field: 'updated_at',
          message: `Updated date ${data.updated_at} is in the future`
        })
      }
      
      if (data.changelog) {
        data.changelog.forEach((entry: any, index: number) => {
          if (entry.date > today) {
            errors.push({
              file,
              field: `changelog[${index}].date`,
              message: `Changelog date ${entry.date} is in the future`
            })
          }
        })
      }
      
    } catch (error) {
      errors.push({
        file,
        field: 'general',
        message: `Failed to parse file: ${error}`
      })
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Run validation
console.log('🔍 Validating workshop content...\n')

const { valid, errors } = validateWorkshopContent()

if (valid) {
  console.log('✅ All workshop content is valid!\n')
  process.exit(0)
} else {
  console.error('❌ Validation errors found:\n')
  
  errors.forEach(error => {
    console.error(`  ${error.file}:`)
    console.error(`    Field: ${error.field}`)
    console.error(`    Error: ${error.message}\n`)
  })
  
  console.error(`Total errors: ${errors.length}\n`)
  process.exit(1)
}