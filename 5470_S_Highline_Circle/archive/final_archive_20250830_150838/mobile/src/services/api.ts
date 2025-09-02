import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Item, 
  Valuation, 
  Room, 
  PriceHistory, 
  MarketComparison,
  PriceAlert,
  FilterRequest,
  SearchRequest,
  ValuationRequest,
  AIValuationRequest,
  AIValuationResponse
} from '../types';

// Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8080/graphql' 
  : 'https://your-production-api.com/graphql';

class APIService {
  private authToken: string | null = null;

  constructor() {
    this.loadAuthToken();
  }

  private async loadAuthToken(): Promise<void> {
    try {
      const authData = await AsyncStorage.getItem('@user_auth');
      if (authData) {
        const { token } = JSON.parse(authData);
        this.authToken = token;
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  private async makeRequest(query: string, variables: any = {}): Promise<any> {
    if (!this.authToken) {
      await this.loadAuthToken();
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalItems: number;
    totalValue: number;
    itemsWithValuations: number;
    recentValuations: number;
    portfolioChange: number;
    portfolioChangePercent: number;
  }> {
    const query = `
      query GetDashboardStats {
        dashboardStats {
          totalItems
          totalValue
          itemsWithValuations
          recentValuations
          portfolioChange
          portfolioChangePercent
        }
      }
    `;

    const data = await this.makeRequest(query);
    return data.dashboardStats;
  }

  async getRecentValuations(limit: number = 5): Promise<Valuation[]> {
    const query = `
      query GetRecentValuations($limit: Int!) {
        recentValuations(limit: $limit) {
          id
          item_id
          valuation_type
          estimated_value
          confidence_score
          currency
          effective_date
          expires_at
          data_sources
          methodology_notes
          created_at
          updated_at
          item {
            id
            name
            category
          }
        }
      }
    `;

    const data = await this.makeRequest(query, { limit });
    return data.recentValuations;
  }

  async getPortfolioHistory(days: number = 30): Promise<PriceHistory[]> {
    const query = `
      query GetPortfolioHistory($days: Int!) {
        portfolioHistory(days: $days) {
          id
          item_id
          valuation_type
          price
          effective_date
          confidence_score
          market_conditions
          notes
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { days });
    return data.portfolioHistory;
  }

  // Item methods
  async getItems(filter?: FilterRequest): Promise<{ items: Item[]; total: number }> {
    const query = `
      query GetItems($filter: FilterInput) {
        items(filter: $filter) {
          items {
            id
            room_id
            name
            description
            category
            decision
            purchase_price
            asking_price
            sold_price
            quantity
            is_fixture
            condition
            created_at
            updated_at
            room {
              id
              name
              floor
            }
            images {
              id
              url
              thumbnail_url
              is_primary
            }
            valuations {
              id
              valuation_type
              estimated_value
              confidence_score
              effective_date
            }
          }
          total
        }
      }
    `;

    const data = await this.makeRequest(query, { filter });
    return data.items;
  }

  async getItem(id: string): Promise<Item> {
    const query = `
      query GetItem($id: ID!) {
        item(id: $id) {
          id
          room_id
          name
          description
          category
          decision
          purchase_price
          invoice_ref
          designer_invoice_price
          asking_price
          sold_price
          quantity
          is_fixture
          source
          placement_notes
          condition
          purchase_date
          created_at
          updated_at
          room {
            id
            name
            floor
            description
          }
          images {
            id
            url
            thumbnail_url
            caption
            is_primary
            uploaded_at
          }
          valuations {
            id
            valuation_type
            estimated_value
            confidence_score
            low_estimate
            high_estimate
            currency
            effective_date
            expires_at
            data_sources
            methodology_notes
            created_at
            updated_at
          }
        }
      }
    `;

    const data = await this.makeRequest(query, { id });
    return data.item;
  }

  async searchItems(request: SearchRequest): Promise<{ items: Item[]; total: number }> {
    const query = `
      query SearchItems($request: SearchInput!) {
        searchItems(request: $request) {
          items {
            id
            name
            description
            category
            decision
            asking_price
            condition
            room {
              name
            }
            images {
              url
              thumbnail_url
              is_primary
            }
            valuations {
              estimated_value
              confidence_score
              effective_date
            }
          }
          total
        }
      }
    `;

    const data = await this.makeRequest(query, { request });
    return data.searchItems;
  }

  async createItem(itemData: Partial<Item>): Promise<Item> {
    const query = `
      mutation CreateItem($input: ItemInput!) {
        createItem(input: $input) {
          id
          name
          description
          category
          decision
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { input: itemData });
    return data.createItem;
  }

  async updateItem(id: string, itemData: Partial<Item>): Promise<Item> {
    const query = `
      mutation UpdateItem($id: ID!, $input: ItemUpdateInput!) {
        updateItem(id: $id, input: $input) {
          id
          name
          description
          category
          decision
          updated_at
        }
      }
    `;

    const data = await this.makeRequest(query, { id, input: itemData });
    return data.updateItem;
  }

  // Valuation methods
  async createValuation(request: ValuationRequest): Promise<Valuation> {
    const query = `
      mutation CreateValuation($input: ValuationInput!) {
        createValuation(input: $input) {
          id
          item_id
          valuation_type
          estimated_value
          confidence_score
          effective_date
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { input: request });
    return data.createValuation;
  }

  async getValuationHistory(itemId: string): Promise<PriceHistory[]> {
    const query = `
      query GetValuationHistory($itemId: ID!) {
        valuationHistory(itemId: $itemId) {
          id
          item_id
          valuation_type
          price
          effective_date
          confidence_score
          market_conditions
          notes
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { itemId });
    return data.valuationHistory;
  }

  async getMarketComparisons(valuationId: string): Promise<MarketComparison[]> {
    const query = `
      query GetMarketComparisons($valuationId: ID!) {
        marketComparisons(valuationId: $valuationId) {
          id
          valuation_id
          source
          comparable_item_title
          comparable_item_description
          sale_price
          sale_date
          similarity_score
          condition_adjustment
          market_adjustment
          source_url
          source_reference
          images
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { valuationId });
    return data.marketComparisons;
  }

  // AI Valuation methods
  async analyzeImageWithAI(request: AIValuationRequest): Promise<AIValuationResponse> {
    // This would typically upload the image first, then analyze
    const uploadQuery = `
      mutation UploadImage($image: Upload!) {
        uploadImage(image: $image) {
          url
          id
        }
      }
    `;

    const analyzeQuery = `
      mutation AnalyzeImage($input: AIAnalysisInput!) {
        analyzeImage(input: $input) {
          estimated_value
          confidence_score
          category
          condition
          description
          comparisons {
            title
            price
            source
            similarity
          }
          reasoning
        }
      }
    `;

    // For now, return mock data - implement actual image upload and analysis
    return this.mockAIAnalysis(request);
  }

  private async mockAIAnalysis(request: AIValuationRequest): Promise<AIValuationResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      estimated_value: Math.floor(Math.random() * 10000) + 500,
      confidence_score: 0.75 + Math.random() * 0.2,
      category: 'Furniture',
      condition: 'Good',
      description: 'Vintage furniture piece with classic design',
      comparisons: [
        {
          title: 'Similar vintage chair on eBay',
          price: 450,
          source: 'eBay',
          similarity: 0.85,
        },
        {
          title: 'Antique furniture auction result',
          price: 650,
          source: 'Auction House',
          similarity: 0.72,
        },
      ],
      reasoning: 'Based on visual analysis, this appears to be a vintage furniture piece. The condition looks good with minor wear consistent with age. Market comparisons show similar items selling in the $400-650 range.',
    };
  }

  // Price Alert methods
  async getPriceAlerts(itemId?: string): Promise<PriceAlert[]> {
    const query = `
      query GetPriceAlerts($itemId: ID) {
        priceAlerts(itemId: $itemId) {
          id
          item_id
          alert_type
          threshold_value
          percentage_change
          is_active
          last_triggered
          notification_method
          created_at
          updated_at
          item {
            id
            name
          }
        }
      }
    `;

    const data = await this.makeRequest(query, { itemId });
    return data.priceAlerts;
  }

  async createPriceAlert(alertData: Partial<PriceAlert>): Promise<PriceAlert> {
    const query = `
      mutation CreatePriceAlert($input: PriceAlertInput!) {
        createPriceAlert(input: $input) {
          id
          item_id
          alert_type
          threshold_value
          is_active
          created_at
        }
      }
    `;

    const data = await this.makeRequest(query, { input: alertData });
    return data.createPriceAlert;
  }

  // Room methods
  async getRooms(): Promise<Room[]> {
    const query = `
      query GetRooms {
        rooms {
          id
          name
          floor
          square_footage
          description
          created_at
          updated_at
          item_count
          total_value
        }
      }
    `;

    const data = await this.makeRequest(query);
    return data.rooms;
  }

  // Image upload
  async uploadImage(imageUri: string, itemId?: string): Promise<{ id: string; url: string }> {
    // This would implement actual image upload
    // For now, return mock response
    return {
      id: Date.now().toString(),
      url: imageUri, // In real app, this would be the uploaded URL
    };
  }

  // Barcode lookup
  async lookupItemByBarcode(barcode: string): Promise<Item | null> {
    const query = `
      query LookupItemByBarcode($barcode: String!) {
        itemByBarcode(barcode: $barcode) {
          id
          name
          description
          category
          condition
          images {
            url
            is_primary
          }
        }
      }
    `;

    try {
      const data = await this.makeRequest(query, { barcode });
      return data.itemByBarcode;
    } catch (error) {
      // Item not found
      return null;
    }
  }
}

// Export singleton instance
export const apiService = new APIService();