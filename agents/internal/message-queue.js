#!/usr/bin/env node
/**
 * Message Queue for NANDA Agent reliability
 * Ensures no lost messages between agents during failures
 */

const EventEmitter = require('events');

class MessageQueue extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map();
    this.deadLetterQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }
  
  createQueue(queueName) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      console.log(`[MQ] Created queue: ${queueName}`);
    }
  }
  
  async publish(queueName, message) {
    const envelope = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queue: queueName,
      message: message,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName);
    }
    
    this.queues.get(queueName).push(envelope);
    this.emit('message', { queue: queueName, envelope });
    
    return envelope.id;
  }
  
  async consume(queueName, handler) {
    this.on('message', async ({ queue, envelope }) => {
      if (queue !== queueName) return;
      
      try {
        await handler(envelope.message);
        this.acknowledge(envelope.id);
      } catch (error) {
        console.error(`[MQ] Handler error: ${error.message}`);
        this.retry(envelope);
      }
    });
  }
  
  acknowledge(messageId) {
    // Remove from all queues
    for (const [queueName, messages] of this.queues) {
      const index = messages.findIndex(m => m.id === messageId);
      if (index > -1) {
        messages.splice(index, 1);
        console.log(`[MQ] Acknowledged: ${messageId}`);
        return;
      }
    }
  }
  
  retry(envelope) {
    envelope.attempts++;
    
    if (envelope.attempts > this.maxRetries) {
      this.deadLetterQueue.push(envelope);
      console.error(`[MQ] Message moved to DLQ: ${envelope.id}`);
      return;
    }
    
    // Exponential backoff
    const delay = Math.pow(2, envelope.attempts) * 1000;
    setTimeout(() => {
      this.emit('message', { queue: envelope.queue, envelope });
    }, delay);
    
    console.log(`[MQ] Retrying message ${envelope.id} (attempt ${envelope.attempts})`);
  }
  
  getQueueStats() {
    const stats = {};
    for (const [name, messages] of this.queues) {
      stats[name] = {
        pending: messages.length,
        oldest: messages[0]?.timestamp
      };
    }
    stats.deadLetterQueue = this.deadLetterQueue.length;
    return stats;
  }
}

// Singleton instance
const messageQueue = new MessageQueue();

// Create default queues
messageQueue.createQueue('orchestrator');
messageQueue.createQueue('estimates');
messageQueue.createQueue('knowledge');
messageQueue.createQueue('consortium');

module.exports = messageQueue;