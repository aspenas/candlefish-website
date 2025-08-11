// Candlefish Brand Bootstrap Plugin - main entry

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

async function ensurePage(name: string): Promise<PageNode> {
  const existing = figma.root.children.find((p) => p.name === name);
  if (existing) return existing as PageNode;
  const page = figma.createPage();
  page.name = name;
  return page;
}

function makePaintStyle(name: string, hex: string): PaintStyle {
  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = [
    {
      type: 'SOLID',
      color: hexToRgb(hex),
    },
  ];
  return style;
}

async function importLogoToComponent(imgBytes: Uint8Array, name = 'Logo/Primary'): Promise<ComponentNode> {
  const image = figma.createImage(imgBytes);
  const component = figma.createComponent();
  component.name = name;
  component.resizeWithoutConstraints(600, 240);

  const rect = figma.createRectangle();
  rect.fills = [
    {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FIT',
    } as ImagePaint,
  ];
  rect.resize(600, 240);
  component.appendChild(rect);

  // Export settings: SVG and PDF presets
  component.exportSettings = [
    { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
    { format: 'PDF' },
  ];

  return component;
}

function createTypographyStyles() {
  // Inter is assumed; if unavailable, user can resolve via Figma font settings
  const styles = [
    { name: 'Type/H1', fontSize: 40, lineHeight: 48, fontWeight: 'Medium', letterSpacing: 0.01 },
    { name: 'Type/H2', fontSize: 28, lineHeight: 36, fontWeight: 'Medium', letterSpacing: 0.01 },
    { name: 'Type/H3', fontSize: 20, lineHeight: 28, fontWeight: 'Medium', letterSpacing: 0.01 },
    { name: 'Type/Body', fontSize: 16, lineHeight: 24, fontWeight: 'Regular', letterSpacing: 0 },
    { name: 'Type/Small', fontSize: 14, lineHeight: 20, fontWeight: 'Regular', letterSpacing: 0 },
  ];

  for (const s of styles) {
    const ts = figma.createTextStyle();
    ts.name = s.name;
    ts.fontSize = s.fontSize;
    ts.lineHeight = { unit: 'PIXELS', value: s.lineHeight } as LineHeight;
    ts.letterSpacing = { unit: 'PERCENT', value: s.letterSpacing * 100 } as LetterSpacing;
    ts.fontName = { family: 'Inter', style: s.fontWeight } as FontName;
  }
}

function createColorStylesAndVariables() {
  // Core brand colors
  makePaintStyle('Brand/Primary', '#11D9E6');
  makePaintStyle('Brand/Ink', '#0D1214');
  makePaintStyle('Brand/Surface', '#082C32');

  // Neutral scale (cool axis placeholder)
  const neutralHexes = [
    '#F2F5F6', // 100
    '#E6EBED', // 200
    '#CBD5D9', // 300
    '#AFBEC4', // 400
    '#93A7AF', // 500
    '#798F99', // 600
    '#5F7782', // 700
    '#485E68', // 800
    '#31454E', // 900
  ];
  neutralHexes.forEach((hex, idx) => makePaintStyle(`Neutral/${(idx + 1) * 100}`, hex));

  // Variables (light and dark collections)
  const lightCollection = figma.variables.createVariableCollection('Colors/Light');
  const darkCollection = figma.variables.createVariableCollection('Colors/Dark');

  function makeColorVariable(name: string, hex: string) {
    const v = figma.variables.createVariable(name, lightCollection, 'COLOR');
    v.setValueForMode(lightCollection.modes[0].modeId, hexToRgb(hex));
    const vd = figma.variables.createVariable(name, darkCollection, 'COLOR');
    vd.setValueForMode(darkCollection.modes[0].modeId, hexToRgb(hex));
  }

  makeColorVariable('color.brand.primary', '#11D9E6');
  neutralHexes.forEach((hex, idx) => makeColorVariable(`color.neutral.${(idx + 1) * 100}`, hex));
  makeColorVariable('color.brand.ink', '#0D1214');
  makeColorVariable('color.brand.surface', '#082C32');
  makeColorVariable('color.accent.warn', '#D97706');
  makeColorVariable('color.accent.ok', '#10B981');
}

function createBaseComponents() {
  // Grid/Container
  const container = figma.createComponent();
  container.name = 'Grid/Container';
  container.resize(1200, 800);
  container.cornerRadius = 0;
  container.layoutMode = 'VERTICAL';
  container.itemSpacing = 24;
  container.paddingLeft = 24;
  container.paddingRight = 24;
  container.paddingTop = 24;
  container.paddingBottom = 24;

  // Grid/Stack
  const stack = figma.createComponent();
  stack.name = 'Grid/Stack';
  stack.layoutMode = 'VERTICAL';
  stack.itemSpacing = 16; // base spacing token
  stack.resize(600, 400);

  // Card/Base
  const card = figma.createComponent();
  card.name = 'Card/Base';
  card.resize(320, 200);
  card.cornerRadius = 2;
  card.fills = [
    { type: 'SOLID', color: hexToRgb('#FFFFFF') },
  ];
  card.strokes = [
    { type: 'SOLID', color: hexToRgb('#E6EBED') },
  ];
  card.strokeWeight = 1;

  // Button/Primary
  const btnPrimary = figma.createComponent();
  btnPrimary.name = 'Button/Primary';
  btnPrimary.resize(160, 40);
  btnPrimary.cornerRadius = 2;
  btnPrimary.fills = [{ type: 'SOLID', color: hexToRgb('#11D9E6') }];
  btnPrimary.strokes = [];

  // Button/Quiet
  const btnQuiet = figma.createComponent();
  btnQuiet.name = 'Button/Quiet';
  btnQuiet.resize(160, 40);
  btnQuiet.cornerRadius = 2;
  btnQuiet.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
  btnQuiet.strokes = [
    { type: 'SOLID', color: hexToRgb('#CBD5D9') },
  ];
  btnQuiet.strokeWeight = 1;

  return { container, stack, card, btnPrimary, btnQuiet };
}

async function run(bytes: Uint8Array) {
  // Create required pages
  await ensurePage('Cover');
  const assetsPage = await ensurePage('01 Brand Assets');
  await ensurePage('02 Type & Color');
  await ensurePage('03 Components');
  await ensurePage('04 Specimens');

  // Color styles and variables
  createColorStylesAndVariables();

  // Typography styles
  // Figma requires fonts to be loaded to assign fontName on nodes, but creating styles is allowed
  createTypographyStyles();

  // Logo component
  figma.currentPage = assetsPage;
  const logoPrimary = await importLogoToComponent(bytes, 'Logo/Primary');
  assetsPage.appendChild(logoPrimary);

  // Placeholder variants for lockups and wordmark (wordmark contains editable text)
  const wordmark = figma.createComponent();
  wordmark.name = 'Logo/Wordmark';
  wordmark.resize(600, 180);
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
    const text = figma.createText();
    text.characters = 'CANDLEFISH';
    text.fontName = { family: 'Inter', style: 'Medium' } as FontName;
    text.fontSize = 72;
    text.letterSpacing = { unit: 'PERCENT', value: 1 } as LetterSpacing; // +1%
    text.lineHeight = { unit: 'AUTO' } as LineHeight;
    wordmark.appendChild(text);
  } catch {}
  // Export presets
  wordmark.exportSettings = [
    { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
    { format: 'PDF' },
  ];
  assetsPage.appendChild(wordmark);

  const lockupH = figma.createComponent();
  lockupH.name = 'Logo/Lockup/Horizontal';
  lockupH.resize(600, 240);
  lockupH.exportSettings = [
    { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
    { format: 'PDF' },
  ];
  assetsPage.appendChild(lockupH);

  const lockupS = figma.createComponent();
  lockupS.name = 'Logo/Lockup/Stacked';
  lockupS.resize(360, 360);
  lockupS.exportSettings = [
    { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
    { format: 'PDF' },
  ];
  assetsPage.appendChild(lockupS);

  // Combine into a variant set
  const set = figma.combineAsVariants([logoPrimary, wordmark, lockupH, lockupS], assetsPage);
  logoPrimary.variantProperties = { Kind: 'Primary' };
  wordmark.variantProperties = { Kind: 'Wordmark' };
  lockupH.variantProperties = { Kind: 'Lockup-Horizontal' };
  lockupS.variantProperties = { Kind: 'Lockup-Stacked' };
  set.name = 'Logo';

  // Base components
  const componentsPage = figma.root.children.find((p) => p.name === '03 Components') as PageNode;
  figma.currentPage = componentsPage;
  const base = createBaseComponents();
  // 8-pt grid on container
  base.container.layoutGrids = [
    { pattern: 'GRID', sectionSize: 8, color: { r: 0, g: 0.75, b: 1 }, visible: false } as LayoutGrid,
  ];
  componentsPage.appendChild(base.container);
  componentsPage.appendChild(base.stack);
  componentsPage.appendChild(base.card);
  componentsPage.appendChild(base.btnPrimary);
  componentsPage.appendChild(base.btnQuiet);

  // Specimens page: create a brand sheet frame with basic swatches and type scale
  const specimensPage = figma.root.children.find((p) => p.name === '04 Specimens') as PageNode;
  figma.currentPage = specimensPage;
  const brandSheet = figma.createFrame();
  brandSheet.name = 'Brand Sheet';
  brandSheet.resize(1440, 1024);
  brandSheet.layoutMode = 'VERTICAL';
  brandSheet.itemSpacing = 32;
  brandSheet.paddingTop = 64;
  brandSheet.paddingBottom = 64;
  brandSheet.paddingLeft = 64;
  brandSheet.paddingRight = 64;
  brandSheet.layoutGrids = [
    { pattern: 'GRID', sectionSize: 8, color: { r: 0, g: 0, b: 0 }, visible: false } as LayoutGrid,
  ];
  specimensPage.appendChild(brandSheet);

  // Load fonts to create sample text nodes
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  } catch (e) {
    // If fonts fail to load, skip text creation gracefully
  }

  // Title
  const title = figma.createText();
  title.characters = 'Candlefish — Brand Sheet';
  title.fontName = { family: 'Inter', style: 'Medium' } as FontName;
  title.fontSize = 28;
  title.lineHeight = { unit: 'PIXELS', value: 36 } as LineHeight;
  brandSheet.appendChild(title);

  // Color swatches row
  const swatches = figma.createFrame();
  swatches.name = 'Color Swatches';
  swatches.layoutMode = 'HORIZONTAL';
  swatches.itemSpacing = 24;
  swatches.counterAxisSizingMode = 'AUTO';
  swatches.primaryAxisSizingMode = 'AUTO';
  brandSheet.appendChild(swatches);

  function addSwatch(name: string, hex: string) {
    const frame = figma.createFrame();
    frame.name = name;
    frame.layoutMode = 'VERTICAL';
    frame.itemSpacing = 8;
    frame.paddingTop = 8;
    frame.paddingBottom = 8;
    frame.paddingLeft = 8;
    frame.paddingRight = 8;
    frame.strokes = [{ type: 'SOLID', color: hexToRgb('#E6EBED') }];
    frame.strokeWeight = 1;
    frame.counterAxisSizingMode = 'AUTO';
    frame.primaryAxisSizingMode = 'AUTO';

    const rect = figma.createRectangle();
    rect.resize(120, 80);
    rect.fills = [{ type: 'SOLID', color: hexToRgb(hex) }];
    frame.appendChild(rect);

    const label = figma.createText();
    label.characters = `${name}\n${hex}`;
    label.fontName = { family: 'Inter', style: 'Regular' } as FontName;
    label.fontSize = 12;
    label.lineHeight = { unit: 'PIXELS', value: 16 } as LineHeight;
    frame.appendChild(label);

    swatches.appendChild(frame);
  }

  addSwatch('Brand/Primary', '#11D9E6');
  addSwatch('Brand/Ink', '#0D1214');
  addSwatch('Brand/Surface', '#082C32');

  // Type specimen
  const typeSpecimen = figma.createFrame();
  typeSpecimen.name = 'Type Scale';
  typeSpecimen.layoutMode = 'VERTICAL';
  typeSpecimen.itemSpacing = 16;
  typeSpecimen.counterAxisSizingMode = 'AUTO';
  typeSpecimen.primaryAxisSizingMode = 'AUTO';
  brandSheet.appendChild(typeSpecimen);

  function addTypeLine(text: string, size: number, line: number, style: 'Regular' | 'Medium') {
    const t = figma.createText();
    t.characters = text;
    t.fontName = { family: 'Inter', style } as FontName;
    t.fontSize = size;
    t.lineHeight = { unit: 'PIXELS', value: line } as LineHeight;
    typeSpecimen.appendChild(t);
  }

  addTypeLine('Heading 1 — 40/48 Medium', 40, 48, 'Medium');
  addTypeLine('Heading 2 — 28/36 Medium', 28, 36, 'Medium');
  addTypeLine('Heading 3 — 20/28 Medium', 20, 28, 'Medium');
  addTypeLine('Body — 16/24 Regular', 16, 24, 'Regular');
  addTypeLine('Small — 14/20 Regular', 14, 20, 'Regular');

  figma.notify('Candlefish brand bootstrap complete.');
  figma.closePlugin();
}

figma.showUI('<html><body></body></html>', { visible: false });

figma.ui.onmessage = async (msg) => {
  if (msg?.type === 'bootstrap' && msg.bytes) {
    await run(new Uint8Array(msg.bytes as ArrayBuffer));
  }
};
