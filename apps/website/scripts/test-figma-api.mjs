#!/usr/bin/env node

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || 'FIGMA_TOKEN_PLACEHOLDER';
const FIGMA_BASE_URL = 'https://api.figma.com/v1';

// Extract file ID from the Figma share URL
const FIGMA_URL = 'https://loader-access-45739891.figma.site/';
// For testing, we'll try to find files in the Candlefish organization or use a public file

async function fetchFigmaData() {
  try {
    console.log('🎨 Testing Figma API connection...\n');

    // First, let's try to get user information to verify the token works
    const userResponse = await fetch(`${FIGMA_BASE_URL}/me`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (!userResponse.ok) {
      throw new Error(`User API failed: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    console.log('✅ Figma API connection successful');
    console.log('👤 User:', userData.email || 'Unknown');
    console.log('🏢 Organization:', userData.team_name || 'Personal');

    // Try to get team files
    console.log('\n🔍 Searching for team files...');
    const teamsResponse = await fetch(`${FIGMA_BASE_URL}/teams`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (teamsResponse.ok) {
      const teamsData = await teamsResponse.json();
      console.log('📁 Available teams:', teamsData.teams?.length || 0);

      if (teamsData.teams && teamsData.teams.length > 0) {
        for (const team of teamsData.teams.slice(0, 3)) { // Check first 3 teams
          console.log(`\n🏢 Team: ${team.name}`);

          // Get projects for this team
          const projectsResponse = await fetch(`${FIGMA_BASE_URL}/teams/${team.id}/projects`, {
            headers: {
              'X-Figma-Token': FIGMA_TOKEN
            }
          });

          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            console.log(`📂 Projects: ${projectsData.projects?.length || 0}`);

            if (projectsData.projects && projectsData.projects.length > 0) {
              for (const project of projectsData.projects.slice(0, 2)) { // Check first 2 projects
                console.log(`  📁 ${project.name}`);

                // Get files for this project
                const filesResponse = await fetch(`${FIGMA_BASE_URL}/projects/${project.id}/files`, {
                  headers: {
                    'X-Figma-Token': FIGMA_TOKEN
                  }
                });

                if (filesResponse.ok) {
                  const filesData = await filesResponse.json();
                  console.log(`    📄 Files: ${filesData.files?.length || 0}`);

                  if (filesData.files && filesData.files.length > 0) {
                    for (const file of filesData.files.slice(0, 3)) { // Check first 3 files
                      console.log(`      📄 ${file.name} (${file.key})`);

                      // If this looks like a template or design system, analyze it
                      if (file.name.toLowerCase().includes('template') ||
                          file.name.toLowerCase().includes('design') ||
                          file.name.toLowerCase().includes('system') ||
                          file.name.toLowerCase().includes('candlefish')) {

                        console.log(`\n🎯 Analyzing file: ${file.name}`);
                        await analyzeFigmaFile(file.key);
                        return; // Stop after analyzing first relevant file
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // If we couldn't find a specific file, let's try a known public Figma file for testing
    console.log('\n⚠️ No specific template found, analyzing API capabilities...');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function analyzeFigmaFile(fileKey) {
  try {
    console.log(`\n🔍 Analyzing Figma file: ${fileKey}`);

    // Get file data
    const fileResponse = await fetch(`${FIGMA_BASE_URL}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (!fileResponse.ok) {
      throw new Error(`File API failed: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.json();
    console.log(`📄 File name: ${fileData.name}`);
    console.log(`📅 Last modified: ${new Date(fileData.lastModified)}`);
    console.log(`🎨 Pages: ${fileData.document?.children?.length || 0}`);

    // Analyze document structure
    if (fileData.document?.children) {
      console.log('\n📋 Page analysis:');
      for (const page of fileData.document.children) {
        console.log(`  📑 ${page.name} (${page.children?.length || 0} elements)`);

        // Analyze top-level elements
        if (page.children) {
          const frames = page.children.filter(child => child.type === 'FRAME');
          const components = page.children.filter(child => child.type === 'COMPONENT');
          const instances = page.children.filter(child => child.type === 'INSTANCE');

          console.log(`    🖼️  Frames: ${frames.length}`);
          console.log(`    🧩 Components: ${components.length}`);
          console.log(`    📎 Instances: ${instances.length}`);

          // Extract color information
          extractColors(page.children);

          // Extract typography information
          extractTypography(page.children);

          // Extract layout patterns
          extractLayoutPatterns(page.children);
        }
      }
    }

    // Get styles if available
    console.log('\n🎨 Extracting styles...');
    const stylesResponse = await fetch(`${FIGMA_BASE_URL}/files/${fileKey}/styles`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (stylesResponse.ok) {
      const stylesData = await stylesResponse.json();
      console.log(`🎨 Color styles: ${stylesData.meta?.styles?.filter(s => s.style_type === 'FILL')?.length || 0}`);
      console.log(`📝 Text styles: ${stylesData.meta?.styles?.filter(s => s.style_type === 'TEXT')?.length || 0}`);
      console.log(`🔳 Effect styles: ${stylesData.meta?.styles?.filter(s => s.style_type === 'EFFECT')?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Error analyzing file:', error.message);
  }
}

function extractColors(children, depth = 0) {
  const colors = new Set();

  function traverse(node) {
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b } = fill.color;
          const hex = '#' + [r, g, b].map(c =>
            Math.round(c * 255).toString(16).padStart(2, '0')
          ).join('');
          colors.add(hex);
        }
      });
    }

    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach(stroke => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const { r, g, b } = stroke.color;
          const hex = '#' + [r, g, b].map(c =>
            Math.round(c * 255).toString(16).padStart(2, '0')
          ).join('');
          colors.add(hex);
        }
      });
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  children.forEach(traverse);

  if (depth === 0 && colors.size > 0) {
    console.log(`    🎨 Colors found: ${Array.from(colors).slice(0, 10).join(', ')}${colors.size > 10 ? '...' : ''}`);
  }

  return Array.from(colors);
}

function extractTypography(children) {
  const fonts = new Set();
  const fontSizes = new Set();

  function traverse(node) {
    if (node.style && node.type === 'TEXT') {
      if (node.style.fontFamily) fonts.add(node.style.fontFamily);
      if (node.style.fontSize) fontSizes.add(node.style.fontSize);
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  children.forEach(traverse);

  if (fonts.size > 0) {
    console.log(`    📝 Fonts: ${Array.from(fonts).join(', ')}`);
  }
  if (fontSizes.size > 0) {
    console.log(`    📏 Font sizes: ${Array.from(fontSizes).sort((a, b) => a - b).join(', ')}px`);
  }
}

function extractLayoutPatterns(children) {
  const layouts = {
    autoLayout: 0,
    grids: 0,
    constraints: 0
  };

  function traverse(node) {
    if (node.layoutMode) layouts.autoLayout++;
    if (node.layoutGrids && node.layoutGrids.length > 0) layouts.grids++;
    if (node.constraints) layouts.constraints++;

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  children.forEach(traverse);

  console.log(`    📐 Auto Layout: ${layouts.autoLayout}, Grids: ${layouts.grids}, Constraints: ${layouts.constraints}`);
}

// Run the analysis
fetchFigmaData();
