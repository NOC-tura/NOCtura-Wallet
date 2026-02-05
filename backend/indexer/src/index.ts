/**
 * Noctura Indexer Service
 * 
 * Indexes blockchain data for wallet state.
 * TODO: Implement full indexer system
 */

export const INDEXER_SERVICE_VERSION = '0.1.0';

export interface IndexerConfig {
  rpcEndpoint: string;
  startBlock?: number;
  batchSize: number;
}

export interface IndexedTransaction {
  signature: string;
  blockNumber: number;
  timestamp: Date;
  type: 'deposit' | 'withdrawal' | 'transfer';
}

export class IndexerService {
  private config: IndexerConfig;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    console.log('Indexer starting...');
    // TODO: Implement blockchain indexing
  }

  async stop(): Promise<void> {
    console.log('Indexer stopping...');
  }
}

export default IndexerService;
