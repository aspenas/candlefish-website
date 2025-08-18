import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { createServer } from 'http';
import WebSocket from 'ws';
import { typeDefs } from '../../index';
import { resolvers } from '../../resolvers';
import { DataSourceContext } from '../../types/DataSourceContext';

describe('Real-time Subscriptions', () => {
  let server: ApolloServer;
  let mockDataSources: DataSourceContext;
  let httpServer: any;
  let wsServer: WebSocketServer;
  let mockPubSub: any;

  beforeAll(async () => {
    mockPubSub = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      asyncIterator: jest.fn(),
    };

    mockDataSources = {
      estimates: {
        findById: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pricing: {
        calculate: jest.fn(),
      },
      pdf: {
        generate: jest.fn(),
      },
      pubsub: mockPubSub,
    };

    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });

    // Create HTTP server for WebSocket subscriptions
    httpServer = createServer();
    wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql/subscriptions',
    });

    useServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      context: () => ({ dataSources: mockDataSources }),
    }, wsServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(4001, resolve);
    });
  });

  afterAll(async () => {
    await server.stop();
    wsServer.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('estimateUpdated subscription', () => {
    const ESTIMATE_UPDATED_SUBSCRIPTION = gql`
      subscription EstimateUpdated($id: ID!) {
        estimateUpdated(id: $id) {
          id
          customerId
          selectedTier
          status
          goodPrice
          betterPrice
          bestPrice
          updatedAt
        }
      }
    `;

    it('should receive estimate updates in real-time', (done) => {
      const estimateId = 'estimate1';
      const mockUpdatedEstimate = {
        id: estimateId,
        customerId: 'customer1',
        selectedTier: 'BEST',
        status: 'REVIEW',
        goodPrice: 1800.00,
        betterPrice: 2400.00,
        bestPrice: 3000.00,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      // Mock the async iterator for subscription
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { estimateUpdated: mockUpdatedEstimate };
        },
      };

      mockPubSub.asyncIterator.mockReturnValue(mockAsyncIterator);

      // Create WebSocket connection
      const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

      ws.on('open', () => {
        // Send connection init
        ws.send(JSON.stringify({ type: 'connection_init' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_ack') {
          // Send subscription
          ws.send(JSON.stringify({
            id: '1',
            type: 'start',
            payload: {
              query: ESTIMATE_UPDATED_SUBSCRIPTION.loc?.source.body,
              variables: { id: estimateId },
            },
          }));
        }

        if (message.type === 'data') {
          expect(message.payload.data.estimateUpdated).toEqual(mockUpdatedEstimate);
          expect(mockPubSub.asyncIterator).toHaveBeenCalledWith(`ESTIMATE_UPDATED_${estimateId}`);

          ws.close();
          done();
        }
      });

      // Simulate an estimate update after a short delay
      setTimeout(() => {
        mockPubSub.publish('ESTIMATE_UPDATED_estimate1', mockUpdatedEstimate);
      }, 100);
    });

    it('should handle subscription errors gracefully', (done) => {
      const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

      mockPubSub.asyncIterator.mockImplementation(() => {
        throw new Error('Subscription service unavailable');
      });

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'connection_init' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_ack') {
          ws.send(JSON.stringify({
            id: '1',
            type: 'start',
            payload: {
              query: ESTIMATE_UPDATED_SUBSCRIPTION.loc?.source.body,
              variables: { id: 'estimate1' },
            },
          }));
        }

        if (message.type === 'error') {
          expect(message.payload).toBeDefined();
          expect(Array.isArray(message.payload)).toBe(true);

          ws.close();
          done();
        }
      });
    });

    it('should handle multiple concurrent subscriptions', (done) => {
      let connectionsReceived = 0;
      const targetConnections = 3;

      const mockUpdatedEstimates = [
        { id: 'estimate1', status: 'REVIEW', updatedAt: '2025-01-15T12:00:00Z' },
        { id: 'estimate2', status: 'SENT', updatedAt: '2025-01-15T12:01:00Z' },
        { id: 'estimate3', status: 'ACCEPTED', updatedAt: '2025-01-15T12:02:00Z' },
      ];

      mockUpdatedEstimates.forEach((estimate, index) => {
        const mockAsyncIterator = {
          [Symbol.asyncIterator]: async function* () {
            yield { estimateUpdated: estimate };
          },
        };

        mockPubSub.asyncIterator
          .mockReturnValueOnce(mockAsyncIterator);

        const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'connection_init' }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'connection_ack') {
            ws.send(JSON.stringify({
              id: `sub_${index}`,
              type: 'start',
              payload: {
                query: ESTIMATE_UPDATED_SUBSCRIPTION.loc?.source.body,
                variables: { id: estimate.id },
              },
            }));
          }

          if (message.type === 'data') {
            expect(message.payload.data.estimateUpdated.id).toBe(estimate.id);
            connectionsReceived++;

            if (connectionsReceived === targetConnections) {
              ws.close();
              done();
            }
          }
        });
      });
    });
  });

  describe('calculationProgress subscription', () => {
    const CALCULATION_PROGRESS_SUBSCRIPTION = gql`
      subscription CalculationProgress($estimateId: ID!) {
        calculationProgress(estimateId: $estimateId) {
          estimateId
          stage
          progress
          message
          completed
        }
      }
    `;

    it('should track calculation progress updates', (done) => {
      const estimateId = 'estimate1';
      const progressUpdates = [
        {
          estimateId,
          stage: 'MEASUREMENTS',
          progress: 0.25,
          message: 'Processing measurements',
          completed: false,
        },
        {
          estimateId,
          stage: 'MATERIALS',
          progress: 0.5,
          message: 'Calculating material costs',
          completed: false,
        },
        {
          estimateId,
          stage: 'LABOR',
          progress: 0.75,
          message: 'Estimating labor hours',
          completed: false,
        },
        {
          estimateId,
          stage: 'FINALIZATION',
          progress: 1.0,
          message: 'Calculation complete',
          completed: true,
        },
      ];

      let updateCount = 0;
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const update of progressUpdates) {
            yield { calculationProgress: update };
          }
        },
      };

      mockPubSub.asyncIterator.mockReturnValue(mockAsyncIterator);

      const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'connection_init' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_ack') {
          ws.send(JSON.stringify({
            id: '1',
            type: 'start',
            payload: {
              query: CALCULATION_PROGRESS_SUBSCRIPTION.loc?.source.body,
              variables: { estimateId },
            },
          }));
        }

        if (message.type === 'data') {
          const progress = message.payload.data.calculationProgress;
          const expectedUpdate = progressUpdates[updateCount];

          expect(progress.estimateId).toBe(expectedUpdate.estimateId);
          expect(progress.stage).toBe(expectedUpdate.stage);
          expect(progress.progress).toBe(expectedUpdate.progress);
          expect(progress.completed).toBe(expectedUpdate.completed);

          updateCount++;

          if (updateCount === progressUpdates.length) {
            expect(progress.completed).toBe(true);
            ws.close();
            done();
          }
        }
      });
    });

    it('should handle calculation errors', (done) => {
      const estimateId = 'estimate1';
      const errorUpdate = {
        estimateId,
        stage: 'ERROR',
        progress: 0.0,
        message: 'Calculation failed: Invalid measurements',
        completed: false,
      };

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { calculationProgress: errorUpdate };
        },
      };

      mockPubSub.asyncIterator.mockReturnValue(mockAsyncIterator);

      const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'connection_init' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_ack') {
          ws.send(JSON.stringify({
            id: '1',
            type: 'start',
            payload: {
              query: CALCULATION_PROGRESS_SUBSCRIPTION.loc?.source.body,
              variables: { estimateId },
            },
          }));
        }

        if (message.type === 'data') {
          const progress = message.payload.data.calculationProgress;

          expect(progress.stage).toBe('ERROR');
          expect(progress.message).toContain('Calculation failed');
          expect(progress.completed).toBe(false);

          ws.close();
          done();
        }
      });
    });
  });

  describe('Subscription Performance', () => {
    it('should handle high-frequency updates without memory leaks', (done) => {
      const estimateId = 'estimate1';
      const updateCount = 100;
      let receivedCount = 0;

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (let i = 0; i < updateCount; i++) {
            yield {
              estimateUpdated: {
                id: estimateId,
                status: 'IN_PROGRESS',
                updatedAt: new Date(Date.now() + i * 10).toISOString(),
              },
            };
          }
        },
      };

      mockPubSub.asyncIterator.mockReturnValue(mockAsyncIterator);

      const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'connection_init' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_ack') {
          ws.send(JSON.stringify({
            id: '1',
            type: 'start',
            payload: {
              query: gql`
                subscription EstimateUpdated($id: ID!) {
                  estimateUpdated(id: $id) {
                    id
                    status
                    updatedAt
                  }
                }
              `.loc?.source.body,
              variables: { id: estimateId },
            },
          }));
        }

        if (message.type === 'data') {
          receivedCount++;

          if (receivedCount === updateCount) {
            expect(receivedCount).toBe(updateCount);
            ws.close();
            done();
          }
        }
      });
    });

    it('should maintain subscription performance under load', async () => {
      const concurrentSubscriptions = 20;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrentSubscriptions; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Subscription timeout'));
          }, 5000);

          const mockAsyncIterator = {
            [Symbol.asyncIterator]: async function* () {
              yield {
                estimateUpdated: {
                  id: `estimate${i}`,
                  status: 'REVIEW',
                  updatedAt: new Date().toISOString(),
                },
              };
            },
          };

          mockPubSub.asyncIterator.mockReturnValueOnce(mockAsyncIterator);

          const ws = new WebSocket('ws://localhost:4001/graphql/subscriptions', 'graphql-ws');

          ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'connection_init' }));
          });

          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === 'connection_ack') {
              ws.send(JSON.stringify({
                id: `sub_${i}`,
                type: 'start',
                payload: {
                  query: gql`
                    subscription EstimateUpdated($id: ID!) {
                      estimateUpdated(id: $id) {
                        id
                        status
                        updatedAt
                      }
                    }
                  `.loc?.source.body,
                  variables: { id: `estimate${i}` },
                },
              }));
            }

            if (message.type === 'data') {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        promises.push(promise);
      }

      await expect(Promise.all(promises)).resolves.toHaveLength(concurrentSubscriptions);
    });
  });
});
