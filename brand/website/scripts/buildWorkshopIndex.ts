#!/usr/bin/env ts-node

import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'

const WORKSHOP_CONTENT_DIR = path.join(process.cwd(), 'workshop', 'content')
const WORKSHOP_INDEX_PATH = path.join(process.cwd(), 'workshop', 'index.json')

interface WorkshopIndexEntry {
  slug: string
  title: string
  status: string
  domain: string[]
  complexity: string
  impact: string
  updated_at: string
  safe_public: boolean
}

function buildWorkshopIndex() {
  console.log('📦 Building workshop index...\n')
  
  // Create workshop directory if it doesn't exist
  const workshopDir = path.dirname(WORKSHOP_INDEX_PATH)
  if (!fs.existsSync(workshopDir)) {
    fs.mkdirSync(workshopDir, { recursive: true })
  }
  
  // Check if content directory exists
  if (!fs.existsSync(WORKSHOP_CONTENT_DIR)) {
    console.log(`Workshop content directory not found at ${WORKSHOP_CONTENT_DIR}`)
    console.log('Creating empty index...')
    fs.writeFileSync(WORKSHOP_INDEX_PATH, JSON.stringify([], null, 2))
    return
  }
  
  // Get all MDX files
  const files = fs.readdirSync(WORKSHOP_CONTENT_DIR)
    .filter(file => file.endsWith('.mdx'))
  
  if (files.length === 0) {
    console.log('No workshop content files found')
    console.log('Creating empty index...')
    fs.writeFileSync(WORKSHOP_INDEX_PATH, JSON.stringify([], null, 2))
    return
  }
  
  // Extract frontmatter from each file
  const index: WorkshopIndexEntry[] = []
  
  files.forEach(file => {
    const filePath = path.join(WORKSHOP_CONTENT_DIR, file)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    
    try {
      const { data } = matter(fileContent)
      
      // Only include public projects in the index
      if (data.safe_public) {
        index.push({
          slug: data.slug,
          title: data.title,
          status: data.status,
          domain: data.domain,
          complexity: data.complexity,
          impact: data.impact,
          updated_at: data.updated_at,
          safe_public: data.safe_public
        })
        
        console.log(`  ✓ Added: ${data.title}`)
      } else {
        console.log(`  ⊗ Skipped (not public): ${data.title}`)
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${file}: ${error}`)
    }
  })
  
  // Sort by updated date (most recent first)
  index.sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
  
  // Write index file
  fs.writeFileSync(WORKSHOP_INDEX_PATH, JSON.stringify(index, null, 2))
  
  console.log(`\n✅ Workshop index built successfully!`)
  console.log(`   Total projects: ${files.length}`)
  console.log(`   Public projects: ${index.length}`)
  console.log(`   Index location: ${WORKSHOP_INDEX_PATH}\n`)
}

// Run the build
buildWorkshopIndex()