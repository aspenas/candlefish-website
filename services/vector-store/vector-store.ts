import { ChromaClient } from 'chromadb';

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface SearchParams {
  query: string;
  limit?: number;
  filter?: Record<string, any>;
  threshold?: number;
}

export class VectorStore {
  private client?: ChromaClient;
  private collection?: any;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize ChromaDB client
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000',
      });

      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: 'candlefish-agents',
        metadata: {
          description: 'Vector store for Candlefish agent platform',
          'hnsw:space': 'cosine',
        },
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      // Fallback to in-memory store if ChromaDB is not available
      this.initializeInMemoryStore();
    }
  }

  private initializeInMemoryStore() {
    // Simple in-memory vector store for development/fallback
    this.collection = {
      documents: new Map<string, VectorDocument>(),

      async add(params: any) {
        const { ids, documents, metadatas } = params;
        for (let i = 0; i < ids.length; i++) {
          this.documents.set(ids[i], {
            id: ids[i],
            content: documents[i],
            metadata: metadatas?.[i],
          });
        }
      },

      async query(params: any) {
        const { queryTexts, nResults } = params;
        const query = queryTexts[0].toLowerCase();
        const results: any[] = [];

        // Simple text search
        for (const [id, doc] of this.documents.entries()) {
          if (doc.content.toLowerCase().includes(query)) {
            results.push({
              id,
              document: doc.content,
              metadata: doc.metadata,
              distance: Math.random(), // Fake distance for in-memory
            });
          }
        }

        return {
          ids: [results.slice(0, nResults).map(r => r.id)],
          documents: [results.slice(0, nResults).map(r => r.document)],
          metadatas: [results.slice(0, nResults).map(r => r.metadata)],
          distances: [results.slice(0, nResults).map(r => r.distance)],
        };
      },

      async update(params: any) {
        const { ids, documents, metadatas } = params;
        for (let i = 0; i < ids.length; i++) {
          const existing = this.documents.get(ids[i]);
          if (existing) {
            existing.content = documents?.[i] || existing.content;
            existing.metadata = metadatas?.[i] || existing.metadata;
          }
        }
      },

      async delete(params: any) {
        const { ids } = params;
        for (const id of ids) {
          this.documents.delete(id);
        }
      },
    };

    this.initialized = true;
  }

  async search(params: SearchParams): Promise<VectorDocument[]> {
    await this.initialize();

    const { query, limit = 10, filter, threshold = 0.7 } = params;

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: filter,
      });

      const documents: VectorDocument[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          // Filter by similarity threshold
          if (!results.distances || !results.distances[0] || results.distances[0][i] <= (1 - threshold)) {
            documents.push({
              id: results.ids[0][i],
              content: results.documents?.[0]?.[i] || '',
              metadata: results.metadatas?.[0]?.[i] || {},
            });
          }
        }
      }

      return documents;
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async upsert(doc: VectorDocument | VectorDocument[]): Promise<void> {
    await this.initialize();

    const docs = Array.isArray(doc) ? doc : [doc];

    try {
      await this.collection.add({
        ids: docs.map(d => d.id),
        documents: docs.map(d => d.content),
        metadatas: docs.map(d => d.metadata || {}),
        embeddings: docs.map(d => d.embedding).filter(Boolean),
      });
    } catch (error) {
      // If documents already exist, update them
      await this.collection.update({
        ids: docs.map(d => d.id),
        documents: docs.map(d => d.content),
        metadatas: docs.map(d => d.metadata || {}),
        embeddings: docs.map(d => d.embedding).filter(Boolean),
      });
    }
  }

  async delete(ids: string | string[]): Promise<void> {
    await this.initialize();

    const idArray = Array.isArray(ids) ? ids : [ids];

    try {
      await this.collection.delete({
        ids: idArray,
      });
    } catch (error) {
      console.error('Failed to delete documents:', error);
    }
  }

  async getById(id: string): Promise<VectorDocument | null> {
    await this.initialize();

    try {
      const results = await this.collection.get({
        ids: [id],
      });

      if (results.ids && results.ids.length > 0) {
        return {
          id: results.ids[0],
          content: results.documents?.[0] || '',
          metadata: results.metadatas?.[0] || {},
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get document by ID:', error);
      return null;
    }
  }

  async count(filter?: Record<string, any>): Promise<number> {
    await this.initialize();

    try {
      // ChromaDB doesn't have a direct count method, so we use a workaround
      const results = await this.collection.query({
        queryTexts: [''],
        nResults: 10000, // Large number to get all documents
        where: filter,
      });

      return results.ids?.[0]?.length || 0;
    } catch (error) {
      console.error('Failed to count documents:', error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    await this.initialize();

    try {
      // Get all document IDs
      const results = await this.collection.query({
        queryTexts: [''],
        nResults: 10000,
      });

      if (results.ids && results.ids[0] && results.ids[0].length > 0) {
        await this.collection.delete({
          ids: results.ids[0],
        });
      }
    } catch (error) {
      console.error('Failed to clear collection:', error);
    }
  }

  async createIndex(field: string): Promise<void> {
    // ChromaDB handles indexing automatically
    console.log(`Index creation requested for field: ${field} (handled automatically by ChromaDB)`);
  }

  async similaritySearch(embedding: number[], limit: number = 10, filter?: Record<string, any>): Promise<VectorDocument[]> {
    await this.initialize();

    try {
      const results = await this.collection.query({
        queryEmbeddings: [embedding],
        nResults: limit,
        where: filter,
      });

      const documents: VectorDocument[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          documents.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: {
              ...(results.metadatas?.[0]?.[i] || {}),
              distance: results.distances?.[0]?.[i],
            },
          });
        }
      }

      return documents;
    } catch (error) {
      console.error('Similarity search failed:', error);
      return [];
    }
  }
}
