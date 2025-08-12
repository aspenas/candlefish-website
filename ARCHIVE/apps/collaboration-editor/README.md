# Candlefish AI Collaboration Editor

A real-time collaborative document editor built with Next.js 15, React 18, and modern web technologies. Features CRDT-based conflict-free collaborative editing, real-time presence awareness, threaded comments, version control, and comprehensive accessibility support.

## 🚀 Features

### Core Collaboration
- **Real-time Collaborative Editing**: CRDT-based conflict-free document editing with Yjs
- **Live Presence System**: Real-time cursor positions, selections, and typing indicators
- **Threaded Comments**: Contextual comments with replies, reactions, and resolution tracking
- **Version Control**: Complete version history with branching and diff visualization
- **Activity Feed**: Real-time activity stream with notifications and updates

### Technical Excellence
- **WebSocket Subscriptions**: Real-time updates via GraphQL subscriptions
- **Offline Support**: Local caching with conflict resolution on reconnection
- **Performance Optimized**: Virtualized rendering, debounced updates, intelligent caching
- **Responsive Design**: Mobile-first design that works across all devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support

### Developer Experience
- **TypeScript**: Full type safety throughout the application
- **GraphQL Code Generation**: Automatic type generation from GraphQL schema
- **Component Architecture**: Modular, reusable components with clear separation of concerns
- **State Management**: Zustand for local state, Apollo Client for remote state
- **Modern Tooling**: ESLint, Prettier, Tailwind CSS, and more

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15**: App Router with React Server Components
- **React 18**: Concurrent features and Suspense
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions

### Collaboration Stack
- **Apollo Client**: GraphQL client with subscriptions
- **Yjs**: CRDT implementation for collaborative editing
- **Zustand**: State management with persistence
- **Lexical**: Rich text editor framework
- **WebSocket**: Real-time bidirectional communication

### Component Architecture
```
src/
├── components/
│   ├── editor/              # Core editor components
│   │   ├── CollaborativeEditor.tsx
│   │   ├── PresenceLayer.tsx
│   │   └── CollaborationToolbar.tsx
│   ├── comments/            # Comment system
│   │   └── CommentLayer.tsx
│   ├── versions/            # Version control
│   │   └── VersionSidebar.tsx
│   ├── activity/            # Activity feed
│   │   └── ActivitySidebar.tsx
│   ├── layout/              # Layout components
│   │   └── EditorLayout.tsx
│   ├── providers/           # Context providers
│   │   ├── CollaborationProvider.tsx
│   │   └── DocumentProvider.tsx
│   └── ui/                  # Reusable UI components
├── stores/                  # Zustand stores
│   └── collaboration-store.ts
├── lib/                     # Utilities and configuration
│   ├── apollo-client.ts
│   └── utils.ts
├── graphql/                 # GraphQL queries and types
│   ├── queries/
│   ├── mutations/
│   └── subscriptions/
└── types/                   # TypeScript types
    └── graphql.ts
```

## 🎯 Key Components

### CollaborativeEditor
The main editor component that integrates Lexical with Yjs for real-time collaboration:
- CRDT state management
- Operational transforms
- Conflict resolution
- Performance optimizations

### PresenceLayer
Real-time presence awareness system:
- Live cursor positions
- User selections
- Typing indicators
- Connection status
- User avatars and status

### CommentLayer
Contextual commenting system:
- Position-based anchoring
- Threaded discussions
- Reactions and mentions
- Resolution tracking
- Real-time updates

### VersionSidebar
Complete version control interface:
- Version timeline
- Change visualization
- Branching support
- Rollback functionality
- Diff viewer

### ActivitySidebar
Real-time activity feed:
- User actions tracking
- System events
- Notification management
- Activity filtering
- Time-based grouping

## 📡 Real-time Features

### WebSocket Subscriptions
- **Document Content Changes**: Real-time text updates with conflict resolution
- **Presence Updates**: Live cursor positions and user status
- **Comment Updates**: Real-time comment additions and modifications
- **Activity Feed**: Live activity stream updates

### CRDT Integration
- **Yjs Integration**: Conflict-free replicated data types
- **Operational Transforms**: Automatic conflict resolution
- **Vector Clocks**: Causal consistency maintenance
- **Merge Strategies**: Multiple conflict resolution approaches

### Offline Support
- **Local Persistence**: IndexedDB for offline storage
- **Conflict Resolution**: Automatic merge on reconnection
- **Queue Management**: Pending operations tracking
- **Sync Status**: Connection state awareness

## 🎨 UI/UX Features

### Responsive Design
- **Mobile-first**: Optimized for touch interfaces
- **Adaptive Layout**: Flexible sidebar management
- **Progressive Enhancement**: Works without JavaScript
- **Touch Gestures**: Tablet and mobile support

### Accessibility
- **WCAG 2.1 AA**: Full compliance with accessibility standards
- **Keyboard Navigation**: Complete keyboard support
- **Screen Reader**: ARIA labels and live regions
- **High Contrast**: Color contrast compliance
- **Focus Management**: Logical tab order

### Performance
- **Virtual Scrolling**: Large document performance
- **Debounced Updates**: Optimized network usage
- **Lazy Loading**: Component code splitting
- **Caching Strategy**: Multi-layer caching
- **Bundle Optimization**: Tree shaking and compression

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- GraphQL backend with collaboration schema

### Installation
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

### Environment Setup
Create a `.env.local` file:
```env
NEXT_PUBLIC_GRAPHQL_HTTP_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql
```

### GraphQL Backend
The editor expects a GraphQL backend implementing the collaboration schema defined in `/Users/patricksmith/candlefish-ai/graphql/schema/`. Key requirements:

- Document queries and mutations
- Real-time subscriptions for content, presence, and activity
- CRDT state management
- User authentication and authorization
- Multi-tenant support

## 📱 Usage Examples

### Basic Integration
```tsx
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';

function MyApp() {
  return (
    <CollaborativeEditor
      documentId="document-123"
      placeholder="Start writing..."
      onContentChange={(content) => console.log(content)}
    />
  );
}
```

### With Custom Layout
```tsx
import { EditorLayout } from '@/components/layout/EditorLayout';
import { CollaborationProvider } from '@/components/providers/CollaborationProvider';

function CustomEditor({ documentId }: { documentId: string }) {
  return (
    <CollaborationProvider documentId={documentId}>
      <EditorLayout>
        <CollaborativeEditor documentId={documentId} />
      </EditorLayout>
    </CollaborationProvider>
  );
}
```

## 🔧 Configuration

### Apollo Client
The Apollo Client is configured for:
- HTTP queries and mutations
- WebSocket subscriptions
- Automatic reconnection
- Error handling and retry logic
- Optimistic updates

### Zustand Store
The collaboration store manages:
- Document state
- User presence
- Comments and threads
- Version history
- Activity feed
- UI state

### Tailwind CSS
Custom design tokens for:
- Collaboration colors
- Animation utilities
- Responsive breakpoints
- Accessibility utilities

## 🧪 Testing

### Test Coverage
- Unit tests for all components
- Integration tests for collaboration features
- End-to-end tests for user workflows
- Performance tests for large documents
- Accessibility tests for compliance

### Running Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

## 🚀 Performance

### Optimization Strategies
- **Code Splitting**: Route and component level
- **Tree Shaking**: Unused code elimination
- **Bundle Analysis**: Size monitoring and optimization
- **Image Optimization**: Next.js image optimization
- **Caching**: Multiple cache layers

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms
- **Time to Interactive**: < 3s

## 🔒 Security

### Security Features
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Token-based protection
- **Input Validation**: Client and server validation
- **Rate Limiting**: API rate limiting
- **Authentication**: JWT-based authentication

## 📈 Monitoring

### Analytics
- **User Engagement**: Collaboration metrics
- **Performance Monitoring**: Core Web Vitals
- **Error Tracking**: Error reporting and alerting
- **Usage Analytics**: Feature usage tracking

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Write comprehensive tests
3. Maintain accessibility standards
4. Document all new features
5. Follow the existing code style

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback

## 📄 License

This project is part of the Candlefish AI ecosystem and follows the project's licensing terms.

## 🔗 Related Projects

- **Backend GraphQL API**: Real-time collaboration backend
- **Brand Portal**: Integrated branding system
- **Paintbox**: Estimation and project management
- **Analytics Dashboard**: Usage analytics and insights

## 📞 Support

For technical support and questions:
- Create issues in the project repository
- Join the development team discussions
- Review the comprehensive documentation
- Check the example implementations

---

Built with ❤️ by the Candlefish AI team using modern web technologies and best practices for real-time collaborative applications.
